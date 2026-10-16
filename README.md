# Paseo Freebuff Terminal

Launches the installed Freebuff coding agent in a Paseo terminal.

Commands:

```bash
npm install
npm run typecheck
paseo plugin install "$PWD"
```

Usage:

```text
/freebuff-terminal
/freebuff-terminal tell me a joke
```

The plugin waits for Freebuff’s ready prompt before submitting an initial prompt, then hands control to Freebuff's own TUI. It does not expose an agent provider or structured timeline events.
