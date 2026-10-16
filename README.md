# Paseo Freebuff provider

Independent Paseo provider plugin for Freebuff.

## Current status

Foundation and compatibility boundary only. Current Freebuff CLI is an interactive TUI. Verified integration research found no ACP transport, headless/JSON event mode, or documented SDK path for Freebuff device OAuth credentials. Provider registration detects the CLI but refuses to start an automated session instead of bypassing Freebuff controls.

## Development

```bash
npm install
npm run typecheck
npm run format:check
```

Do not use a Freebuff device token as a Codebuff API key. Session support requires an official Freebuff interface that preserves login, advertisements, approvals, and usage limits.
