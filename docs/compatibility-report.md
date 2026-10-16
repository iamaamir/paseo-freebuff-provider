# Freebuff compatibility report

Checked 2026-10-16 against Freebuff CLI 0.2.27 installed on macOS and current public Freebuff and Paseo documentation.

## Confirmed

- `freebuff --version` works.
- CLI exposes an interactive terminal UI.
- CLI help exposes `login`, `--continue`, `--cwd`, and `--trust-agents`.
- Freebuff account access is intended to use its own device login and account controls.
- Freebuff documentation describes ads, model access tiers, usage limits, and account-specific availability.
- Paseo direct providers can register a provider, probe a command, negotiate capabilities, and publish typed events.

## Missing

- No ACP command or ACP documentation found.
- No `--print`, `--headless`, `--json`, or structured event mode in installed CLI help.
- No documented Freebuff SDK contract for using a device OAuth token in an automated run.
- No verified session restoration or machine-readable tool/approval event stream.

## Restrictions

A Freebuff device OAuth token must not be passed as a Codebuff API key. Doing so could bypass or break token class, fingerprint, advertisement, eligibility, or usage enforcement. PTY automation is not implemented because it would require driving an interactive UI without a verified event boundary and could mishandle required approvals or ads.

## Smallest viable implementation

Current release registers provider ID `freebuff`, probes the installed CLI, and reports an explicit unsupported-transport diagnostic. It advertises no session capabilities and refuses automated sessions. This is intentionally not marketed as Freebuff automation.

Next action: request or validate an official Freebuff non-interactive interface. Only then implement session events, permissions, cancellation, persistence, and real-account tests.

Sources:

- https://paseo.sh/docs/plugins/providers
- https://paseo.sh/docs/plugins/reference
- https://github.com/CodebuffAI/freebuff
- https://github.com/CodebuffAI/freebuff/issues/947
- https://github.com/CodebuffAI/freebuff/pull/1477
