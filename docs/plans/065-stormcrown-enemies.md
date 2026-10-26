# 065 plan: Stormcrown enemies

Plan for docs/specs/065-stormcrown-enemies.md on `claude/065-stormcrown-enemies` (InsanityWolfz/Pipeline#76), stacked on
064's branch. It is a plan file because the spec spans flight, a new player status, the AI, population, drops, art and
sound: four enemies, well past 300 lines. It follows 061's plan closely.

Five slices, each committed with `npm run check` green before the next. Tests are listed first; the code follows them.

## Findings that shape the plan
- **Registration** is 061's list: a new kind needs cases in `EnemyDef` and `attackOf` (`src/data/enemies.ts`),
  `thinkOf` (`src/sim/enemyAi.ts`), `scaleAttack` (`src/sim/ringScale.ts`), `kindSummary` (`src/sim/summaryKinds.ts`),
  the scripted player's `zoneOf` (`tests/sim/bots.ts`), champion `names` (`src/data/champions.ts`),
  `ARMOR_DROP_CHANCE` (`src/data/gear.ts`), `ENEMY_REGIONS` (`src/data/sandbox.ts`, through a `STORMCROWN_ENEMIES`
  map), a rig in `src/data/art/enemies.ts` and anims in `ENEMY_ANIMS`.
- **Drops.** `REGION_4_PART` is the storm coil (`src/data/drops.ts`), and `STORMCROWN_DROPS` is 1 stormglass, 20%
  cinderite, the part at 4%; the schematic roll is everyone's (`rollSchematic`), and gear's 10% is `ARMOR_DROP_CHANCE`.
  `SCHEMATIC_REGIONS` gains region 4 for machine speed (061.16's reason: otherwise the roll has nothing to drop there).
- **Flight is new.** Every enemy moves through `moveBox` against its room's tiles and obstacles in `stepEnemies`.
  - A flier (`flies: true` on its def) moves with a new `flyBox` (`src/sim/flight.ts`): no tiles or obstacles; it stays
    on the room's grid and out of every boss arena's bounds in its room (the arenas' walls are what keep ground packs
    out; an arena's own posted enemies are inside already). Safe zones need nothing new: `keepOut` is by position.
  - Knockback adds to its move as for anyone, so it carries over walls too.
  - **Separation** (`separation.ts`): a flier and a walker never push each other (one is in the air); two fliers push
    apart with no terrain.
  - **Drops**: a flier killed over a rock would drop into it. `spawnDrops` gets the nearest walkable point (a new
    `landingPoint` in `drops.ts`) for a corpse on a solid tile.
  - Shots, Shards and Bursts already stop at walls by their own rules, so they reach it only where they reach it.
- **The hawk's dive is a lane run.** `laneRun.ts` (061) runs a locked lane and strikes once; a wall stops it only when
  `bumped`, which a flier never is. The dive reuses it, and `passesThrough` gains the diving hawk.
- **Trios.** Population picks members per spot (`spawn` in `population.ts`). A mite needs three spots: the picker takes
  a mite only with 3 or more spots left and gives it the next three. Enemies gain `trio` (the first mite's id, -1 for
  none) so a trio wakes together and `rollChampions` can make a whole trio champions. A helper `linkTrios` links mites
  in threes wherever a pack is made: population, site guards (`resetWorld`, `cache.ts`), the sandbox's pens and panel.
- **Death hooks** go in `removeDead` as 061's did (`emberDeaths.ts` pattern): a new `stormDeaths.ts` runs a killed
  mite's discharge (lightning damage on every other mite in its radius, never the player). `removeDead` already passes
  again while anything is left dead, so the chain runs on its own. Discharge hits use `damageType: 'lightning'` with no
  `chainLightning` (only a round's or Shard's hit arcs, in `combat.ts`'s `strike`).
- **A mite drops at a third.** `EnemyBase` gains `dropShare`: the whole drop (table, part, schematic and armor rolls)
  happens only that share of the time, so a trio drops like one enemy (the spec's decision).
- **The sentinel shares 064's strikes.** `strikes.ts` has the circle, the wait and the roll's i-frames; it gains a
  knockback. "One live circle" is `state.strikes.some(s => s.ownerId === e.id)`. Keep-distance is the tender's private
  `keepAway` (`tenderAi.ts`), moved to `aiCommon.ts` as `keepDistance` for both.
- **The player slow is new.** Player speed is computed in one place: `step.ts` passes `playerStats` (gear and talents)
  times `firingWalkScale` into `stepPlayer`, whose `MoveStats` carry the walk's scale and the roll's distance over
  `ROLL_TICKS`. The slow multiplies both there, so a roll keeps its ticks (never stops) but covers less ground.
  `PlayerState` gains `slow` and `slowTicks`; `createPlayer` resets them (a KO clears the slow). Render's player rig
  reads `vx`/`vy`, so it follows. `getState()` shows the slow (`summaryPlayer.ts`), and the HP bar draws it.
- **Ring 5 population.** `PopulatedRing` and `createPopulation` gain 5; `candidates` stops excluding it; the spawn waits
  for `gates.stormcrown`; `KEEP_OUT` adds the Crown Spire's bounds; ring 5 ground is limited to what's reachable from
  its ramps' tops (as 061.15 did for ring 4). `chanceByRing[5]` is 1 in 3. Pack size is 4–6, and the spawn cap's check
  uses the pack's largest size, so it holds.
- **Saves.** Enemies gain `trio` and the hawk's orbit side; the player gains the slow; strikes gain a knockback.
  `SAVE_VERSION` goes to 18 in slice 1, with the fixture regenerated as each slice adds fields.
- **Render.** 061's pattern: `stormEnemyArt.ts` (extras), `stormTelegraphs.ts` (the dive lane, the mite's pulse, the
  ram's cone; the sentinel's circle is 064's strike drawing), `stormEnemyFeel.ts` (sounds and bursts),
  `stormcrownEnemyAssets.ts` (looks and anims) and `stormcrownEnemySounds.ts`. The hawk draws lifted off its shadow,
  lower as it dives.

## Slice 1: flight and the thunderhawk
**Tests first**
- Data: the hawk's starting values; its wind-up at least `MIN_TELEGRAPH_TICKS`; references resolve; drops as listed.
- Flight: it crosses a wall line and a chasm that stop a walker; it never enters a boss arena's bounds or a safe zone;
  it and a walker don't push each other; it stays on the grid; a hawk killed over a rock drops on open ground.
- Orbit: it closes to about `orbit` px and circles, its heading turning at most `turnDegPerSec`.
- Dive: the line is locked at the wind-up's start through the player's feet; a sidestep dodges; one hit per dive with
  knockback; it dives through walls and enemies; then it recovers (climbs) and orbits again; cooldown from the wind-up.
- Homing: a homing round tracks a circling hawk to a hit where a straight round fired at the same point misses.
- Saves: the shape fixture at 18.

**Code**
- `src/data/stormcrownEnemies.ts` (the hawk, `STORMCROWN_DROPS`), `REGION_4_PART`; `src/sim/flight.ts`;
  `src/sim/hawkAi.ts`; the flier branches in `enemyAi.ts`, `separation.ts` and `drops.ts`; registration.
- Render: the hawk rig (idle, move, wind-up, dive, climb, hit, death), lifted; the dive lane (`drawLane`); sounds:
  screech (wind-up) and dive.

## Slice 2: static mites
**Tests first**
- A trio (`linkTrios`) wakes together.
- Contact: within 16 px it winds up a 30-tick pulse under it, then zaps a player inside for `damage` with knockback; a
  roll dodges; then it backs off for `recoverTicks`; cooldown 60 from the wind-up.
- Discharge: a killed mite hits every other mite within 40 px for 12 lightning; it chains through a line of mites; it
  never hurts the player or a non-mite.
- Drops at a third: over many seeds a mite drops about a third as often as a hawk.

**Code**
- `src/sim/miteAi.ts`, `src/sim/stormDeaths.ts`, the `trio` field and `linkTrios`, `dropShare` in `spawnDrops`.
- Render: the spark-beetle rig, the pulse telegraph, the discharge's bolts (064's arc drawing); sounds: buzz, discharge.

## Slice 3: the storm sentinel
**Tests first**
- It keeps between 200 and 300 px (the shared `keepDistance`; the tender's tests still pass).
- With a clear line and its cooldown ready, it calls a strike circle of 36 px on the player's feet, striking after 60
  ticks for 30 with 24 px knockback; a step out misses; a roll dodges; no clear line, no call.
- Never more than one live circle per sentinel.

**Code**
- `src/sim/sentinelAi.ts`; `keepDistance` in `aiCommon.ts`; knockback on `Strike`.
- Render: the rod-turret rig and its call; sound: the call.

## Slice 4: the gale ram and the player slow
**Tests first**
- The cone (70°, 96 px) is locked at the wind-up's start; a player inside takes 20, is pushed back 120 px and slowed;
  one outside or rolling isn't.
- The slow: walk speed and roll distance at 60% for 120 ticks, then back; a roll under it runs its whole time; a KO
  clears it; `getState()` shows it.

**Code**
- `src/sim/ramAi.ts`; the slow in `player.ts`, `movement.ts`/`step.ts`, `summaryPlayer.ts`.
- Render: the fan-faced rig, the cone, the gust's swirl; the slow's swirl on the player and its mark on the HP bar;
  sound: the gust.

## Slice 5: packs, guards, champions, drops, sandbox, measure and shots
**Tests first**
- **Packs** (a `populated()` helper like 061's): ring 5 holds 12 packs of 4–6 only after the gate opens; mites only in
  whole trios counted as 3; at most 1 sentinel and 1 ram; no other region's enemies in ring 5 and none of the four in
  rings 1–4; never in the Crown Spire or a safe zone.
- **The Weathervane's guards:** the fixed pack (2 hawks, a mite trio, a sentinel, a ram) blocks claiming until
  cleared, and never returns after the claim.
- **Champions:** about 1 in 3 ring 5 packs; a champion mite makes its whole trio champions.
- **Sandbox:** pens for the four (the mite's holds a trio); the panel spawns a trio per count for the mite.

**Code**
- `population.ts` ring 5 and the trio rule; `champions.ts`; `stormcrownSites.ts`; `sandbox.ts`; `gear.ts`.
- **Measure:** ring 5 packs in a new `stormPacks.measure.ts`, five entrances: a decent steel Lightning build and a
  stone build, recorded only.
- **e2e** (`stormcrownEnemies.spec.ts`): in the sandbox, sidestep a hawk's dive; kill a mite in a trio and see it
  chain; step out of a sentinel's circle; take a ram's gust and see the slow. Review shots in docs/review/065
  (`stormcrownEnemiesShots.spec.ts`, the spec's list).
- The spec's results and "Raised after the build" (065.N).

## Order and verification
- One builder works the slices in order on this branch, committing each with `npm run check` green and the touched
  e2e files passing, then pushing. CI runs the full suite.
- Then `/review` with the reviewer agent, fixes, and the wrapup.
