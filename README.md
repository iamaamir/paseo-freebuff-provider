This plugin runs the installed Freebuff coding agent in a Paseo terminal.

## Requirements

- Freebuff installed on the daemon host
- Freebuff logged in
- Paseo 0.11.4 or newer

## Install

```bash
paseo plugin install npm:@iamaamir/paseo-freebuff
# For a direct GitHub source:
paseo plugin add git:iamaamir/paseo-freebuff-provider
```

## Use

Open a workspace and run:

```text
/freebuff-terminal
/freebuff-terminal inspect this repository and summarize its architecture
```

## Notes

- Model selection, login, and usage limits remain inside Freebuff.
- This plugin does not expose a provider, model list, or structured agent events.

## Future plans

- Add a separate Codebuff SDK agent provider for paid API-key accounts. Do not present it as Freebuff free-account support.
- Add ACP support when Freebuff exposes a documented, supported, non-interactive transport.
- Keep the terminal launcher as the stable free-user path.
