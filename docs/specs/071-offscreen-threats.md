# 071: Off-screen threat markers
status: done

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-26. Plan: docs/plans/071-offscreen-threats.md.

Drafted from the Hollows and late-game playtesters' findings (killed by Snipers, sentinels and others off-screen; docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
You always know where an attack is coming from. An enemy winding up an attack on you from off-screen shows a pulsing red arrow at the screen's edge.

## Design references
- docs/design.md, "Combat": "Every enemy still telegraphs attacks you read and dodge".
- Specs 035 (the Sniper's laser), 054 (combat readability), 065 (the storm sentinel).

## Acceptance criteria
- [ ] While any enemy that is outside the camera's view is winding up an attack on the player, a red arrow shows at the screen's edge on the line from the player to that enemy. It pulses through the wind-up and fades when the attack lands or is cancelled.
  - This covers: the Sniper's tracking, the storm sentinel's call, the Wisp's charge, the thunderhawk's dive, the bellows hound's lane, the Charger's lane, and the Bulwark's lobs.
- [ ] Several arrows can show at once. Arrows closer than a set gap merge.
- [ ] Strike circles and lanes that land on screen keep drawing as now.
- [ ] The arrows sit clear of the HUD panels, the minimap and the objective banner.
- [ ] Settings gains an "Off-screen warnings" toggle, on by default, saved with the other settings.
- [ ] The sim exposes which off-screen enemies are winding up on the player (render reads it).
- [ ] Review shots (docs/review/071): a Sniper's arrow; two merged arrows; the setting off.

## Out of scope
Markers for idle or wandering enemies; sound cues.

## Test plan
- Sim or render tests for: which wind-ups count, edge placement, merging, the setting.
- Playwright: a sandbox Sniper off-screen shows the arrow.
- Review shots.

## Decisions in this draft
- Only wind-ups aimed at the player show an arrow; enemies merely nearby don't.
- An arrow's colour is the shared enemy red.

## Raised after the build
Each is built the least surprising way; the ones marked **Shaun** want his call.

- **071.1 Which wind-ups count (Shaun).** Exactly the seven the spec lists, as data (`THREAT_WINDUPS` in src/data/threats.ts, by enemy kind and mode): the Sniper's `windup` (tracking and locked), the storm sentinel's call, the Wisp's charge, the thunderhawk's dive, the bellows hound's and the Charger's lanes, and the Bulwark's `lob`. Not counted: wind-ups that only start in reach of the player (the Husk, the Warden, the Burrower, the Shardback, the slag golem and whelp, the gale ram, the cinder mote, the static mite), the kiln-tender's beam (at an ally), the Bulwark's pound, stomp and back wave, and the late bosses' attacks (the Forgewright's spray and flood, the Conductor's lash and storm call). The Conductor's storm call drops circles on the player from anywhere in his hall; adding it (or any other) is one data line.
- **071.2 What "off screen" means.** The camera's real view, enemy by its feet: render passes the world rect the camera shows (its easing and a boss fight's lift included) to `offscreenThreats`, so the sim still decides which enemies count. Without one (getState(), the sim's tests) it falls back to `viewRect`, 017's "on screen": the 640×360 view centred on the player's feet and clamped to the room. (Review fix: deciding on `viewRect` alone drew an arrow under the boss bar for a Bulwark lobbing in plain sight when the camera lifted.)
- **071.3 The Bulwark's lob.** The arrow shows while it rears back (`lob`) and fades as it throws (`throw`); the bombs in flight already draw their landing circles.
- **071.4 Merged arrows (Shaun).** Arrows whose tips are within 28 px (`mergeGap`, a chain of them too) become one arrow, along the mean of their directions from the player, at the strongest of their alphas. A merged arrow looks like a single one: no count, no larger size. Merged arrows aren't re-checked against each other: on a straight edge two groups can't land closer than their nearest members, and a sweep of four-threat sets round the whole view, with and without a HUD box, finds no case at a corner either (a test keeps it so).
- **071.5 Colour (Shaun).** The shared enemy red, `ENEMY_FX.telegraphColor` (`rust`), with an ink outline. On the Hollows' brown floor it reads less strongly than the boss bar's `danger` red (review shots 01 and 02); switching is one data value.
- **071.6 Look and timing (tuning, in data).** A filled triangle 18 px long and 18 px across, its tip 15 px in from the edge (the 6 px inset plus half its width, so no corner pokes off screen or under a HUD box, whichever way it points); a steady pulse between 0.7 and 1 alpha every 0.5 s (it doesn't quicken toward the attack); a 0.25 s fade, at the arrow's last place, once the wind-up lands or is cancelled.
- **071.7 No arrows while the player is down** (`dying`), and none for a room other than the one on screen (through a door's fade).
- **071.8 HUD clearance.** The arrows keep clear of the fixed HUD boxes the waypoint arrow uses (the bottom bars, the carried hint, the minimap), the objective band, and the boss bar along the top while a boss fights (its frame, name, heat gauge and shield; the Bulwark lobs from its arena).
- **071.9 Which enemies can wind up off screen at all is unchanged.** Most kinds wake only on screen (017) and wind up only once engaged; the Sniper wakes from 320 px. An engaged enemy left off screen as the player moves keeps attacking until its leash, as before.

## Results
- Criteria:
  - Edge arrow on the player-to-enemy line, pulsing through the wind-up and fading when it lands or is cancelled, for all seven listed wind-ups: met. tests/sim/threats.test.ts (which wind-ups count, on/off screen by the camera view render passes or `viewRect`, other rooms, KO, a live Sniper from wind-up to shot), tests/render/threatPlace.test.ts (edge placement from the player), tests/e2e/threats.spec.ts (a sandbox Sniper's arrow at the top edge, gone once it fires).
  - Several arrows; close ones merge: met. tests/render/threatPlace.test.ts (apart, merged, chained); review shot 02.
  - On-screen strike circles and lanes draw as now: met (no telegraph code changed).
  - Clear of the HUD panels, minimap and objective banner: met. No corner of an arrow sits off screen or inside a HUD box, at any angle (tests/render/threatPlace.test.ts); the scene passes the HUD's fixed boxes, the minimap, the objective band and the boss bar, checked in the Bulwark's fight through `ui().threatClear` (tests/e2e/threats.spec.ts), where its lob shows an arrow exactly while it's off the camera's real view.
  - Settings' "Off-screen warnings", on by default, saved with the other settings: met. tests/render/settingsStore.test.ts, tests/e2e/threats.spec.ts (off: stored, nothing drawn), tests/e2e/settings.spec.ts (the row list).
  - The sim exposes the off-screen wind-ups: met. `offscreenThreats` (src/sim/threats.ts) and getState()'s `threats`; render only places and draws them.
  - Review shots: docs/review/071 (01 a Sniper's arrow, 02 two merged arrows, 03 the setting off, 04 the same Sniper with no arrow).
- No save change: the threats are derived from state each call, and the setting lives in browser storage. SAVE_VERSION stays 21.
- Per-frame cost: the scene filters the room's enemies once (as before) and hands the list to both the enemy and threat views; the threat check is a mode lookup first, about 1–6 µs a frame on a new game's overworld (60 enemies).
