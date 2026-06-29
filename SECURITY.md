# Security

This project is designed to keep provider secrets local.

- Real API keys belong only in `.env` or `.ai-settings.json`.
- Both files are ignored by git.
- Browser code calls the local `serve.js` proxy instead of provider APIs directly.
- If a key is ever committed, shared in chat, or posted publicly, revoke it and create a new one.

Before publishing, scan for common key prefixes:

```bash
rg --hidden "csk-|sk-|gho_" .
```
