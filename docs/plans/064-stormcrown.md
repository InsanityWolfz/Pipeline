# 064 plan: the Stormcrown and the Conductor

Plan for docs/specs/064-stormcrown.md on `claude/064-stormcrown` (InsanityWolfz/Pipeline#75), stacked on 062's branch. A
plan file because, like 060's, it spans the world, a boss, ammo, talents and the foundry.

Eight vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the
code follows them. It follows 060's plan (docs/plans/060-emberworks.md) slice for slice.

## Findings that shape the plan

- **The world's centre moves again.** `WORLD_SHAPE.size` is 230 with the centre at {115, 115}
  (`src/data/worldShape.ts`). The Stormcrown's outer radius of 141 needs about 292 (2 × (141 + ragged edge + margin), the
  interview's "about 290"), so the centre goes to {146, 146}. Everything laid out on 053's grid already goes through
  `laidOut` / `WORLD_SHIFT` (from 053's centre 84), and everything 060 and 061 placed goes through `polar` round the
  centre, so one change to `SIZE` moves the whole map: `WORLD_SHIFT` becomes +62. `worldTileHash` subtracts the same
  shift, so every rock and tree keeps its look. Slice 1 proves the move against a new snapshot of offsets taken before
  it (`tests/sim/worldOffsets.ts`, extended to the Emberworks: its places, ramps, gate and generated ground).
- **The sandbox room holds the arenas at their world tiles** (`src/data/sandbox.ts`: height from the forum's bounds,
  width from the Anvil Hall's; `src/sim/sandboxRoom.ts`). The shift grows it by 31 each way (171 × 80 → about 171 × 111),
  as 060's did. The Crown Spire is placed at bearing 345°, 126 tiles out (in the world, just outside the Anvil Hall's
  ring), so at its world tiles it sits in the sandbox room's north-east, below the pens and clear of the spawn, the
  Warden's arena and the Anvil Hall, with no further growth.
- **Regions and rings are typed shut again.** `Ring` is `0..4` (`src/data/ringScale.ts`), `regionAt` returns `1|2|3`
  (`src/data/hollows.ts`), `RING_XP` has five entries, `PopulatedRing` is `1..4` (`src/data/population.ts`; ring 5 stays
  out of it, as ring 4 did before 061, so `candidates[ring]` never sees it). `inEmberworks` and `pastEmberworksBarrier`
  have no outer bound (`src/data/emberworks.ts`); they stop at 110, and `ringOf` (`src/data/overworld.ts`) returns 5 past
  the Stormcrown's barrier (060's "region starts at the barrier": `gateAt`).
- **The Emberworks' generator leaves everything past 110 cliff** (`src/sim/emberworksGen.ts` `ground()` skips it, and the
  Hollows' edge made it cliff). Its random draws depend only on tiles inside its ring, so a bigger grid draws the same.
  A new `stormcrownGen.ts` runs after it from its own salted stream and stamps its ramps through the Emberworks' outer
  edge, the way `stampEmberworks` does through the Hollows'.
- **Ramps and the gate are Emberworks-specific** (`rampTiles`, `rampGate`, `EMBERWORKS_GATE` read `EMBERWORKS.ramp`).
  They take the ramp shape as a parameter, so the Stormcrown's ramps share them. The gate is drawn tile-based by
  `src/render/ringCurtain.ts` and `EmberworksView`, which the Stormcrown's view reuses. Opening hooks into `stepGates`
  (`src/sim/tutorial.ts`) on `bossDefeats.includes('forgewright')`. `GateId` gains `stormcrown` (`src/data/rooms.ts`),
  and `SHOT_GATES` too.
- **Tiles.** New symbols in `TILE`: an iron rod and a cairn (stop feet and straight shots), a chasm (stops feet only).
  The ramps and the Sky-bridge's deck reuse `ramp` and `bridge`, drawn in the Stormcrown's look where they stand.
- **The roads** (`src/data/roads.ts`) gain Stormcrown roads branching from the Emberworks' (the Anvil Hall's, the
  Outpost Forge's and the spring's), climbing the ramps with an `up()` generalised to a ramp shape.
- **Ramps.** Three, at 320° (beside the Anvil Hall, so the Forgewright's hall opens straight onto the climb to the Crown
  Spire), 60° (off the Emberworks spring road) and 200° (past the Outpost Forge). The largest gap between them is
  60°–200°, so the Ley Spring is at 130°.
- **Places.** The Weathervane (claimable) overlooks the Rod Field (as the Ash Kilns overlook the Cinder Vents), off the
  60° ramp. The Broken Sky-bridge crosses a chasm that runs across the ring at 255° (as the Slag River does at 290°),
  off the 200° ramp. The Crown Spire at 345°, off the 320° ramp, its door facing the centre.
- **The stormglass port** goes at foundry tile (1, 5): the last free floor tile of the west wall's ports (ports stand at
  ty 3, 4, 6, 8–12; `src/data/claims.ts` `FIXTURES`).
- **Rods reuse 060's cycling nodes** (`NodeCycle` in `src/data/nodes.ts`, `phase` and `ventState` in
  `src/sim/nodes.ts`): idle = closed, warning, charged = open, with a strike event on the step into charged. The cycle
  data gets the spec's names for rods. Each node kind with a cycle can carry its own salt, so rods' seeded phases come
  from their own stream and the vents' phases are untouched. A strike hurts nothing.
- **Lightning hooks two places.** A direct hit or a Shard goes through `strike()` (`src/sim/combat.ts`); every Burst,
  Bomblet, mine and Pool-burst goes through `blastArea()` (`src/sim/blast.ts`). The chain starts at those two, after the
  hit lands, and its arcs call `damageEnemy` directly with an `arc` hit style: that bypasses the keystones, the Split and
  the Shield (which is checked only in `strike`), so arc hits never arc, split or set off on-hit talents, and Shields
  don't stop them. Arcs skip `immune` (burrowed, rising) and `plated` enemies and never hit boss parts. `DamageType`
  (`src/data/ammo.ts`) gains `lightning`.
- **New StatIds** `chains` and `chain-range` (`src/data/statDefs.ts`), read through `statOf(statusEmission('lightning'))`
  as Fire's are; `radius` is never touched, so no Burst widens. Lightning comes out of `reserved` in
  `src/data/keywords.ts`, with its template from data; it never enters `KEYWORD_DEBT`.
- **The Ley lane's last node is Splinter at step 2** (`src/data/talents.ts`). The two Lightning nodes fork from it at
  step 3, as 060's Fire nodes fork from Swift Arc. 23 nodes; `LEVEL_CAP` 19; `XP_CURVE` gains 950 and 1070 (its steps
  have grown by 10 more each time).
- **Boss parts are the Forgewright's bellows only.** `EnemyState.bellows` (`src/sim/enemies.ts`) and
  `partAt`/`partsNear`/`hitPart`/`partKey` (`src/sim/forgewrightParts.ts`) are routed in `strike`, `blastArea` and
  `melee.ts`. The field becomes `parts`, and a small dispatcher (`src/sim/bossParts.ts`) sends each call to the
  Forgewright's bellows or the Conductor's rods by the enemy's kind. The rods stand at fixed arena points (data), not
  relative to the boss. That renames a saved field, so `SAVE_VERSION` goes to 16 (15 is 063's, on its own branch).
- **Arenas** are generalised already (`ARENAS`, `BOSS_ARENAS`, `arenaOf`, `arenaOfAltar` in `src/data/arenas.ts`); the
  Crown Spire joins them, and `BossBar` picks by arena.
- **Homing** (`src/sim/homing.ts`) drops a lost target for good. The Conductor's blink is an instant move, so a round
  locked on him keeps steering at his new place. The spec's re-lock is a new rule: a homing round with no target that
  comes within its lock radius of an enemy whose def says `homingRelock` (the Conductor) locks onto it.
- **Ground strikes.** The storm call's circles strike once after a delay, unlike the flood pools' beats
  (`src/sim/floodPools.ts`), so they are a small new list, `state.strikes` (`src/sim/strikes.ts`), which 065's storm
  sentinel can share.
- **The fifth entrance goes at tx 15** (floor below it at (15, 1)). The intake's count-agnostic since 060, apart from
  `INTAKE_INLETS` and `FLARE.half` in `src/data/art/intake.ts`, the gauge colours, `TUBE_SLOT_FRAMES`
  (`src/data/assets.ts`), `SANDBOX.loadout`, and tests and e2e specs with literal fours (060's list: entrances, research,
  volley lanes, tutorial, sandbox, spread, tubeLink, firing, combatPage, fourthEntrance).
- **The minimap** at 0.43 would be about 126 px wide at 292 tiles; about 0.34 keeps it in its band
  (`tests/data/minimapTerrain.test.ts`, 060.7).
- **The end card** (`src/data/endCard.ts`) and e2e specs that fell every enemy spare the boss whose kill ends the demo
  (060.37); the Conductor joins the spared bosses.

## Slice 1: the world grows (a pure move)
**Tests first**
- A new offsets snapshot (`tests/sim/worldOffsets.json`) taken before the move, now covering the Emberworks: every
  landmark, node, pack, road, ley line, pylon, arena, the Hollows' and the Emberworks' places, ramp and gate tiles, and the
  generated ground out to the Emberworks' edge.
- `worldMove.test.ts`: size 292, centre {146, 146}, `WORLD_SHIFT` +62; every offset kept; the ground the same.
- `minimapTerrain.test.ts`: the minimap stays in its pixel band.

**Code**
- `WORLD_SHAPE.size` 292; `MINIMAP.scale` about 0.34; any literal tile that doesn't go through the shift.

## Slice 2: the Stormcrown ring and its barrier
**Tests first**
- `ringOf` is 5 past the Stormcrown's barrier and 4 just below it; `RING_SCALE[5]` ×10/×10; `RING_XP[5]` 10;
  `regionAt` 4; `inEmberworks` false past 110.
- No packs spawn in ring 5.
- The `stormcrown` gate blocks feet, enemies and every projectile, opens on the Forgewright's first kill only, and stays
  open after a KO.
- The final cliff edge runs past 141 with no bare wall; rods and cairns stop feet and shots, chasms feet only.
- Flood fill: the whole Stormcrown is reachable from each ramp once open, and nothing past the barrier while shut.
- e2e (`stormcrown.spec.ts`): in `?playtest` after the Forgewright's defeat, walk up a Stormcrown ramp.

**Code**
- `worldShape.ts` `stormcrown: 141`; `src/data/stormcrown.ts` (salt, edge, rods, cairns, chasms, ramps, gate, places);
  `src/sim/stormcrownGen.ts`; the ramp helpers take a ramp shape.
- `TILE` symbols; the `stormcrown` gate in `GateId`, `SHOT_GATES`, `createGates`, `stepGates` and the save; `summary.ts`.
- `ringScale.ts`, `leveling.ts`, `regionAt`, `ringOf`.
- Roads up the ramps.
- Render: Stormcrown ground (slate rock, violet glow, cyan ley) in the ground pass, its tile frames, minimap colours,
  the barrier across its ramps (the Emberworks' view, reused), the palette's storm colours.
- `SAVE_VERSION` 16 (the history comment says 15 is 063's).

## Slice 3: the places and stormglass
**Tests first**
- Data: every new landmark and pylon is in ring 5; the Weathervane has a ley-line route; placement rules for a new
  `rod-field` placement; references resolve.
- Sim (`stormRods.test.ts`, `stormcrownSites.test.ts`):
  - A rod cycles idle 900, warning 90, strike, charged 240, from its own seeded phase on its own stream (the vents'
    phases unchanged); E gathers only while charged; a strike hurts nobody and records a strike event.
  - Claiming the Weathervane adds the stormglass port at (1, 5) and supplies it; fast travel; first-discovery XP.
  - The chasm blocks feet but not shots; the Sky-bridge's deck is walkable.
  - The Ley Spring heals; it is on the far side of the ring from the nearest ramp.
  - The Crown Spire's walls and door follow 055's rules (sealed until the barrier is down).
- Reachability includes every new landmark.

**Code**
- `src/data/stormcrownSites.ts`: the Rod Field, the Weathervane, the Sky-bridge and its chasm, the Crown Spire's walls,
  door and six rod sockets; the spring in `springs.ts`.
- `stormglass` item and icon; `storm-rod` node with its cycle; the strike event; the port fixture; landmark XP and
  markers; ley line route.
- Art: rods in their four states, cairns, chasm and bridge, the spire's walls. Sound: the rod strike.

## Slice 4: the Lightning rune and the chain
**Tests first**
- Data: `lightning` makes its rounds on every family (and every tier); `lightning-rune` costs 1 stormglass per 4; its
  rows show after stormglass is carried; hand-crafting a lightning round unlocks it; Lightning is live with a
  digit-free template; tag, keyword and reserved-word tests updated (Lightning in the expected-failure list of the
  keyword rule for one commit only, never in `KEYWORD_DEBT`).
- Sim (`lightning.test.ts`):
  - A hit arcs to the nearest living enemy within 96 px, for half the hit's damage, then on, two arcs.
  - Never the same enemy twice; skips burrowed, rising and plated; arcs pass a Shield.
  - A Burst or Bomblet chains once, from the enemy nearest its centre; each Shard chains.
  - Arc hits never arc, Split or trigger keystones; the tier reaches arcs.
- e2e (`lightning.spec.ts`): a lightning round arcs across a sandbox pen.

**Code**
- `tags.ts` `lightning` and `LIGHTNING` (`chainRange`, `chainShare`, `chains`); `stages.ts` `lightning-rune`;
  `DamageType` `lightning`; build bar, recipes, reveal.
- `src/sim/lightning.ts`; hooks in `strike` and `blastArea`; an `arcs` event.
- `keywords.ts` Lightning live; legibility and round summaries.
- Art: `TAG_ART.lightning`, round looks, the stage machine, the arc bolt (render draws a jagged cyan-white bolt per arc
  event). Sound: the arc crackle.

## Slice 5: Lightning's two talents
**Tests first**
- `talents.test.ts`: 23 nodes, the two new ids in the Ley lane, links valid.
- `chains` and `chain-range` are allowed and read only by the chain; +1 chain and +1 tile change it; a Burst's radius
  doesn't move.
- `LEVEL_CAP` 19 with 18 curve steps.
- The keyword rule passes for Lightning with no expected failure.

**Code**
- `talents.ts` two nodes forking from Splinter; `statDefs.ts`; `lightning.ts` reads them; `leveling.ts`; talent icons.

## Slice 6: the fifth entrance
**Tests first**
- `entrance-5` costs a `conductor-core` and needs `entrance-4`.
- Five fed entrances fire at 0°, ±15° and ±30°.
- Each test and e2e spec with a literal four is updated.
- e2e (`fifthEntrance.spec.ts`): restore the fifth entrance and fire a five-lane volley.

**Code**
- `foundry.ts` fifth entrance (tx 15, lane 4, capped); `research.ts` `entrance-5`.
- `art/intake.ts` five inlets; the HUD tube slot's fifth frame; `SANDBOX.loadout` five.
- `conductor-core` and `storm-coil` items and icons.

## Slice 7: the Conductor
**Tests first** (`conductor*.test.ts`, on a `spire()` fixture like `hall()`)
- **Wake and reset:** it wakes on entering the Crown Spire; door, KO, leash and reset follow 055 and the Forgewright.
- **Rods:** six at the sockets, 200 health each, hit by arrows, Shards, Bursts and punches (part routing); a broken rod
  regrows at 1200 ticks; a broken rod is shot through.
- **Blink:** every 240 ticks, a seeded pick among the other standing rods, never its own; the rod's 45-tick warning, then
  the move; a straight shot at its old spot misses; a homing round locked on it follows; one with no target re-locks
  within its lock radius; grounded below 2 standing rods; enraged, 150 ticks.
- **Attacks:** the lash line locked at its wind-up's start, 50 damage with knockback on the line and none off it; the
  storm call's 3 circles, 40 damage each after 60 ticks; the rod chain along neighbouring standing rods only, 45 on a
  line; picked in data order with cooldowns; every telegraph at least `MIN_TELEGRAPH_TICKS`.
- **Drops, XP and the altar:** drops, XP 800, the first kill, the altar's summon for 8 stormglass.
- **No ring scaling** in ring 5.

**Code**
- `src/data/conductor.ts` (a new `kind`), `EnemyDef` union, `thinkOf`; `src/sim/conductorAi.ts`,
  `src/sim/conductorRods.ts`, `src/sim/bossParts.ts`, `src/sim/strikes.ts`; `homing.ts` re-lock.
- `ARENAS` gains the Crown Spire; `CONDUCTOR_XP`; events and feel in `stormcrownFeel.ts`.
- Render: the rig (idle, blink out and in, lash, call, chain, hit, death), the arena rods (standing, broken,
  regrowing) with small bars, the target rod's flash, telegraphs for the lash, the call and the chain, the chain's
  lightning, the boss bar.
- Sounds: the blink, the lash, the storm call, the rod chain.
- Measure: `tests/measure/conductor.measure.ts`, a four-entrance homing-bolt bot and a no-homing bot, recorded only.

## Slice 8: goals, end card, sandbox, shots
**Tests first**
- The `m3` goal chain in order after 062's goals, each check met in a scripted run.
- The end card fires on the Conductor's first kill, not the Forgewright's.
- The sandbox has the Crown Spire, the new items and lightning rounds, the Conductor in its spawn panel and ring 5.
- e2e (`conductorSandbox.spec.ts`): break rods to ground the Conductor in the sandbox.

**Code**
- `objectives.ts` `m3`; waypoint targets.
- `endCard.ts` boss `conductor`; e2e specs spare it.
- `SANDBOX_ARENAS`, `REGION_RINGS`, `SANDBOX.rings`.
- Review shots in docs/review/064 (the spec's list).
- The spec's results and raised items.

## Order, agents and verification
- One builder agent works the slices in order, on this branch, committing after each slice with `npm run check` green
  and the touched e2e files passing, pushing after each.
- Slices 1–3 change the world, so they come first. Slices 4–6 are independent of each other. Slice 7 needs 3 (the
  spire) and 6 (the core's use).
- After slice 8: `/verify` (CI runs the full suite), `/review`, fixes, wrapup, then the playtest.
