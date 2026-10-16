import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderEvent } from "@getpaseo/plugin/server/provider";
import { createFreebuffProvider } from "../server/freebuff-provider";

const launch = { command: "freebuff", args: [], env: {} };

test("reports installed CLI when version probe succeeds", async () => {
  const provider = createFreebuffProvider(async () => "0.2.27");
  const result = await provider.status?.({ launch });
  assert.deepEqual(result, {
    available: true,
    diagnostic:
      "Detected 0.2.27. Freebuff exposes an interactive TUI only; Paseo sessions are not supported yet.",
  });
});

test("reports missing CLI when version probe fails", async () => {
  const provider = createFreebuffProvider(async () => {
    throw new Error("ENOENT");
  });
  const result = await provider.status?.({ launch });
  assert.deepEqual(result, {
    available: false,
    diagnostic: "Could not run Freebuff CLI: ENOENT",
  });
});

test("returns empty catalog and rejects session opening", async () => {
  const provider = createFreebuffProvider(async () => "0.2.27");
  const connection = await provider.connect({
    versions: [1],
    capabilities: ["prompt.message"],
    launch,
  });
  const events: ProviderEvent[] = [];
  connection.onEvent((event) => events.push(event));

  await connection.send({ type: "catalog", requestId: "catalog-1" });
  await connection.send({
    type: "session.open",
    requestId: "open-1",
    sessionId: "session-1",
    config: {
      cwd: "/tmp",
      env: {},
      mcpServers: {},
      settings: {},
      persist: false,
    },
    history: "skip",
  });

  assert.equal(connection.capabilities.length, 0);
  assert.equal(events[0]?.type, "catalog");
  assert.deepEqual(events[1], {
    type: "request.failed",
    requestId: "open-1",
    error: {
      code: "unsupported_transport",
      message: "Freebuff integration is not available yet.",
      diagnostic:
        "The installed Freebuff CLI requires an interactive TTY and does not expose ACP, headless output, or a documented SDK for free-account authentication.",
    },
  });
});
