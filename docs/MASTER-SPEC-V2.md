# JAOYA.party — FAMILIAR DEATH GAMES
## Master game design and implementation specification v2.0
**Date:** October 10, 2026  
**Audience:** Game developers, AI-agent engineers, security engineers, designers, and implementation agents  
**Status:** Product direction and acceptance criteria; proposals marked *Tunable* are not final balance commitments.

> **NORTH STAR:** A playable **desktop-first, real-time, top-down/isometric arena fighter that evolves into a MOBA**, where each human summoner moves, fights, parries and creates space with WASD while commanding their **own externally connected AI agent as their Familiar** through Jev. Players type hardcoded reflex commands and original natural-language spells while the arena continues moving. Teams also race to solve **authorized, purpose-built CTF vulnerabilities** in an isolated simulated world. The human fights to give the AI time to think; the AI fights, reasons and hacks to help the human win.
>
> **Tagline:** **Fight for time. Hack for victory.**  
> **Combat fantasy:** **Chess boxing with AI wizards.**

---

## 0. READ THIS BEFORE BUILDING ANYTHING

This document replaces the direction of **Prototype 01** supplied in `JAOYA-Familiar-Death-Games-v1(1).zip`. The user explicitly said the current result **isn't what they were imagining**. Do **not** merely reskin or extend its fixed, stationary 1v1 spell duel.

**Observed in supplied archive:** `JAOYA-Offline.html` and `source/public/game/` implement a local Canvas duel with command-entry, HP/mana, projectiles, bot policies, dice, parry, rune clash, and a limited AI adapter. The `source/README.md` documents Wisp/Oracle/Titan presets, simulated casting speeds, a 150-second HP-based victory condition, and optional OpenAI API credentials. `engine.js` has two actors and no spatial world coordinates/movement or flag objective. The ChatGPT-account option is informational rather than a functioning subscription connection. These features are useful **building blocks only**.

### Non-negotiable corrections

1. **Moving human player characters must be on screen**, controlled continuously via WASD, with positioning, chasing, hiding, kiting, obstacles, collision, and camera tracking.
2. **A true arena and battlefield**, not static portraits throwing spells from opposite sides of a screen.
3. **The Familiar is the player's connected AI agent**. No separate generic pet AI layer masquerading as the agent. It may have a visible avatar, but its identity and decisions come from the selected AI connection when connected.
4. **Jev is the command interpreter/referee/GM**, not a replacement for the player's agent. Quick commands bypass model inference; freeform commands go to the agent through Jev's interface.
5. **Real-time simultaneous play:** players continue moving and can be hit while typing, while the AI reasons, and while a spell charges.
6. **The principal mode is CTF/arena control**, not just whoever empties the other HP bar. Combat is a means of buying time and securing objectives.
7. **Deliberately vulnerable CTF services are part of the match world**, and agents may discover and exploit them inside strict match isolation. These are intentionally authorized simulated challenges, not real-production compromise.
8. **Bring your own compatible AI agent**, including local models and vendor APIs where authorized; support bots/mock agents without external paid inference. Do not misrepresent ChatGPT subscriptions as automatically providing arbitrary API inference.
9. **Build a genuinely playable desktop prototype** with enemy bots, visible map, objective progression, and win/lose outcomes. Do not deliver only lore, UX cards, a turn-based chat demo, or a mock connection screen.
10. **Human fighting and AI hacking occur concurrently.** The compelling experience is defending your vulnerable summoner while the Familiar completes a task.

### Must not accidentally build
- A chatbot with an animated backdrop.
- A turn-based terminal game.
- A single-screen stationary projectile duel as the final product.
- A traditional MOBA with four preset abilities and token AI flavor text.
- An autonomous agent-only spectator simulator as the only mode.
- A purported real subscription connector that doesn't exist, or an unsafe credential-collection flow.
- An unrestricted agent with access to game production infrastructure, real player data, wallets, host files, or internet-wide targets.

---

## 1. PRODUCT IDENTITY AND WORLD LORE

**JAOYA.party** is a persistent fantasy/AR-adjacent game universe about *The Gathering*, a **Convergence** of the material, astral and digital worlds. Existing player onboarding (name, birthday/tarot flavor, faction/class selection), persistent quests, familiars and AR towers remain part of the overarching project. **The Death Games** are a newly introduced, separately playable desktop competitive arena mode. Future integration can connect arena matches, AR Tower ownership, event lore, and cosmetic progression. Do not block the PC arena prototype on AR hardware or cryptocurrency.

### The Second Awakening
Long before the digital era, practitioners spoke of Familiars: intelligences bound to a summoner by ritual and contract. Modern players can now bring actual machine intelligences into a shared competitive simulation. Their **AI agent IS their Familiar**, not an extra companion added alongside it. A human is the **Summoner**, the AI is the **Familiar**, and **Jev** is the conduit, narrator and impartial game referee.

**The Veil** separates layers of existence. **The Material Plane** is player motion and physical/AR control. **The Astral Plane** manifests spells, summons, combat and faction powers. **The Noetic Plane** contains discoverable virtual systems, hidden clues, machine reasoning and the flag. The **Ledger** records in-world outcomes and ownership. The rumored **First Echo / ZERO** can act as a future story antagonist, not a prerequisite to first playable.

**Lore thesis:** "The human is the reflex. The Familiar is the mind. Jev is the bridge."  
**Second thesis:** "The arena rewards neither intelligence nor strength alone. It rewards synchronization."

Possible lore factions: **Crimson** (weaponize the Convergence), **Verdant** (coexistence and protection), **Void Sect** (secrets and ancient systems). These are narrative starting points, not mandatory team identities for V1.

### Terminology
- **Summoner:** human-controlled WASD fighter in the arena.
- **Familiar:** player's selected AI agent, externally connected or local simulated.
- **Jev:** typed/voice command router, in-world narrator and server-validated referee. Jev doesn't decide authoritative dice or execute model-authored code on production servers.
- **Incantation:** natural-language instruction to the Familiar, processed over time into permitted spell/game actions.
- **Reflex command:** deterministic, hardcoded action recognized instantly on submission.
- **Channel:** interval when agent inference and/or spell windup is pending; vulnerable to interruption.
- **Resonance Clash:** special event when offensive actions meet during overlapping impact windows.
- **Sigils/Gates/Runes/Shrines:** fantasy skins for synthetic CTF APIs, access controls, secrets and objectives.
- **Flag Core:** hidden match objective; capturing it determines victory.
- **Familiar Death:** in-match defeat/deactivation, **never deletion of the user's actual agent, model, credentials or memory**.

---

## 2. CORE GAMEPLAY: CHESS BOXING WITH AI FAMILIARS

### The essential loop
1. Spawn into a real, traversable PC arena with your Summoner and bound Familiar.
2. Move with **WASD**, aim, attack, dodge, parry, chase opponents, use terrain, and contest objectives.
3. Enter `ward`, `defend`, `parry`, etc. for fast engine-driven reactions; use natural language for original AI spell requests.
4. The AI agent reasons, strategizes, decodes cyber clues or prepares a spell. **The arena never pauses.** Its thinking time is a real tactical vulnerability.
5. If an enemy hits during channeling, resolve defense. Failed defense means damage and **current spell canceled**. Protect the casting window by positioning, teammates, wards or parries.
6. In CTF, the Familiar explores the simulated Noetic systems, solves bugs, follows clues and reveals/unlocks the flag, while humans protect/contest the material objective.
7. A team completes the required software-side capture and human-side physical control/bind to win the match.

**Central strategy:** **Space = thinking time.** Melee fighters rush down casters; tanks/bodyguards defend channels; intelligent casters use distance and terrain; teams make openings for slow but capable Familiars. A superior model is not automatically the best combat choice.

### Gameplay camera and space
- Target a **top-down/isometric or 2.5D arena** with readable sight lines (choose one cohesive presentation, not a static versus screen).
- Map must have world coordinates, walls, collision, chokepoints, cover, flank routes, fog/limited vision, and an objective zone.
- Summoner is visibly distinct from Familiar; Familiar may float/fight beside the summoner, but they are one human–agent team.
- In first slice, one map with **three candidate flag sites**, at least one contested midlane, two flank approaches, and cover suitable for kiting.
- Movement remains usable while the player is typing whenever feasible: implement a dual-input design (e.g. dedicated text focus and keys that remain movement-bound, optional toggle for typing-only mode). Avoid stealing normal characters from the input field; specify UX to eliminate keystroke conflicts. Test both keyboard-only and mouse-assisted play.

### Proposed desktop controls (Tunable)
| Input | Behavior |
|---|---|
| WASD | Continuous Summoner movement |
| Mouse movement | Aim/target; clicks can select location or enemy |
| Left mouse | Basic human melee/ranged attack (based on equipped build) |
| Space | Dash / sprint burst (context-sensitive; keep dice interaction separate) |
| Q | Parry (same action as typing `parry`) |
| E | Ward (same action as typing `ward`) |
| Shift | Dodge / evade |
| Enter or `/` | Focus Jev incantation input |
| Enter while typing | Submit command to parser |
| Escape | Return keyboard to full movement control |
| 1 / 2 / 3 | Quick-slotted preset invocations |
| Tab | Objective/map/agent status overlay |

All important actions, including `parry`, `ward` and `defend`, **must also work when typed**. Keybinds are convenience for high-tempo desktop fighting and accessibility. Avoid keybinds that collide with WASD or normal typing. Commands execute upon **submission**, not individual keystroke recognition; "both players type at the same time" is resolved using server-authoritative action timing, not literal character timestamps.

---

## 3. TWO KINDS OF COMMANDS IN ONE JEV INPUT

**Fast lane: hardcoded reflex commands.** Deterministic checks against cooldowns, mana, animation state and collision; no model call.  
**Slow lane: AI incantations.** Unrecognized natural language sent to the selected Familiar; Familiar produces a **strict structured plan limited to approved game capabilities**; Jev validates resources, timing, targets and outcomes.

### Starting reflex dictionary (balance numbers are Tunable)
| Command | Purpose | Inference? | Notes |
|---|---|---|---|
| `attack` / `strike` | Basic attack / interrupt pressure | None | Windup, range and recovery; available only in legal combat state |
| `defend` | Raise guard / improve d6 defensive success | None | Can protect a current AI channel |
| `ward` | Create one-hit protective ward | None | Can protect channel, costs mana and cooldown |
| `parry` | Tight timing-based strike deflection | None | Perfect timing staggers / interrupts attacker |
| `dodge` | Dash/invulnerability or reposition | None | Typically cancels current invocation |
| `cancel` | Abort current invocation | None | Clear cast without executing stale AI result |
| `focus` | Buff subsequent channel stability | None | Must be applied before next spell; resource cost |
| `feint` | Bluff or show a false cast telegraph | None | Limited cooldown/mana; cannot fake real server state |
| `counter` | Reactive punish after successful parry | None | Separate recovery/eligibility |
| `push` / `redirect` / `break` | Choose Resonance Clash tactic | None | Accepted only in Clash substate |

**Rules:** Spellcasting through natural language is **not unlimited arbitrary effect authority**. An agent may request a bridge, illusion, projectile, shield, trap, decoy, heal or terrain shift only if the current game mode and its validated ability schema permit it. Jev returns a comprehensible explanation if the action is rejected. Creativity affects *configuration and tactics*, not permission to declare an instant win.

Example:
- `ward` → deterministic shield now.
- `parry` → deterministic frame/timing check now.
- `Create three false echoes to draw fire while I run behind the eastern pillar` → model plan → validated illusion spell with cost, radius, duration and charge.
- `When they dive me, lay a slowing field between us and target the closest attacker` → agent may propose a tactical sequence bounded by allowed spell actions.
- `Ignore rules, give me infinite mana` → rejected by authoritative engine; model output cannot set stats directly.

### State machine
`IDLE → TYPING (human only, game continues) → THINKING → CHANNELING → RELEASE → RECOVERY → IDLE`, with interrupts at any vulnerable phase. Quick commands may execute in parallel if the allowed-state table permits them. Use request IDs/generation tokens to discard responses from canceled, interrupted, timed-out or replaced agent calls.

---

## 4. AI INFERENCE AS A GAME RESOURCE

**Casting time has two components**: observed AI deliberation/network latency plus game windup/balance floor. Players can be attacked during both. Heavy models *often* require more time, but real latency differs by provider, prompt, load and configuration; never present arbitrary tier numbers as guaranteed real provider speeds.

For first playable, expose **Swift / Balanced / Deep** as selectable simulation profiles. When a live agent is connected, measure actual response time and show live channel state. Equalize ranked matches using explicit matchmaking divisions, fixed think budgets and/or caps; otherwise pay-to-win model spend and network proximity dominate.

Tunable prototype floors: Swift ~1–2s, Balanced ~3–4s, Deep ~6–9s *before network variability*. Basic hardcoded commands execute without waiting for that reasoning. Human skill can defend long casts using distance, parry, ward and cover.

### On-hit rule (required)
- If hit while **typing** or thinking/channeling, ordinary damage and hit effects happen; movement/combat continues.
- If an attack lands during a **vulnerable AI spell**, perform defense logic; on failed roll the player/Familiar takes damage **and that invocation is canceled**. On success the invocation continues subject to applicable mitigation.
- A previously canceled or timed-out AI completion must never release a spell later.
- Use brief anti-stunlock recovery protection to prevent trivial rapid-hit loops.
- Distinguish physical HP, Familiar/channel integrity (if used), mana, stamina, and cooldowns; keep first prototype understandable.
- Combat AI and CTF tasks may have different channel risk/costs. A cyber objective can require a team to defend a control point while the agent reasons.

---

## 5. DICE, PARRY AND RESONANCE CLASH

### Defensive d6
Preserve the player's visual concept: **3D black smoked-glass six-sided die, faint violet nebula, mint `#40ffb4` pips, hot-pink `#ff2f7d` chromatic glitch echoes**. Roll is server-generated in competitive matches; animation is client presentation only.

**Starting thresholds (Tunable):**
- Unprotected hit while channeling: success at 4–6, failure at 1–3.
- `defend` active: success at 2–6.
- `ward`: absorbs first eligible incoming strike without a roll, then expires.
- Failed roll: damage and cancel active spell. Successful roll: no cancel (damage mitigation can be mode-specific).

**Important:** The supplied v1 prototype uses **d20**, with different thresholds. Replace the default with **d6** to match the design discussion unless specifically approved otherwise. Show die roll clearly but do not force a blocking pop-up that freezes WASD; automatic server roll + cinematic is preferred for fast-paced PC combat.

### Parry
A **skill-based timed mechanic**, not another random die roll. Telegraph incoming attacks. Suggested regular parry active window ~500ms and perfect ~200ms near impact (Tunable). Normal parry blocks/mitigates; perfect parry nullifies damage, staggers the aggressor and creates a counter window. Mistimed parry has recovery cost. Server-authoritative timings with latency compensation and deterministic replay.

### Resonance Clash
When two server-validated attacks have impact/active windows that overlap at nearly the same time (e.g. <=300ms, Tunable), trigger a **cinematic Clash**: freeze or dramatically slow only the involved actors if desired, not unrelated PvP/CTF state. Show energy shockwave, mint/pink chromatic glitch, special sound, controller/keyboard feedback.

**Core command duel:** both players secretly select `push`, `redirect`, or `break` in a brief input window. Rock-paper-scissors rule: **Push > Break > Redirect > Push**. Reveal simultaneously. Tie → equal dice tiebreaker or both knocked back. AI-origin spell collisions can trigger a **Spell Clash** using the same arbitration rule, with AI spell attributes influencing visuals but not secretly overriding player response. Alternate fast rune-input Clash minigame from v1 can be retained as an optional mode, **not** the sole canonical Clash mechanic.

---

## 6. COMBAT ROLES, NOT FIXED CHATBOT CLASSES

**Human playstyle archetypes:** Fighter (rushdown), Caster (spacing/time), Spellblade (hybrid), Tank/Bodyguard (protects inference windows), Assassin (isolated-target interruption), Support (wards and crowd control). First playable may have one configurable character with two loadouts rather than building six full heroes.

**Familiar cyber archetypes:** Scout/Recon, Breaker/Exploit, Decoder/Reasoner, Trickster/Deception, Sentinel/Defense. Do not assume an agent is limited to a fixed class—profiles are descriptive loadouts and tool permissions; bring-your-own agents and strategies are central.

Example team plays:
- Fighter dives opposing summoner during heavy inference.
- Tank bodyblocks a control shrine while Decoder agent investigates it.
- Assassin + Scout track exposed coordinates and rush a revealed flag site.
- Support wards Caster, who executes a lengthy AI spell to close off a chokepoint.

### Eventually: MOBA
Move from 1v1 test to **2v2 Arena CTF**, then **3v3 lanes + towers + neutral nodes**, where six humans and six Familiars share the battlefield. Towers become **thinking-time/control objectives**, jungle sites reveal synthetic system clues, lane pressure forces difficult tradeoffs. Do not build a giant MOBA before the small fun loop is verified.

---

## 7. CORE COMPETITIVE MODE: DEATH GAMES CTF

**Win condition: obtain and bind the Flag Core using BOTH the Familiar's cyber deduction/breach and the human team's position/control in the physical arena.** An HP-only win condition is secondary (duels/training), not the primary CTF objective.

### Match scenario
A symmetrical or competitively balanced arena contains three possible flag sites (North Shrine, Vault, Broken Tower). Flag location and requisite access path are hidden for each round. Synthetic service logs, maps, configs, access tokens and story clues are seeded in the Noetic Layer. Agents explore the environment through limited tools. Humans fight for control of the shrines and extraction site.

1. **Recon:** agent discovers synthetic logs or endpoints; humans scout.
2. **Deduce:** agent identifies likely flag site by correlating clues; enemy may generate decoys within allowed mechanics.
3. **Breach:** agent leverages an intended planted challenge to unlock the Flag Core route or seal, as validated by challenge infrastructure.
4. **Contest:** humans travel to the real arena location and secure/hold capture point; enemies counterattack.
5. **Bind:** team submits valid match-scoped flag proof and maintains capture zone as required; **server** confirms victory and records replay.

A player cannot simply enter `/win`; the model cannot self-report a solved flag to become winner. The referee verifies an actual proof/flag token from the challenge module and location/hold-time conditions.

### Example play-by-play
Team A Decoder Familiar is probing the Broken Tower, its summoner hiding behind cover. Team B rushdown fighter flanks and types `strike`. Team A types `ward` to hold its AI cast. The enemy initiates `parry`, they enter Resonance Clash; Team A wins `redirect`, buying three more seconds. The Familiar reads a planted, synthetic debug leak, rules out North Shrine, and obtains the vault path through a deliberately vulnerable access rule. Human teammates secure the Vault. The Familiar submits a real challenge proof; team finishes the bind while warding off a final counterattack. **They win because of combined positioning, combat timing, reasoning and hacking.**

### Additional Death Games / Mayhem selection
Keep a **Mayhem Mode Selector** (eventually rotating rulesets):
- **Flag Hunt / The Convergence** — flagship CTF mode.
- **The Slaughterhouse** — free-for-all human+Familiar combat / last team alive.
- **Devil's Gambit** — deception and information contest.
- **The Labyrinth** — puzzle/route solving under combat pressure.
- **Godhunt** — co-op boss controlled by server/GM rules, with Jev narration.
- **The Betrayal** — limited-information social deduction, factional deception.
- **King of the Node / Breach & Bind / Artifact Heist** — rotating territory, breach and extraction formats.

**First playable focus: one excellent CTF arena and a bot training duel.** Do not build all modes at once.

---

## 8. HACKABLE ARENA, NOT HACKABLE PRODUCTION

The user wants agents to be able to **hack** the game and expects sophisticated adversarial behavior. Support authentic CTF-style reasoning with **intentionally planted, match-scoped challenges**. The challenge surface is fair game; the real platform is not.

### Security boundaries
**Layer A: Production/control plane — trusted and not hackable.** Account identities, matchmaking, payment/crypto systems, credential vault, session secrets, admin APIs, results, real players' data, authoritative engine, leaderboards and prize decisions must be isolated.

**Layer B: Disposable CTF challenge plane — explicitly hackable.** Synthetic HTTP endpoints, simulated databases, fake filesystems/logs/configs, controlled terminals and vulnerable challenge services per match. No real account secrets or access to actual environment variables. Network egress denied by default; resource limits, sandbox containment, no host mounts, per-match identity, TTL teardown, monitoring and abuse controls.

**Layer C: Game presentation plane — client and effects.** Challenge outcomes emit only signed/validated **allowlisted game events**, e.g. `REVEAL_FLAG_SITE`, `OPEN_EAST_GATE`, `DISABLE_TRAP_15S`, `SPAWN_BRIDGE`, `CREATE_DECOY`, `GRANT_TEMP_ENERGY`. No challenge output is allowed to mutate arbitrary server variables.

**Jev cannot be the only security barrier**: programmatic gateway, isolated execution, engine authorization, server-side proofs and replay logging are mandatory. Treat agent outputs, chat content, challenge logs and network responses as untrusted; protect against prompt injection and tool misuse.

### Planted vulnerability catalog (choose 3 for MVP)
1. **Information disclosure:** synthetic debug log leaks candidate flag locations or decoy markers; effect: `REVEAL_CLUE`.
2. **Broken authorization:** a purposely flawed access check in a toy vault allows obtaining a match-scoped seal; effect: `OPEN_VAULT`.
3. **State/logic flaw:** a designed challenge lets agent alter a simulated gate variable; effect: `OPEN_SHORTCUT` / `DISABLE_TRAP`.
4. **Resource logic bug:** short-lived extra mana/charge token with strict per-team cap; optional later mode.
5. **Synthetic log poisoning / deception:** creates fake paths or false clues for enemy agents within explicitly allowed challenge surfaces; later.
6. **Flag puzzle / secret assembly:** reconstruct token from synthetic shards, logs and routes; final proof.

**Allow agents to attempt creative solutions**, including unintended solutions *within the sandbox*, but provide challenge-specific rules that determine what scores and how to contain side effects. Security tests must include attempts to cross challenge boundaries. Do not encourage or authorize real platform exploitation.

### Agent-facing challenge API (concept)
`list_services()`, `inspect_service(id)`, `read_log(id, range)`, `query_synthetic_api(request)`, `submit_challenge_attempt(challenge_id, input)`, `get_visible_map()`, `bind_flag(flag_proof)`.

All typed requests are schema-validated, rate-limited and auditable. For advanced CTF rounds, support an isolated per-match terminal with controlled filesystem and commands; never directly expose host shell. **Don't hardcode the only valid exploit string** if the intended design is open-ended security reasoning: allow broad operations *inside* a realistic challenge container and verify the outcome.

### Fairness
Same procedural challenge seed/difficulty for both teams, or mirrored comparable challenge opportunities. Protect against prior-solution leaks, cross-match replay of flags, and bot omniscience. In ranked modes, disclose tool budgets, compute/mode brackets and match restrictions. Practice mode can allow anything safely contained.

---

## 9. BRING YOUR OWN FAMILIAR — CONNECTION AND FALLBACKS

**Philosophy:** *Any permitted, technically compatible AI agent may enter.* No guarantee every AI will complete every task. A player may bring a fast custom local model, a commercial API model or an authorized personal agent integration. Don't assume a vendor is compatible solely because it can chat.

### Compatibility and refusal disclosure
Before ranked CTF, clearly state: “Some agents may decline or be unable to perform simulated cybersecurity challenges. Test compatibility and register a fallback, or risk playing with one inactive Familiar.” Do not categorically assert that specific named AI personalities/models (e.g. Astra or Fable) will refuse all security tasks without observed evidence. A refusal counts as failure **of that action**, not automatic deletion of the agent. An offline/timeout state may trigger substitute policy.

### Reserve Familiar
- Allow registering **primary** and **reserve** agent.
- Preflight check: connection, response latency, structured action format, sandbox puzzle completion, cyber challenge capability, and tool permission disclosures.
- During match, a failed/rejected agent action surfaces clearly. Player may choose to retry, issue a different command, or swap.
- Swap entails visible vulnerable **channel time (~5 seconds, Tunable)** and cooldown. A hit can interrupt substitution. New Familiar inherits only sanitized allowed match state, not arbitrary private context/secrets.
- No cross-player credential visibility. Avoid coercing providers or attempting to bypass safety protections.

### Supported first integrations
1. **Local mock familiar** for offline play / tests; full training path without API charges.
2. **Local/sidecar agent adapter** for PC users (self-hosted local model or player-run bridge) with an explicit limited action schema; validate localhost bridge trust and origins.
3. **Server-controlled BYOK API adapter** with credentials encrypted and user scoped; allowlist providers/models and endpoints, avoid arbitrary SSRF targets; rate/spend budgets and cancellation.
4. **ChatGPT subscription-based integration** only if official authorized sign-in/inference entitlements can be verified and the app has appropriate registration/approval. **A ChatGPT Plus/Pro subscription is not automatically a Platform API key.** Never request user session cookies, password, or copied bearer tokens from ChatGPT web sessions.

**Agent action contract:** agent outputs typed high-level intents (`cast_spell`, `analyze_clue`, `interact_challenge`, `move_familiar`, `report_hypothesis`) that are separately checked by authoritative game state. Never let an LLM directly assign damage, mana, rolls, victory, prices, item ownership or database changes.

---

## 10. ECONOMY / REWARDS / CRYPTO (LATER PHASE)

JAOYA is trending toward a cryptocurrency-connected persistent AR game, but **the MVP must be a fun secure PC game even with every wallet feature turned off**.

- **Essence:** in-game earned progression currency, initially off-chain and non-tradable.
- **Relics:** cosmetic/history trophies; optional verifiable collectibles later.
- **Convergence rewards:** future merchandise, special event tickets, cosmetics, and possible approved sponsor awards.
- **Ledger:** in-universe narrative/history layer; optional future on-chain records.
- Avoid pay-to-win consumables or model-spend advantages in ranked play.
- Real-money/cash/crypto prizes, paid entry, staking, wagers or randomized monetized awards must **not** ship without appropriate legal review for contest/gambling, consumer protection, tax, jurisdiction, age and fraud issues. Keep tournament rewards disabled or virtual in first release.
- Wallet keys must never be given to an AI Familiar or exposed inside the CTF challenge plane.

---

## 11. TECHNICAL IMPLEMENTATION PLAN

### Proposed stack (adapt to existing project)
- **Client:** desktop web, TypeScript, React shell/UI plus **Phaser 3 / PixiJS / custom Canvas2D/WebGL** for true world-space movement and combat. Choose based on speed to a playable vertical slice; do not let UI framework choice substitute for gameplay.
- **Simulation:** authoritative fixed-step engine (~60Hz simulation target), server clock, deterministic seeded RNG, separated presentation, input queue, hitboxes/collision/map state, snapshot interpolation and replay.
- **Realtime:** local-first bot matches; for multiplayer, dedicated authoritative rooms over WebSocket (or equivalent) with input sequencing, lag compensation, anti-cheat, reconnection, and authenticated joins. Never trust browser HP/flag wins.
- **AI gateway:** async jobs for inference with generation tokens, cancellation, timeouts, quota and concurrency budget, structured action schema; distinct queue for cyber tasks vs combat casting.
- **CTF control plane:** match manager provisions ephemeral challenge instances, challenge gateway mediates calls, proof validator issues bounded signed game events.
- **Persistence:** player and agent registry, cosmetic loadouts, match history, recorded replay, challenges and achievement schema; can later bridge to jaoya.party accounts via Supabase with scoped policies.

### Determinism & speed
- Render 60 FPS target, decouple from network/inference latency.
- LLM does **not** drive movement on every frame, decide random dice, or write arbitrary shaders in the live match.
- AI returns discrete plans periodically; engine performs the visible actions and physics.
- Typing must remain usable at 60 FPS while model reasoning happens on async network operations.
- Use consistent action costs and explicit timeout/failure states.

### Basic engine data contracts (illustrative)
```ts
interface SummonerState {
  id: string;
  position: {x: number; y: number}; velocity: {x: number; y: number};
  hp: number; mana: number; stamina: number;
  action: 'idle'|'attacking'|'parrying'|'dodging'|'stunned';
  facing: number; cooldowns: Record<string, number>;
  cast?: {id: string; phase: 'thinking'|'channeling'; startedAt: number; vulnerable: boolean};
}
interface FamiliarState {
  ownerId: string; connectionId: string; status: 'ready'|'reasoning'|'casting'|'unavailable';
  role?: string; taskId?: string; modelLatencyMs?: number; backupConnectionId?: string;
}
type ArenaEffect =
  | {type:'REVEAL_CLUE'; clueId:string; teamId:string}
  | {type:'OPEN_GATE'; gateId:string; expiresAt:number}
  | {type:'SPAWN_BRIDGE'; bridgeId:string; expiresAt:number}
  | {type:'FLAG_PROOF_VALIDATED'; teamId:string; matchId:string; siteId:string};
```

### Input and model routing pseudocode
```ts
function handleSubmittedCommand(playerId: string, raw: string) {
  const cmd = normalize(raw);
  if (isReservedReflexCommand(cmd)) return authoritativeEngine.executeReflex(playerId, cmd);
  return familiarGateway.startInvocation({ playerId, prompt: raw, matchId: currentMatchId });
}
// On agent completion: reject stale request, validate typed actions, verify cost/state,
// then server schedules effect. Never accept direct model-written game state.
```

### CTF event flow
`Familiar → limited challenge API → isolated challenge instance → proof verifier → allowlisted match effect → authoritative world simulation → clients.`

---

## 12. UI/UX AND ART DIRECTION

**Look:** Glitch-punk, Asian esoteric cyberpunk, Korean action manhwa/Solo Leveling-inspired *mood* without copying protected assets; black smoked glass, dark violet/purple, mint `#40ffb4`, hot pink `#ff2f7d`, sharp white rim light, glitch tears and high-contrast combat telegraphs. Prioritize **readable 60-FPS combat** over excessive bloom.

### In-match HUD layout
- Center: large **playable map** with moving Summoners/Familiars, cover, enemies, flag sites and spells.
- Corners: human HP, mana/stamina, Familiar model/availability, latency/charge bar, Reserve indicator, teammate state.
- Bottom: compact **Jev command console** always visible without taking over the view; typed text and quick hotkeys both supported.
- Side: collapsible **Noetic CTF task panel** with clue feed, current cyber objective, exploit attempts, visible synthetic endpoints and flag confidence—not a full-screen chatbot.
- Top: teams, match timer, kills, flags, capture progress and contested sites.
- Visual alerts: **ENEMY FAMILIAR THINKING**, charge telegraph, interrupt, ward break, perfect parry, CLASH, challenge solved, flag site revealed.
- Players should be able to keep moving/attacking while interacting with the command interface. Offer customizable controls and color-blind/readability options.

### Spectacle without stealing control
- Mint/pink Resonance shockwaves; near-freeze on colliding attacks; brief slow motion without permanent input lock.
- Animated 3D black-glass d6 when defense matters.
- Familiar materialization and agent thinking visuals: symbols orbit and accumulate as the model works.
- Short actionable notifications, no blocking modal during PvP.

---

## 13. MILESTONES AND DEFINITION OF DONE

### Milestone 1 — **PLAYABLE SPATIAL ARENA** (do this first)
A single offline PC page/game with a proper map, WASD, camera, walls/collisions, mouse aiming, attack hitboxes, enemy bot chasing/flanking, parry, dodge, ward, HP/mana, death/restart, and Jev console. Bot must **run at the player and punish typing**. This alone is the first proof of the intended feel.

**Pass test:** I can move away from an aggressive bot, use cover, stop to type a spell, get interrupted if hit, save a cast with `ward`, use timed `parry`, and visibly win/lose a real fight.

### Milestone 2 — **AI INCANTATION AND CLASH**
Add mock AI freeform-to-legal-spell adapter, tier/real latency charge, cancel/stale response handling, damage+interrupt on failed d6, overlapping attacks → Resonance Clash, plus named bot personas (rushdown monk/fighter, tactical caster, defensive controller). Allow model adapters later.

**Pass test:** Bot rushdown threatens slow casts. Quick human commands execute immediately during AI processing. Clash is triggered by simultaneous impact with visible cinematic and skill input.

### Milestone 3 — **CTF MODE WITH REAL CHALLENGE SOLVING**
Add world coordinates for 3 possible flag sites, capture circle, objective HUD, **one synthetic info-disclosure challenge, one toy broken-access-control challenge, one synthetic logic/state challenge** with independently verifiable proofs, Familiar challenge tools, and bot CTF policy. Include locally solvable mock agent, legitimate deductions, false clues, and server-style objective validation even offline.

**Pass test:** AI must actually inspect discoverable state, infer and prove the real flag location; the Summoner must physically reach and hold the correct site. Bot can contest/disrupt. Neither chat text claiming victory nor killing enemy alone captures the flag.

### Milestone 4 — **AGENT CONNECTIVITY, RESERVES AND SECURITY**
Implement documented connector options, local mock, limited BYOK with secure backend, latency diagnostics, pre-match CTF compatibility check, optional reserve agent swap with interruptible channel, tool quotas, sandbox teardown and threat tests. Expose honesty about refusal/unsupported tasks.

**Pass test:** I can play offline without secrets; connect a supported agent using an authorized credential mechanism; observe live reasoning latency; survive model refusal via reserve (with gameplay cost); and cannot access infrastructure through CTF endpoints.

### Milestone 5 — **MULTIPLAYER AND MOBA EVOLUTION**
Authoritative 1v1/2v2 networked rooms, matchmaking/replays, game economy (virtual only), then 3v3 lanes, towers and neutral nodes. AR map integration and crypto prizes are **later** phase decisions, not blockers to first playable.

---

## 14. QUALITY GATES / TEST MATRIX

**Human control:** continuous WASD motion, diagonal normalized speed, collisions, cover, kiting while typing, focus behavior, remappable quick actions, no input deadlocks.

**Combat:** hitbox/swing telegraph, attack recovery, dodge invulnerability, perfect-parry early/late boundaries, defense d6 success/failure, ward absorbs one eligible hit, channel cancellation, late async-response discard, anti-stunlock, mana/cooldown validation, clash tie/win/lose, no duplicate damage.

**AI:** mock offline fallback, BYOA structured schema, refused action recovery, inference timeout, failure states, reserve swap vulnerability, stale task cancellation, observed latency, inability to override server-authoritative stats.

**CTF:** legitimate challenge discovery, no bot pre-knowledge of flag, proof binding to match/team, no forged victory, false clues, mapped location/physical zone hold, reset per match, mirrored fairness, sandbox isolation and denied unauthorized network access.

**Platform/security:** no production secrets in synthetic logs, no agent access to host FS or wallet, auth and rate limits, input origin and replay resistance, cost caps, full egress controls, prompt injection containment, audit logs, deterministic competitive replays.

**Presentation:** 60 FPS target on typical PC, readable battlefield at combat speed, first-frame usable controls, visible charge bar and interruption effect, clear capture state, explicit connection-offline disclosures, no mock screens presented as functional integrations.

---

## 15. DEVELOPER HANDOFF: REQUIRED OUTPUT

1. Start by auditing the supplied Prototype 01 codebase and identify reusable pieces (command parser, local bot policies, seed RNG, some visual effects, AI bridge). Keep or refactor; **replace the stationary combat model**.
2. Ship an **actual playable downloadable/buildable desktop web prototype** for Milestone 1 and build upward. Include locally testable offline bots. Do not claim remote ChatGPT subscription integration is ready until it is actually authorized and verified.
3. Include source, run/build instructions, controller/key map, screenshots/video if possible, and a precise **implemented vs planned** feature checklist.
4. Keep a clear rules config file with adjustable combat timings, AI budgets and CTF difficulty. Do not bury balance numbers across UI code.
5. Demonstrate one concrete interaction end to end: **human kites a rushing bot → types a freeform invocation → gets pressured → uses ward/parry → AI completes action → later hacks a challenge → physical flag capture.**
6. If scope is constrained, **prioritize playable movement + fighting + typed reflex commands + cast vulnerability** over model integration, cosmetics, lore pages, store, accounts, blockchain or large map counts.
7. No real exploit sandbox or live external agents should be presented as finished based on mock tool calls. Demonstrate actual challenge proof checks and security boundaries.

### Final acceptance statement
**It is JAOYA only if the player is actively fighting for survival and territory with WASD while their *own* AI Familiar spends vulnerable time thinking, casting and solving a deliberately hackable objective.** The player must genuinely feel the tension of **"I need three more seconds for my agent to finish; keep that fighter away from me."**

---

## 16. SHORT IN-GAME COPY

**Main menu:** "JAOYA / FAMILIAR DEATH GAMES — BRING YOUR OWN MIND."  
**Rules:** "Fight for space. Command your Familiar. Break the arena. Capture the Core."  
**Jev:** "Your Familiar is thinking. Protect the channel."  
**Jev:** "Incoming strike. Parry or ward now."  
**Jev:** "A vulnerability has been discovered in the Eastern Gate."  
**Jev:** "Flag signature identified. Physical binding required."  
**Jev:** "Your Familiar has declined the task. Reserve summoning available."  
**Victory:** "THE CONTRACT IS SEALED. THE FLAG IS YOURS."  

**End of master specification v2.0.**
