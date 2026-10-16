# Freebuff compatibility

Confirmed on Freebuff 0.2.29 and Paseo plugin SDK 0.11.4:

- Freebuff is an interactive terminal TUI only.
- Authentication is performed by Freebuff itself, including login URLs and Freebuff account eligibility.
- Freebuff controls advertisements, model selection, approvals, usage limits, and restrictions.
- Paseo does not receive a structured event stream from Freebuff.
- The provider uses tmux to host the real Freebuff TUI and reports terminal snapshots to Paseo.

Missing or not supported in this release:

- Native headless, ACP, JSON, or stream-json execution
- Session restoration into a new Freebuff process
- Programmatic tool-call event parsing
- Windows and Linux verification
- Codebuff SDK/API-key transport
