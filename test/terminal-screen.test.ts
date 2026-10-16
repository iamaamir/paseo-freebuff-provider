import assert from "node:assert/strict";
import test from "node:test";
import { TerminalScreen } from "../server/terminal-screen";

test("recognizes ready Freebuff landing screen", async () => {
  const screen = new TerminalScreen();
  await screen.write(
    "Freebuff\r\nopenllm.sh  Ad\r\nEnter a coding task or / for commands",
  );

  assert.equal(screen.state().kind, "ready");
  assert.match(screen.text(), /openllm\.sh  Ad/);
});

test("extracts login URL without exposing terminal control sequences", async () => {
  const screen = new TerminalScreen();
  await screen.write(
    "\u001b[2JWaiting for login...\r\nhttps://freebuff.com/login?auth_code=test-code",
  );

  assert.deepEqual(screen.state(), {
    kind: "login",
    url: "https://freebuff.com/login?auth_code=test-code",
  });
  assert.doesNotMatch(screen.text(), /\u001b/);
});

test("tracks active turn and return to idle", async () => {
  const screen = new TerminalScreen();
  await screen.write("Esc to interrupt");
  assert.equal(screen.state().kind, "running");

  await screen.write("\u001b[2JDone\r\nEnter a coding task or / for commands");
  assert.equal(screen.state().kind, "ready");
});
