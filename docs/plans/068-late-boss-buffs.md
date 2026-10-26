# 068 plan: tougher late bosses

Plan for docs/specs/068-late-boss-buffs.md on `claude/068-late-boss-buffs` (InsanityWolfz/Pipeline#82, from main).
Pre-approved by Shaun with the spec (2026-10-26).

Five slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code
follows them.

## Findings that shape the plan
- **The Forgewright's numbers are all data** (src/data/forgewright.ts): `maxHealth` 4000, `bellows.health` 150,
  `bellows.patchTicks` 240, `slam.cooldownTicks` 150, `spray.cooldownTicks` 180. 20% shorter cooldowns are 120 and
  144; the wind-ups (slam 54, spray 45) stay, both over `MIN_TELEGRAPH_TICKS`.
- **Heat and the vent** (src/sim/forgewrightAi.ts, forgewrightParts.ts):
  - `startVent` sets `e.heat = 0` (060's "venting resets its heat");
  - `forgewrightThink` returns `hold(e)` in `vent` mode *before* `stepHeat`, so heat stays 0 through the vent (060.24).
  - The only other reset is floodPools.ts: the last pool drying sets heat to 0. So the change is two lines: drop the
    reset in `startVent`, and step heat before the vent's hold. No flag: the rule is removed, as the spec allows.
  - A vent staggers it, "unable to move or attack". A flood is an attack, so with heat full mid-vent the flood waits
    for the vent to end and starts at its next decision point (the conservative reading, to raise).
- **The plating check** is `plated(e)` (src/sim/forgewrightParts.ts), the Forgewright's alone. Every damage path
  already asks it:
  - `strike` (combat.ts): shots and Shards; a piercing shot glances off and flies on;
  - `damageEnemy` (enemies.ts): every other body hit lands here, so a Burst, Bomblet, mine (blast.ts), punch
    (melee.ts), burn beat (fire.ts) and death burst is blocked with a spark and clang (`recordBlock`);
  - `blastArea` (blast.ts): a Burst that opens the plating spends itself (060.38);
  - Lightning arcs (lightning.ts), burn spreading (fire.ts) and ember deaths (emberDeaths.ts) skip a plated enemy.
  - Render reads it for the boss bar's blue shield state (BossBar.ts) and the small bar (enemyBar.ts); the summary
    exposes it as `plated` (summaryHollows.ts).
  So the storm shield is one predicate: a new `stormShielded(e)` in conductorRods.ts (`standingRods(e) >= shieldRods`),
  and `plated` moves to bossParts.ts as "the Forgewright not vented, or the Conductor shielded". Every caller imports
  it from there; forgewrightParts.ts keeps its own as `forgePlated`.
- **Untargetable** is `targetable(e)` = `!immune(e)` (enemies.ts): burrowed or rising. Arrows, Bursts, punches,
  arcs, burn beats and spreading all skip an untargetable enemy, so shots pass through.
  - The blink-in window joins `targetable`, not `immune`: `immune` also drives the blue bar, and the window doesn't
    plate him (the spec: shots pass through, nothing clangs).
  - But arrowHits, blastArea and punch skip the whole enemy when it isn't targetable, its parts too. His rods don't
    blink in, so those three check parts whenever the enemy isn't `immune`, and the body only when it's `targetable`.
  - Homing (homing.ts) drops a target that isn't targetable, and re-locks only onto a targetable Conductor. Under the
    window, a round locked on him would lose him at every blink, against 064.22 ("a round locked on it follows it
    through a blink") and the spec's "homing lands where straight shots miss". So homing tracks a Conductor in his
    window (a new `trackable` = not immune): it steers at him, passes through if it arrives early, and lands once the
    window ends. To raise.
- **The window's state.** Nothing in `ConductorState` says how long ago he appeared, so it gains `blinkIn` (ticks
  left), set by the blink's arrival in `stepBlink` and counted down with the rods in `stepRods` (every tick, frozen or
  not). That changes the save's shape: `SAVE_VERSION` 21 (20 is another branch's).
- **The storm call** places circle 0 on the player and the rest round them at `(i - 1) · 2π / (count - 1)`, `spread`
  px off. With 5, four sit round the player at quarter turns, the spread (64 px) unchanged.
- **Grounding** (`grounded`, `minRods` 2) is untouched. With the shield at 3 the blink-in window only matters with
  exactly 2 rods standing, since with 3 or more he is shielded anyway.
- **Tests hitting his body.** conductorRods.test.ts ("a Burst ... and the Conductor too"), lightning tests and
  others hit the Conductor with all six rods up. Those now break four rods first, keeping what they test.
- **Measure.** tests/measure/conductor.measure.ts runs `carefulBot` (fire at his body). With the shield, a decent
  homing build needs a bot that breaks rods: a new `rodBreakerBot` aims at the standing rod farthest from him while 3
  or more stand (so a homing bolt fired at it doesn't lock onto him), then at him. The no-homing, no-rod-breaking
  record is `carefulBot` with arrows. The Forgewright's bot is unchanged; its target becomes 90–120 s. The Bulwark's
  measure runs as is (main's Bulwark has 3800 health; fix-bulwark-ease isn't on main yet).

## Slice 1: the Forgewright
Tests first:
- forgewright.test.ts: data (6000 health, bellows 300 and 180); the patch and "one then the other within the patch"
  at 180; the vent no longer sets heat to 0.
- forgewrightAttacks.test.ts / a new forgewrightHeat.test.ts:
  - heat fills through a vent at its usual rate (and slowed by Chill there);
  - with heat full mid-vent, the flood waits for the vent's end, then winds up;
  - a fight that vents it every 8 s still floods on its 30 s rhythm (only the flood resets heat);
  - slam and spray cooldowns 120 and 144, wind-ups unchanged and at least `MIN_TELEGRAPH_TICKS`.

Code: forgewright.ts numbers and doc; `startVent` keeps heat; `forgewrightThink` steps heat before the vent's hold.

## Slice 2: the storm shield
Tests first (a new stormShield.test.ts), with 3+ rods standing and then at 2:
- a straight shot (a piercing one glances on), a Shard, a Burst, a Bomblet, a mine, a punch, a burn beat, a Lightning
  arc (skipped) and a direct lightning hit: each blocked (a block event, no damage) with 3; each lands with 2;
- 3 standing still shields; a regrown rod brings the shield back;
- `plated` in the summary, the Forgewright's plating unchanged.
Existing tests that hit his body break four rods first.

Code: `shieldRods` in conductor.ts; `stormShielded` in conductorRods.ts; `plated` in bossParts.ts, imported by
combat, enemies, blast, fire, emberDeaths, lightning, summaryHollows, BossBar and enemyBar.

## Slice 3: the blink-in window, the storm call, health
Tests first (a new conductorBlinkIn.test.ts; conductor.test.ts and conductorAttacks.test.ts updated):
- data: 8000 health, `blinkInTicks` 30, `shieldRods` 3, the call's count 5;
- for 30 ticks after he appears a straight shot, a Burst and a punch pass him (no hit, no block), a rod still takes
  hits; on the 31st they land;
- a homing bolt locked on him follows him through the blink, passes through in the window, and lands after it;
- the storm call drops 5 circles, four 64 px off the player;
- grounding unchanged (fewer than 2 standing: no blink, no window).

Code: `blinkInTicks` in conductor.ts; `ConductorState.blinkIn`; `targetable` in enemies.ts; parts checked when not
immune in combat.ts, blast.ts and melee.ts; `trackable` in homing.ts; `SAVE_VERSION` 21.

## Slice 4: measure
- forgewrightBot.ts `TARGET` 90–120 s; forgewright.measure.ts's labels.
- conductorBot.ts `TARGET` 120–180 s and `rodBreakerBot`; conductor.measure.ts: the homing build with the rod
  breaker, and the no-homing, no-rod-breaking build (`carefulBot`, arrows) recorded. conductorFight.test.ts runs the
  rod breaker on one seed, twice the same.
- Run `npm run measure` for the Forgewright, the Conductor and the Bulwark; record the numbers in the spec.

## Slice 5: Playwright and review shots
- conductorSandbox.spec.ts: a new test: in the sandbox, shots at him clang with six rods (boss bar shielded), then
  four rods broken, the bar leaves the shield state and shots land.
- lateBossShots.spec.ts (REVIEW_SHOTS=1, docs/review/068): the Forgewright vented while its flood's pools are out;
  the Conductor shielded with 4 rods standing; the Conductor exposed with 2 standing.
- The spec's results and "Raised after the build".
