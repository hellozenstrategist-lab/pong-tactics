# Pong Tactics

A newspaper-themed Pong tactics game with deliberately extravagant adaptive AI control.

## Run Locally

```bash
node serve.js 8123
```

Open `http://localhost:8123/`.

Do not open `index.html` directly if you want adaptive AI. The game uses `serve.js` as a local proxy so API keys are never exposed to the browser.

## Adaptive AI

Open Settings in the main menu or press `Esc` in game.

- Player minion paddles use the player/Gemma desk.
- Enemy paddles and enemy goalie use the rival AI desk.
- Player goalie stays human-controlled unless auto-goalie is enabled.
- Each paddle can make its own AI request during combat. This is intentionally token-inefficient.

Settings are saved locally in `.ai-settings.json`, which is ignored by git.

## Environment

Copy `.env.example` to `.env` if you prefer environment variables instead of the in-game Settings panel.

Never commit real API keys.
