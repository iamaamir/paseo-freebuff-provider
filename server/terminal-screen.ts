export type FreebuffScreenState =
  | { kind: "starting" }
  | { kind: "ready" }
  | { kind: "running" }
  | { kind: "login"; url: string };

const READY_TEXT = "Enter a coding task or / for commands";
const RUNNING_TEXTS = ["Esc to interrupt", "thinking...", "Thinking"];
const LOGIN_URL = /https:\/\/freebuff\.com\/login\?[^\s]+/;
const ANSI_SEQUENCE = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export class TerminalScreen {
  private content = "";

  async write(data: string | Uint8Array): Promise<void> {
    const value =
      typeof data === "string" ? data : new TextDecoder().decode(data);
    const clearAt = value.lastIndexOf("\u001b[2J");
    this.content = clearAt >= 0 ? value.slice(clearAt) : this.content + value;
    this.content = this.content.replace(ANSI_SEQUENCE, "");
  }

  replace(text: string): void {
    this.content = text.replace(ANSI_SEQUENCE, "");
  }

  text(): string {
    return this.content.trim();
  }

  state(): FreebuffScreenState {
    const text = this.text();
    const loginUrl = text.match(LOGIN_URL)?.[0];
    if (loginUrl || text.includes("Waiting for login")) {
      return { kind: "login", url: loginUrl ?? "https://freebuff.com/login" };
    }
    if (text.includes(READY_TEXT)) return { kind: "ready" };
    if (RUNNING_TEXTS.some((entry) => text.includes(entry)))
      return { kind: "running" };
    return { kind: "starting" };
  }
}
