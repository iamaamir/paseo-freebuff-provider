import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FreebuffTerminalProcess } from "../server/freebuff-terminal-process";

const fixture = fileURLToPath(
  new URL("./fixtures/fake-freebuff.mjs", import.meta.url),
);

test(
  "drives Freebuff through a macOS pseudo-terminal",
  { skip: process.platform !== "darwin" },
  async () => {
    const screens: string[] = [];
    const terminal = new FreebuffTerminalProcess({
      launch: {
        command: process.execPath,
        args: [fixture],
        env: process.env as Record<string, string>,
      },
      cwd: process.cwd(),
      onScreen: (screen) => screens.push(screen.text),
    });

    try {
      const startup = await terminal.start();
      assert.deepEqual(startup, { kind: "ready" });

      await terminal.sendPrompt("create the file");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("turn did not finish")),
          2000,
        );
        const check = () => {
          if (screens.some((screen) => screen.includes("FREEBUFF_PASEO_OK"))) {
            clearTimeout(timeout);
            resolve();
            return;
          }
          setTimeout(check, 10);
        };
        check();
      });

      assert.ok(screens.some((screen) => screen.includes("Esc to interrupt")));
    } finally {
      await terminal.close();
    }
  },
);
