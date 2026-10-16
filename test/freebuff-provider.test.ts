import assert from "node:assert/strict";
import test from "node:test";
import type {
  ProviderEvent,
  ProviderLaunch,
} from "@getpaseo/plugin/server/provider";
import {
  createFreebuffProvider,
  type TerminalFactoryOptions,
  type TerminalTransport,
} from "../server/freebuff-provider";
import type { TerminalSnapshot } from "../server/freebuff-terminal-process";

const launch = { command: "freebuff", args: [], env: {} };

class FakeTerminal implements TerminalTransport {
  prompts: string[] = [];
  closed = false;

  constructor(private readonly options: TerminalFactoryOptions) {}

  async start(): ReturnType<TerminalTransport["start"]> {
    this.options.onScreen({
      text: "Freebuff\nAd\nEnter a coding task or / for commands",
      state: { kind: "ready" as const },
    });
    return { kind: "ready" as const };
  }

  async sendPrompt(text: string) {
    this.prompts.push(text);
  }

  async interrupt() {}

  async close() {
    this.closed = true;
  }

  screen(snapshot: TerminalSnapshot) {
    this.options.onScreen(snapshot);
  }
}

function harness(startup: "ready" | "login" = "ready") {
  let terminal: FakeTerminal | undefined;
  const provider = createFreebuffProvider(
    async () => "0.2.27",
    (options) => {
      terminal = new FakeTerminal(options);
      if (startup === "login") {
        terminal.start = async () => ({
          kind: "login",
          url: "https://freebuff.com/login?auth_code=test",
        });
      }
      return terminal;
    },
  );
  return { provider, terminal: () => terminal! };
}

async function connectionEvents() {
  const { provider, terminal } = harness();
  const connection = await provider.connect({
    versions: [1],
    capabilities: ["prompt.message"],
    launch,
  });
  const events: ProviderEvent[] = [];
  connection.onEvent((event) => events.push(event));
  return { connection, events, terminal };
}

const sessionConfig = {
  cwd: "/tmp",
  env: {},
  mcpServers: {},
  settings: {},
  persist: false,
};

test("reports installed CLI when version probe succeeds", async () => {
  const { provider } = harness();
  assert.deepEqual(await provider.status?.({ launch }), {
    available: true,
    diagnostic: "Detected Freebuff 0.2.27 with tmux PTY support.",
  });
});

test("reports missing CLI when version probe fails", async () => {
  const provider = createFreebuffProvider(async () => {
    throw new Error("ENOENT");
  });
  assert.deepEqual(await provider.status?.({ launch }), {
    available: false,
    diagnostic: "Could not run Freebuff CLI: ENOENT",
  });
});

test("opens a ready Freebuff session", async () => {
  const { connection, events } = await connectionEvents();
  await connection.send({
    type: "session.open",
    requestId: "open-1",
    sessionId: "session-1",
    config: sessionConfig,
    history: "skip",
  });

  assert.deepEqual(
    events.map((event) => event.type),
    ["session.opened", "session.config", "session.ready"],
  );
  assert.deepEqual(connection.capabilities, ["prompt.message"]);
});

test("fails session open with Freebuff login URL", async () => {
  const { provider } = harness("login");
  const connection = await provider.connect({
    versions: [1],
    capabilities: ["prompt.message"],
    launch,
  });
  const events: ProviderEvent[] = [];
  connection.onEvent((event) => events.push(event));

  await connection.send({
    type: "session.open",
    requestId: "open-1",
    sessionId: "session-1",
    config: sessionConfig,
    history: "skip",
  });

  assert.equal(events[0]?.type, "request.failed");
  assert.match(JSON.stringify(events[0]), /freebuff\.com\/login/);
});

test("completes one prompt after running screen returns to ready", async () => {
  const { connection, events, terminal } = await connectionEvents();
  await connection.send({
    type: "session.open",
    requestId: "open-1",
    sessionId: "session-1",
    config: sessionConfig,
    history: "skip",
  });
  await connection.send({
    type: "session.prompt",
    sessionId: "session-1",
    prompt: {
      clientMessageId: "message-1",
      delivery: "auto",
      input: { type: "message", content: [{ type: "text", text: "hello" }] },
    },
  });
  terminal().screen({
    text: "Esc to interrupt\nWorking",
    state: { kind: "running" },
  });
  terminal().screen({
    text: "Done\nEnter a coding task or / for commands",
    state: { kind: "ready" },
  });

  assert.deepEqual(terminal().prompts, ["hello"]);
  const turns = events.filter((event) => event.type === "session.turn");
  assert.deepEqual(
    turns.map((event) => event.state),
    ["started", "completed"],
  );
  assert.equal(
    events.filter((event) => event.type === "session.prompt_result").length,
    1,
  );
});
