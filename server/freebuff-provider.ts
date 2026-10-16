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

const providerId = "freebuff";
const supportedCapabilities = [] as const;

function diagnostic(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type VersionProbe = (launch: ProviderLaunch) => Promise<string>;

const probeVersion: VersionProbe = async (launch) => {
  const result = await execCommand(
    launch.command,
    [...launch.args, "--version"],
    {
      env: launch.env,
      timeout: 5000,
    },
  );
  return result.stdout.trim() || result.stderr.trim();
};

function createStatus(probe: VersionProbe) {
  return async (request: {
    launch?: ProviderLaunch;
  }): Promise<ProviderStatus> => {
    const launch = request.launch;
    if (!launch) {
      return {
        available: false,
        diagnostic:
          "Freebuff CLI is not configured. Install freebuff and make it available on PATH.",
      };
    }

    try {
      const version = await probe(launch);
      return {
        available: true,
        diagnostic: version
          ? `Detected ${version}. Freebuff exposes an interactive TUI only; Paseo sessions are not supported yet.`
          : "Freebuff CLI detected; Paseo sessions are not supported yet.",
      };
    } catch (error) {
      return {
        available: false,
        diagnostic: `Could not run Freebuff CLI: ${diagnostic(error)}`,
      };
    }
  };
}

function unsupportedConnection(request: {
  capabilities: readonly string[];
}): ProviderConnection {
  const capabilities = negotiateProviderCapabilities(
    request.capabilities,
    supportedCapabilities,
  );
  const listeners = new Set<(event: ProviderEvent) => void>();
  let closed = false;
  const emit = (event: ProviderEvent) => {
    if (!closed) for (const listener of listeners) listener(event);
  };

  return {
    version: 1,
    capabilities,
    async send(input: ProviderInput) {
      if (input.type === "catalog") {
        emit({
          type: "catalog",
          requestId: input.requestId,
          catalog: { models: [], modes: [], thinkingOptions: [] },
        });
        return;
      }
      if (input.type === "session.open") {
        emit({
          type: "request.failed",
          requestId: input.requestId,
          error: {
            code: "unsupported_transport",
            message: "Freebuff integration is not available yet.",
            diagnostic:
              "The installed Freebuff CLI requires an interactive TTY and does not expose ACP, headless output, or a documented SDK for free-account authentication.",
          },
        });
        return;
      }
      emit({
        type: "request.failed",
        requestId: "requestId" in input ? input.requestId : "freebuff",
        error: {
          code: "unsupported_transport",
          message: "Freebuff transport is unavailable.",
          diagnostic:
            "Use Freebuff directly until an official non-interactive transport exists.",
        },
      });
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async close() {
      closed = true;
      listeners.clear();
    },
  };
}

export function createFreebuffProvider(
  probe: VersionProbe = probeVersion,
): ProviderRegistration {
  return {
    id: providerId,
    label: "Freebuff",
    description:
      "Freebuff coding agent provider. Requires an official non-interactive transport.",
    command: ["freebuff"],
    status: createStatus(probe),
    async connect(request) {
      return unsupportedConnection(request);
    },
  };
}
