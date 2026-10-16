# Paseo Freebuff terminal

This plugin runs Freebuff as a real terminal inside Paseo.

## Requirements

- Freebuff installed on the daemon host
- Freebuff logged in
- Paseo 0.11.4 or newer

## Install

```bash
npm install
npm run typecheck
paseo plugin install "$PWD"
```

## Usage

```text
/freebuff-terminal
/freebuff-terminal tell me a joke
```

For the second command, the plugin launches Freebuff, waits for its ready screen, submits the prompt, and then leaves the terminal in your control.

## Limits

- The plugin uses Paseo terminals only.
- It does not expose a provider.
- It does not parse Freebuff output.
- Model selection and login remain inside Freebuff.
