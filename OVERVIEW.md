Freebuff provider for Paseo. It detects an installed Freebuff CLI and registers Freebuff as a provider, while reporting when the current CLI cannot be driven by Paseo.

The currently verified Freebuff CLI exposes an interactive TUI. It does not expose ACP, headless output, structured events, or a documented SDK that accepts the Freebuff device OAuth credential. This release therefore does not start sessions or claim Freebuff automation support. It does not read, convert, or transmit Freebuff credentials.

Freebuff must be installed separately and remain available on the daemon PATH. The provider reports the detected CLI version and an actionable unsupported-transport diagnostic. A future release can enable sessions only after Freebuff publishes a supported non-interactive interface that preserves authentication, ads, approvals, and usage limits.
