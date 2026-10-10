# Spatial prototype V2 scope

Implemented:
- Desktop top-down movement, mouse aim/strike, dash, stamina, terrain collision, attack range and line of sight, camera and minimap.
- Human and Familiar represented separately; physical strikes and movement while Familiar thinks or channels.
- Three opponents: rushdown Iron Monk, ranged Vesper, and controller Rook; three difficulty levels and obstacle navigation.
- Seven legal spells, including heal, decoy and slow field; three balance profiles.
- Hardcoded commands without inference, offline keyword reasoning, bounded server-side OpenAI action inference for Arena Duel.
- Channel d6 saves, guard, one-hit ward, regular/perfect parry, counter, feint bait and focus.
- Nonblocking dice visualization and secret push/redirect/break clash duel.
- Synthetic multi-stage evidence puzzle, isolated per-team clues, proof gating, physical contested capture, CTF respawn and capture-only win condition.
- Interruptible offline reserve swap; generation cancellation and late reply rejection.
- Start menu, connection setup, bot selection, help, result and rematch screens.
- Encrypted authenticated server credential vault, disconnect/expiry/pacing; complete offline file and source package.

Planned:
- Registered ChatGPT account inference, local companions/sidecars, and generic provider adapters.
- API/LLM objective planning, queued Noetic tools, deeper puzzles, and manual reasoning alternatives.
- Production-isolated CTF infrastructure. The current objective is symbolic deduction and performs no real exploitation.
- Authoritative networking, multiplayer teams, matchmaking, ranking, spectating and persistence.
- Multiple primary/reserve slots and model capability preflight beyond API model listing.
- Production anti-cheat, server-held proofs and reconnect recovery.
- Additional arenas, full manhwa character assets, animation sprites, audio/music and cinematic polish.

Validation limits: deterministic simulation and browser-free UI smoke checks passed. Browser visual QA and live paid inference remain unverified.
