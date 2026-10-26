# 071 plan: off-screen threat markers

Plan for docs/specs/071-offscreen-threats.md on `claude/071-offscreen-threats` (InsanityWolfz/Pipeline#85, from main).
Pre-approved by Shaun with the spec (2026-10-26).

Three vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first;
the code follows them.

## Findings that shape the plan
- **"On screen" already exists in the sim.** `viewRect(state)` (src/sim/population.ts) is "what the camera shows":
  the 640×360 view centred on the player's sprite and clamped to the room, as the follow camera is once it settles.
  `enemiesOnScreen` (017's "on screen") uses it. An enemy is off screen when its feet are outside that rect. No new
  rule for the camera; render never decides what counts.
- **Wind-ups are modes.** Every enemy the spec lists winds up in one mode of `EnemyState.mode`:
  - `windup` for the Sniper (tracking, then locked: sniperAi.ts), the storm sentinel's call (sentinelAi.ts), the
    Wisp's charge (casterAi.ts, kind `caster`), the thunderhawk's dive (hawkAi.ts), the bellows hound's lane
    (houndAi.ts) and the Charger's lane (chargerAi.ts);
  - `lob` for the Bulwark rearing back to lob (bulwarkAi.ts); `throw` is the bombs already thrown, whose landing
    circles draw on the ground.
  A cancelled wind-up leaves the mode (the Sniper's blocked line goes to `peek`), and a landed one moves on to
  `swipe` / `throw`, so "fades when the attack lands or is cancelled" is just "no longer in the mode".
- **Which wind-ups count is data**: a new `src/data/threats.ts` maps an enemy kind to the modes that are a wind-up
  on the player (the seven above). A new kind that should warn is a data line. Every kind not listed (the Husk, the
  Warden, the Burrower, the Shardback, the golem, the ram, the mote, the mite, the kiln-tender, the Forgewright and the
  Conductor) winds up only in reach of the player or not at them; to raise.
- **No save change.** The threat list is derived from state each call (`offscreenThreats`), not stored, and the
  setting is a per-device setting (src/data/settings.ts, browser storage, never the save). SAVE_VERSION stays 21.
- **Per-frame cost.** GameScene already filters the room's enemies once a frame (`inRoom(sim.enemies, shown)`).
  The scene keeps that one list and hands it both to EnemyView and to the threat view, which asks the sim for the
  threats among it: one extra pass over the room's enemies with a mode check first, and no prop scan.
- **Edge placement has a precedent**: 051's waypoint arrow (src/render/waypointPlace.ts) puts an arrow on the view's
  edge, clear of the fixed HUD boxes (the bottom bars, the minimap, the objective band), and places it again on the
  camera's FOLLOW_UPDATE so it never lags a frame (057.6). The threat arrows reuse its ray-box `entry` (exported) and
  the same two-pass placement, but run their line from the player, as the spec says, not the view's centre.
- **HUD boxes**: GameScene's `hudBoxes` (HUD fixed boxes and the minimap) plus the objective band (TutorialUi's
  objective box) and, while a boss fights, the boss bar along the top (the Bulwark lobs from its arena).
- **Settings**: `flashes` (042.10) is the model: a boolean in `Settings`, parsed with a default by
  settingsStore.ts, a row in SettingsView.ts, a toggle in SettingsScreen.ts. The new row goes after Flashes.
  SETTINGS_VERSION stays 1 (a missing field reads as its default, as `flashes` did).

## Slice 1: the sim's threat list
Tests first (tests/sim/threats.test.ts):
- a Sniper tracking off screen is a threat; on screen it isn't; idle, cooling down or back in `peek` (a cancelled
  shot) it isn't;
- each listed wind-up counts off screen: the sentinel's call, the Wisp's charge, the hawk's dive, the hound's and the
  Charger's lanes (`windup`), the Bulwark's `lob` (not its `throw` or its pound's `windup`);
- a Husk's `windup` off screen doesn't count; an enemy in another room doesn't; nothing counts while the player is
  down (`dying`);
- the summary's `threats` lists them (id, enemyId, x, y).
Code: src/data/threats.ts (`THREAT_WINDUPS`), src/sim/threats.ts (`threatening`, `offscreenThreats`), the summary's
`threats` field.

## Slice 2: the arrows
Tests first (tests/render/threatPlace.test.ts):
- the arrow sits on the view's edge, `edgeInset` in, on the line from the player to the enemy (east, north, a corner);
- a HUD box on the line stops it short of the box;
- two arrows closer than `mergeGap` merge into one along their mean direction; three in a row chain; far apart stay
  two.
Code: `THREAT_ARROW` look data (size, inset, gap, pulse, fade, the shared enemy red `ENEMY_FX.telegraphColor`),
src/render/threatPlace.ts (pure placing and merging), src/render/ThreatView.ts (one Graphics; each threat id's alpha
fades out over `fadeMs` after it leaves the list, at its last point; a steady pulse; placed on update and on the
camera's FOLLOW_UPDATE), GameScene wiring, `ui().threats` in the test hook, BossBar's box.

## Slice 3: the setting, e2e and shots
Tests first:
- tests/render/settingsStore.test.ts: `offscreenWarnings` defaults on and parses like `flashes`;
- tests/e2e/threats.spec.ts: in `?sandbox`, a Sniper spawned off screen winds up and `ui().threats` shows an arrow at
  the edge toward it, which fades once it fires; with Settings' "Off-screen warnings" off, none;
- tests/e2e/settings.spec.ts: the row list gains "Off-screen warnings".
Code: the setting, its row and toggle; ThreatView draws nothing with it off.
Shots (tests/e2e/threatsShots.spec.ts, REVIEW_SHOTS=1, docs/review/071): a Sniper's arrow; two merged arrows; the
setting off.

## Out of the plan
Markers for idle or wandering enemies, sound cues (the spec's out of scope).
