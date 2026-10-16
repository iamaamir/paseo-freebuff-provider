## Plan: deliver verified Freebuff provider incrementally

**Context:** Current Freebuff 0.2.27 exposes only an interactive TUI. Work must preserve Freebuff authentication, ads, approvals, and limits, and must not claim unsupported automation.

**Steps:**

1. [ ] Foundation PR — provider registration, CLI detection, package metadata, CI, compatibility report — verify typecheck, format, package dry run, local Paseo load.
2. [ ] Transport feasibility PR — isolated PTY experiment against real CLI and upstream source evidence — verify launch, readiness, prompt entry, completion signal, interrupt, exit, and ads/approval visibility.
3. [ ] Transport implementation PR — transport interface plus deterministic fake and selected real transport only if feasibility passes — verify unit and integration tests.
4. [ ] Lifecycle PR — prompt/result invariants, streaming, cancellation, crashes, concurrency, cleanup — verify protocol-contract tests.
5. [ ] Authentication/capabilities PR — login diagnostics, limits, models, accurate capability negotiation — verify real authenticated session without reading or translating tokens.
6. [ ] Persistence/release PRs — restoration only if proven, npm artifact checks, clean install, real conversation, follow-up, removal — verify release gates.

**Out of scope:** bypassing Freebuff controls, treating device OAuth as Codebuff API key, claiming unsupported platforms or protocols.

**Risks:** TUI output may not provide stable structured turn boundaries; PTY automation may be unsuitable for provider timelines; upstream interface may remain blocked. If feasibility fails, plugin remains an honest detector and no fake session support ships.
