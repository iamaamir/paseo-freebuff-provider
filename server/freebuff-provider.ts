import { randomUUID } from "node:crypto";
import { execCommand } from "@getpaseo/plugin/server";
import {
  negotiateProviderCapabilities,
  type ProviderConnection,
  type ProviderEvent,
  type ProviderInput,
  type ProviderLaunch,
  type ProviderRegistration,
  type ProviderStatus,
} from "@getpaseo/plugin/server/provider";
import {
  FreebuffTerminalProcess,
  type TerminalSnapshot,
} from "./freebuff-terminal-process";

const supportedCapabilities = ["prompt.message"] as const;

type VersionProbe = (launch: ProviderLaunch) => Promise<string>;

export type TerminalFactoryOptions = {
  launch: ProviderLaunch;
  cwd: string;
  onScreen(snapshot: TerminalSnapshot): void;
  onExit?(code: number | null, signal: NodeJS.Signals | null): void;
};

export interface TerminalTransport {
  start(): Promise<{ kind: "ready" } | { kind: "login"; url: string }>;
  sendPrompt(text: string): Promise<void>;
  interrupt(): Promise<void>;
  close(): Promise<void>;
}

type TerminalFactory = (options: TerminalFactoryOptions) => TerminalTransport;

type ActiveTurn = {
  turnId: string;
  assistantId: string;
  sawRunning: boolean;
  lastScreen: string;
};

type Session = {
  id: string;
  cwd: string;
  terminal: TerminalTransport;
  active?: ActiveTurn;
  closed: boolean;
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const probeVersion: VersionProbe = async (launch) => {
  const [{ stdout, stderr }] = await Promise.all([
    execCommand(launch.command, [...launch.args, "--version"], {
      env: launch.env,
      timeout: 5000,
    }),
    execCommand("tmux", ["-V"], { timeout: 5000 }),
  ]);
  return stdout.trim() || stderr.trim();
};

function createStatus(probe: VersionProbe) {
  return async (request: {
    launch?: ProviderLaunch;
  }): Promise<ProviderStatus> => {
    if (process.platform !== "darwin") {
      return {
        available: false,
        diagnostic: "Freebuff provider currently supports macOS only.",
      };
    }
    if (!request.launch) {
      return {
        available: false,
        diagnostic:
          "Install Freebuff and make it available on the daemon PATH.",
      };
    }
    try {
      const version = await probe(request.launch);
      return {
        available: true,
        diagnostic: `Detected Freebuff ${version || "CLI"} with tmux PTY support.`,
      };
    } catch (error) {
      return {
        available: false,
        diagnostic: `Could not run Freebuff CLI: ${errorText(error)}`,
      };
    }
  };
}

function promptText(
  input: Extract<ProviderInput, { type: "session.prompt" }>,
): string | null {
  if (input.prompt.input.type !== "message") return null;
  const text = input.prompt.input.content
    .filter((content) => content.type === "text")
    .map((content) => content.text)
    .join("\n\n")
    .trim();
  return text || null;
}

export function createFreebuffProvider(
  probe: VersionProbe = probeVersion,
  createTerminal: TerminalFactory = (options) =>
    new FreebuffTerminalProcess(options),
): ProviderRegistration {
  return {
    id: "freebuff",
    label: "Freebuff",
    description:
      "Run the Freebuff coding agent through its interactive terminal.",
    icon: "icon.svg",
    command: ["freebuff"],
    status: createStatus(probe),
    async connect(request) {
      const capabilities = negotiateProviderCapabilities(
        request.capabilities,
        supportedCapabilities,
      );
      const launch = request.launch ?? {
        command: "freebuff",
        args: [],
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
      };
      const listeners = new Set<(event: ProviderEvent) => void>();
      const sessions = new Map<string, Session>();
      let connectionClosed = false;
      const emit = (event: ProviderEvent) => {
        if (!connectionClosed)
          for (const listener of listeners) listener(event);
      };

      const finishTurn = (
        session: Session,
        state: "completed" | "failed" | "canceled",
        message?: string,
      ) => {
        const active = session.active;
        if (!active) return;
        session.active = undefined;
        emit({
          type: "session.turn",
          sessionId: session.id,
          turnId: active.turnId,
          state,
          error: message ? { message } : undefined,
        });
      };

      const handleScreen = (sessionId: string, snapshot: TerminalSnapshot) => {
        const session = sessions.get(sessionId);
        const active = session?.active;
        if (!session || !active) return;
        if (snapshot.state.kind === "running") active.sawRunning = true;
        if (snapshot.text !== active.lastScreen) {
          active.lastScreen = snapshot.text;
          emit({
            type: "timeline.item",
            sessionId,
            item: {
              type: "assistant_message",
              id: active.assistantId,
              text: snapshot.text,
            },
          });
        }
        if (active.sawRunning && snapshot.state.kind === "ready") {
          finishTurn(session, "completed");
        }
      };

      const openSession = async (
        input: Extract<ProviderInput, { type: "session.open" }>,
      ) => {
        if (sessions.has(input.sessionId)) {
          emit({
            type: "request.failed",
            requestId: input.requestId,
            error: { message: "Freebuff session already exists." },
          });
          return;
        }
        let session: Session;
        const terminal = createTerminal({
          launch,
          cwd: input.config.cwd,
          onScreen: (snapshot) => handleScreen(input.sessionId, snapshot),
          onExit: () => {
            const current = sessions.get(input.sessionId);
            if (!current || current.closed) return;
            finishTurn(current, "failed", "Freebuff terminal exited.");
            emit({
              type: "session.runtime_failed",
              sessionId: input.sessionId,
              error: { message: "Freebuff terminal exited unexpectedly." },
            });
          },
        });
        session = {
          id: input.sessionId,
          cwd: input.config.cwd,
          terminal,
          closed: false,
        };
        sessions.set(input.sessionId, session);
        try {
          const startup = await terminal.start();
          if (startup.kind === "login") {
            sessions.delete(input.sessionId);
            session.closed = true;
            await terminal.close();
            emit({
              type: "request.failed",
              requestId: input.requestId,
              error: {
                code: "login_required",
                message: "Freebuff login required.",
                diagnostic: `Open ${startup.url}, finish login, then create the Paseo agent again.`,
              },
            });
            return;
          }
          emit({
            type: "session.opened",
            requestId: input.requestId,
            sessionId: input.sessionId,
            capabilities,
            restoration: "core",
            cwd: input.config.cwd,
          });
          emit({
            type: "session.config",
            sessionId: input.sessionId,
            config: {
              models: [],
              modes: [],
              thinkingOptions: [],
              settings: [],
            },
          });
          emit({
            type: "session.ready",
            requestId: input.requestId,
            sessionId: input.sessionId,
          });
        } catch (error) {
          console.error("Freebuff startup failed:", errorText(error));
          sessions.delete(input.sessionId);
          session.closed = true;
          await terminal.close();
          emit({
            type: "request.failed",
            requestId: input.requestId,
            error: {
              code: "startup_failed",
              message: "Freebuff failed to start.",
              diagnostic: errorText(error),
            },
          });
        }
      };

      const sendPrompt = async (
        input: Extract<ProviderInput, { type: "session.prompt" }>,
      ) => {
        const session = sessions.get(input.sessionId);
        const text = promptText(input);
        if (!session || session.closed || !text || session.active) {
          emit({
            type: "session.prompt_result",
            sessionId: input.sessionId,
            clientMessageId: input.prompt.clientMessageId,
            result: {
              type: "failed",
              error: {
                message: !session
                  ? "Freebuff session is not open."
                  : session.active
                    ? "Freebuff is already running a turn."
                    : "Freebuff accepts text prompts only.",
              },
            },
          });
          return;
        }
        const turnId = randomUUID();
        session.active = {
          turnId,
          assistantId: `assistant:${turnId}`,
          sawRunning: false,
          lastScreen: "",
        };
        emit({
          type: "timeline.item",
          sessionId: session.id,
          item: {
            type: "user_message",
            id: `user:${turnId}`,
            text,
            clientMessageId: input.prompt.clientMessageId,
          },
        });
        emit({
          type: "session.prompt_result",
          sessionId: session.id,
          clientMessageId: input.prompt.clientMessageId,
          result: { type: "turn", turnId },
        });
        emit({
          type: "session.turn",
          sessionId: session.id,
          turnId,
          state: "started",
        });
        try {
          await session.terminal.sendPrompt(text);
        } catch (error) {
          finishTurn(session, "failed", errorText(error));
        }
      };

      const connection: ProviderConnection = {
        version: 1,
        capabilities,
        async send(input) {
          if (input.type === "catalog") {
            emit({
              type: "catalog",
              requestId: input.requestId,
              catalog: { models: [], modes: [], thinkingOptions: [] },
            });
            return;
          }
          if (input.type === "session.open") return openSession(input);
          if (input.type === "session.prompt") return sendPrompt(input);
          if (input.type === "session.interrupt") {
            const session = sessions.get(input.sessionId);
            if (session) {
              await session.terminal.interrupt().catch(() => undefined);
              finishTurn(session, "canceled");
            }
            emit({ type: "request.completed", requestId: input.requestId });
            return;
          }
          if (input.type === "session.close") {
            const session = sessions.get(input.sessionId);
            if (session) {
              session.closed = true;
              finishTurn(session, "canceled");
              await session.terminal.close();
              sessions.delete(input.sessionId);
              emit({ type: "session.closed", sessionId: input.sessionId });
            }
            emit({ type: "request.completed", requestId: input.requestId });
            return;
          }
          if ("requestId" in input) {
            emit({
              type: "request.failed",
              requestId: input.requestId,
              error: {
                message: `Unsupported Freebuff operation: ${input.type}`,
              },
            });
          }
        },
        onEvent(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        async close() {
          if (connectionClosed) return;
          for (const session of sessions.values()) {
            session.closed = true;
            await session.terminal.close();
          }
          sessions.clear();
          listeners.clear();
          connectionClosed = true;
        },
      };
      return connection;
    },
  };
}
