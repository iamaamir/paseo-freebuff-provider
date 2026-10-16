This plugin opens Freebuff in a real Paseo terminal.

Use `/freebuff-terminal` in the composer. Add text after the command if you want to send an initial prompt. The plugin waits for Freebuff’s ready screen before sending the text.

Requirements:

- Freebuff installed on the daemon host
- Freebuff logged in
- Paseo 0.11.4 or newer

This plugin uses terminals, not agent providers. It does not expose models, providers, or structured events.
