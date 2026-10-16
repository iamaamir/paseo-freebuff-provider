# Paseo Freebuff provider

Runs installed Freebuff CLI inside Paseo on macOS.

Requirements:

- Paseo 0.11.4 or newer
- Freebuff CLI on daemon `PATH`
- `tmux`
- Active Freebuff account

The provider drives Freebuff's real interactive terminal. Freebuff keeps control of login, advertisements, model selection, approvals, and usage limits. Terminal output appears in Paseo as streaming assistant output.

```bash
npm install
npm test
npm run typecheck
paseo plugin install "$PWD"
```
