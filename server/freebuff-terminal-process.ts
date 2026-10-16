import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execCommand } from "@getpaseo/plugin/server";
import type { ProviderLaunch } from "@getpaseo/plugin/server/provider";
import { TerminalScreen, type FreebuffScreenState } from "./terminal-screen";

export type TerminalSnapshot = {
  text: string;
  state: FreebuffScreenState;
};

type Options = {
  launch: ProviderLaunch;
  cwd: string;
  onScreen(snapshot: TerminalSnapshot): void;
  onExit?(code: number | null, signal: NodeJS.Signals | null): void;
  startupTimeoutMs?: number;
  captureIntervalMs?: number;
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export class FreebuffTerminalProcess {
  private readonly screen = new TerminalScreen();
  private readonly sessionName = `paseo-freebuff-${process.pid}-${randomUUID()}`;
  private timer?: NodeJS.Timeout;
  private started = false;
  private closed = false;
  private exitReported = false;
  private loginPromptSent = false;

  constructor(private readonly options: Options) {}

  async start(): Promise<
    Extract<FreebuffScreenState, { kind: "ready" | "login" }>
  > {
    if (this.started) throw new Error("Freebuff terminal already started");
    if (process.platform !== "darwin") {
      throw new Error(
        "Freebuff PTY transport is currently supported on macOS only",
      );
    }
    this.started = true;

    await execCommand("tmux", ["-V"], { timeout: 5000 });
    const { launch, cwd } = this.options;
    const command = [launch.command, ...launch.args, "--cwd", cwd]
      .map(shellQuote)
      .join(" ");
    await execCommand(
      "tmux",
      [
        "new-session",
        "-d",
        "-s",
        this.sessionName,
        "-c",
        cwd,
        "-x",
        "120",
        "-y",
        "40",
        `exec ${command}`,
      ],
      { env: launch.env, timeout: 5000 },
    );

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Freebuff startup timed out"));
      }, this.options.startupTimeoutMs ?? 30_000);

      const capture = async () => {
        if (this.closed) return;
        try {
          const { stdout } = await execCommand(
            "tmux",
            ["capture-pane", "-p", "-t", this.sessionName],
            { timeout: 5000 },
          );
          this.screen.replace(stdout);
          if (!settled && stdout.includes("Press ENTER to login")) {
            if (!this.loginPromptSent) {
              this.loginPromptSent = true;
              void execCommand(
                "tmux",
                ["send-keys", "-t", this.sessionName, "Enter"],
                { timeout: 5000 },
              ).catch(() => undefined);
            }
          }
          const snapshot = {
            text: this.screen.text(),
            state: this.screen.state(),
          };
          this.options.onScreen(snapshot);
          if (
            !settled &&
            (snapshot.state.kind === "ready" || snapshot.state.kind === "login")
          ) {
            settled = true;
            clearTimeout(timeout);
            resolve(snapshot.state);
          }
          this.timer = setTimeout(
            capture,
            this.options.captureIntervalMs ?? 250,
          );
        } catch (error) {
          clearTimeout(timeout);
          if (!settled) {
            settled = true;
            reject(error);
          }
          this.reportExit();
        }
      };
      void capture();
    });
  }

  async sendPrompt(text: string): Promise<void> {
    this.requireRunning();
    const bufferName = `prompt-${randomUUID()}`;
    const file = join(tmpdir(), `${bufferName}.txt`);
    await writeFile(file, `\u001b[200~${text}\u001b[201~`, { mode: 0o600 });
    try {
      await execCommand("tmux", ["load-buffer", "-b", bufferName, file], {
        timeout: 5000,
      });
      await execCommand(
        "tmux",
        ["paste-buffer", "-d", "-b", bufferName, "-t", this.sessionName],
        { timeout: 5000 },
      );
      await execCommand(
        "tmux",
        ["send-keys", "-t", this.sessionName, "Enter"],
        { timeout: 5000 },
      );
    } finally {
      await unlink(file).catch(() => undefined);
    }
  }

  async interrupt(): Promise<void> {
    this.requireRunning();
    await execCommand("tmux", ["send-keys", "-t", this.sessionName, "C-c"], {
      timeout: 5000,
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.started) {
      await execCommand("tmux", ["kill-session", "-t", this.sessionName], {
        timeout: 5000,
      }).catch(() => undefined);
    }
  }

  private requireRunning(): void {
    if (!this.started || this.closed) {
      throw new Error("Freebuff terminal is not running");
    }
  }

  private reportExit(): void {
    if (this.exitReported || this.closed) return;
    this.exitReported = true;
    this.options.onExit?.(null, null);
  }
}
