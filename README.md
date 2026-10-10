# JAOYA — AI Familiar Death Games / Spatial Prototype V2

A playable desktop browser arena: moving human summoners, separate floating Familiars, cover, line of sight, melee, spells, d6 channel defenses, perfect parries, and tactical Resonance Clashes. Solo matches against three autonomous bot personalities work without a paid API.

## Look

Glitch-punk / anime presentation: cel-shaded chibi summoners with ink outlines, fox-spirit Familiars, neon-on-violet arena with halftone and katakana graffiti, manga speed lines, onomatopoeia impact text (ドン!, キン!), RGB-split glitch slices on hits and clashes, and CRT scanlines over a skewed, cut-corner HUD. All art is procedural Canvas 2D + CSS using system fonts, so the offline build stays self-contained. `prefers-reduced-motion` disables glitch, flashes, and screen shake.

## Play immediately

Open **JAOYA-PLAY-OFFLINE.html** (repo root) in a modern desktop browser. Regenerate it after editing `public/game/` with `python3 scripts/package-game-zip.py /tmp/jaoya.zip` and copy `JAOYA-PLAY-OFFLINE.html` out of the ZIP.

## Play the ZIP immediately

Extract the archive and open **JAOYA-PLAY-OFFLINE.html** in a modern desktop browser. That single file includes all game code and visuals; it needs no installation, server, or internet. Offline play includes both Flag Hunt and Arena Duel. API connections need the hosted server and are unavailable from a file URL.

The ZIP also includes the full maintainable project under `source/`. The offline HTML is a generated copy of the same modules, not a separate game implementation.

## Controls

| Input | Action |
|---|---|
| WASD | Move the human summoner |
| Mouse / left-click on arena | Aim / physical melee strike |
| Q / E / F | Parry / ward / guard |
| Space or Shift | Dash; cancels your Familiar's channel |
| R | Counter after a perfect parry |
| X | Cancel Familiar thinking or casting |
| 1 / 2 / 3 | Ember / rift / mend; during a clash: push / redirect / break |
| Enter | Focus Jev; Enter again submits text |
| Escape | Return from text to WASD |
| Arrows / hold right-click | Move while typing / steer toward cursor |
| Alt Q / E / F / X | Defend or cancel while typing without clearing text |
| Tab | Open or close clues, without pausing |

Hardcoded `attack`, `strike`, `defend`, `ward`, `parry`, `dodge`, `cancel`, `focus`, `feint`, `counter`, `scan`, `swap`, and clash tactics execute directly through the engine. Freeform “tear open a void rift,” “heal me,” “create a decoy,” or “slow the enemy” goes to the selected Familiar. Offline interpretation is a keyword mock, not an LLM. Bot movement and combat use local policies, not paid inference.

Physical movement and strikes continue while the Familiar reasons and charges spells. Game casting profiles add 1.3 / 3.2 / 6.5 seconds; actual API latency adds vulnerable thinking time. These profiles are game balance settings, not claims about the speed of named models.

Hits during thinking, casting, scanning, or reserve swapping automatically roll d6. An unguarded channel survives on 4–6. Guard survives on 2–6. Ward absorbs one hit. Failure deals damage and cancels the channel, including rejecting late AI responses. Parry lasts 0.5s; its first 0.2s is perfect and interrupts the attacker. The dice animation does not delay damage or pause the battle; defensive actions affect the roll before the hit lands.

## Match objectives

**Flag Hunt** is an offline synthetic clue game. Reach the purple Noetic Relay in the western lane and issue `scan` four times. Each 2.7s scan can be interrupted. The Familiar reads a cycle and glyph, correlates a registry checksum, assembles a seal, then submits a proof. Only a valid team/match proof unlocks capture. Move to the revealed candidate site and hold it for four uncontested seconds. Taking damage removes one second of progress; leaving the site decays progress. Death respawns after four seconds and keeps the proof. Kills alone cannot win. A four-minute timeout draws if no flag is bound.

This is symbolic deduction, not a real exploitation CTF. There are no vulnerable services, offensive tools, shell execution, or network discovery in the objective. Bots inspect the same evidence before learning the flag location. Enemy private proof and evidence are not shown to the player.

**Arena Duel** ends when a summoner falls. At four minutes, higher HP wins. Both offline and server-side OpenAI spell Familiars are supported here.

Opposing melee or colliding spell projectiles trigger a 1.8s Resonance Clash. Seal a tactic before the deadline: Push beats Break, Break beats Redirect, Redirect beats Push. Enemy choice is hidden until the simultaneous reveal. The two involved summoners lock in place; the clock and projectiles continue. Missing a choice loses. Ties separate the fighters without clash damage.

`swap` summons an offline Swift reserve through an interruptible five-second channel, with a 20s cooldown after completion. The original saved API credential remains until disconnected; a swap changes only the current match's provider. Menus and help do not pause a running match. Leaving the arena explicitly abandons it.

## Architecture and JAOYA.party integration

| Module | Responsibility |
|---|---|
| `public/game/rules.js` | Central balance and legal action catalog |
| `world.js` | Terrain, collision, line of sight, grid navigation |
| `objective.js` | Private synthetic evidence and team/match proof gating |
| `engine.js` | Seeded 60 Hz simulation, movement, attacks, resources, defense, interrupts, clashes, capture and verdicts; no DOM/network |
| `ai.js` | Offline interpreter, API action adapter, independent bot policy |
| `input.js` | Keyboard and mouse state, separate from text input |
| `renderer.js` | Glitch-punk Canvas 2D arena (baked static layer), anime summoners and Familiars, impact effects, glitch post-processing, fog and minimap |
| `ui.js` | Screens, console, asynchronous requests, HUD, evidence and audio |
| `server/familiar.mjs` | Authenticated same-origin OpenAI bridge and encrypted server-side credential vault |
| `app/api/familiar/*` | Thin runtime bindings |
| `db/schema.ts`, `drizzle/` | Credential storage schema and migrations |

The Vinext shell serves the static game in a full-screen iframe and preserves Sites runtime integration. Game modules have no third-party runtime art, fonts, or scripts. Rendering never consumes combat RNG. Reduced-motion settings reduce effects.

The engine and legal input boundary can be reused in JAOYA.party. Replace visitor identity with the existing identity service and provision an encrypted server vault. For multiplayer, move simulation/proof validation to authoritative room servers, accept timestamped legal inputs, and broadcast filtered snapshots. The current game is solo and client-authoritative; its local proof objects are not a production security boundary. No existing JAOYA.party service was modified.

See `docs/IMPLEMENTED-AND-PLANNED.md` for the scope and `docs/MASTER-SPEC-V2.md` for the supplied master spec.

## API connection

Setup → OpenAI API accepts a user's own Platform key and Responses-compatible model. The server checks `/v1/models` before connecting; an actual completed spell verifies inference entitlement. Inference uses the fixed `https://api.openai.com/v1/responses` endpoint and a strict action-only JSON schema. No arbitrary provider URLs, tools, code execution, or model-controlled combat values.

API keys are sent only over HTTPS to the server, encrypted at rest, never returned, never stored in browser storage, and tied to the signed-in visitor. Connections expire after 24 hours; expired records are removed when connection status is checked. Disconnect physically deletes the credential row. The browser clears the password field after submission. Keys do not belong in source or manifests.

`JAOYA_VAULT_KEY` is a 32-byte hexadecimal server secret configured through the Sites runtime environment. It is unrelated to an OpenAI key. Missing vault configuration fails closed; offline play remains ready. D1 must be bound as `DB` and migrations applied. The prototype permits one API spell per three seconds and 60 per connection, with a 12-second upstream timeout and 300 output-token cap. Platform spend limits should still be configured. Reconnecting starts a new connection allowance.

No actual API credential or paid inference was used during development. Provider calls were tested with mocked upstream responses. A live player key is required to verify a real model's latency and inference access.

## ChatGPT account connection investigation

Official documentation accessed October 10, 2026:

- https://developers.openai.com/siwc/quickstart
- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server
- https://developers.openai.com/api/docs/quickstart
- https://developers.openai.com/api/docs/guides/structured-outputs

OpenAI documents account-based identity sign-in and separate authorized ChatGPT plan usage for eligible apps. Commercial integrations are in a limited trial. Open-source clients have a documented registration/OAuth flow and an app-server path. A ChatGPT subscription is not a Platform API key. Site identity login does not by itself grant inference scopes. This prototype's account tab explains the supported routes; it does not pretend to be a registered plan-usage client or solicit ChatGPT session tokens.

To add account inference later, obtain the appropriate app registration, implement the documented PKCE, consent, code exchange and token renewal flow on the server, and feed responses through the same action whitelist. Keep identity and inference authorization separate. A Codex app-server companion is a potential desktop/open-source path, subject to its documented registration and terms.

## Development and verification

The source uses Node 22.13+ and the package manager declared in `package.json` (pnpm). Install through `node /path/to/sites/scripts/install-dependencies.mjs` in a Sites environment, or `pnpm install` in your own development environment. Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`. `pnpm dev` serves the project. Server-side API connections require a configured authenticated identity, D1 `DB`, migrations, and `JAOYA_VAULT_KEY`.

For game-only module development, serve the `public/` directory locally (`python3 -m http.server 8000 --directory public`) and open `/game/`. API routes are unavailable in that static mode. `python3 scripts/package-game-zip.py /absolute/output.zip` builds an offline HTML plus sanitized source ZIP.

29 automated tests cover spatial movement and replay, collision/dash limits, attack range and cover, movement during reasoning, d6 thresholds, wards, parry timing and counters, stale result rejection, clashes, bounded spells, evidence/proof gating, physical contested capture, respawn, timeout, reserve swap, bot paths and full objective completion, keyboard/text routing, UI lifecycle, and authenticated encrypted API handling. TypeScript and the production build are also checked.

Interactive browser visual/playthrough QA is unavailable in this authoring environment. Verification uses deterministic simulations and a DOM/canvas smoke facade, rather than a real browser session. Real paid model inference was not tested; mocked upstream calls verify the adapter contract.
