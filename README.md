# Paseo Freebuff terminal

This plugin runs the installed Freebuff coding agent in a Paseo terminal.

## Requirements

- Freebuff installed on the daemon host
- Freebuff logged in
- Paseo 0.11.4 or newer
- `tmux` is not required

## Install

```bash
npm install
npm run typecheck
paseo plugin install "$PWD"
```

## Use

Open a workspace and run:

```text
/freebuff-terminal
/freebuff-terminal inspect this repository and summarize its architecture
```

The plugin launches Freebuff, waits for its ready screen, submits any included prompt, then gives control to Freebuff.

## Notes

- Model selection, login, and usage limits remain inside Freebuff.
- This plugin does not expose a provider, model list, or structured agent events.
- Use Paseo Terminal Profiles for a permanent Freebuff terminal button.
