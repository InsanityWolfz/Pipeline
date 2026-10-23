# 060 plan: the Emberworks and the Forgewright

Plan for docs/specs/060-emberworks.md on `claude/060-emberworks` (InsanityWolfz/Pipeline#70). A plan file because it spans the world, a boss, ammo, talents and the foundry, well past 300 lines.

Eight vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code follows them.

## Findings that shape the plan

- **The world's centre moves.** `WORLD_SHAPE.centre` is a fixed {84, 84}. Growing the grid from 168 to about 230 tiles moves the centre to {115, 115}, so every hand-placed tile shifts by +31 in x and y. That covers roads, ley-line routes, the Hollows (crossing, start, forum), the Hollows sites, landmarks, springs, the grotto, the home area and test literals. Slice 1 does this as a pure move with no new content: one `WORLD_SHIFT` derived from the centre, applied through `place.ts`'s `shiftTile`, `shiftRect` and `shiftLandmark` (or literals rewritten where a shift can't reach), so nothing changes relative to the centre.
- **`inHollows` has no outer bound** (`fromCentre >= 48`). It must stop at 79, or the Emberworks reads as the Hollows. Its callers: `regionAt`, `minimapColor`, `tileLook`, `ground.ts`, `hollowsGround.ts` and `OverworldView`.
- **Rings and regions are typed shut.** `Ring` is `0|1|2|3`, `PopulatedRing` is `1|2|3`, `regionAt` returns `1|2`, and `LandmarkDef.ring` and `SpringDef.ring` are `1|2|3`. Ring 4 stays out of `PopulatedRing`; `population.ts`'s `candidates[ring]` would crash on it otherwise.
- **The Hollows' edge generator** (`hollowsGen.ts` `edge()`) makes everything past 79 cliff. The Emberworks generator runs after it, carves the ramps, and makes its own ragged edge past its outer radius.
- **The barrier is drawn as a circle** (`HollowsView.drawBarrier`). The Emberworks gate is a set of ramp-top tiles, so it needs tile-based drawing. Opening hooks into `stepGates` on `state.bossDefeats.includes('bulwark')`.
- **The arena is hard-coded.** `arenaOf` and `arenaOfAltar` return only `HOLLOWS.arena`. They are generalised to look across `ARENAS`, and so is `BossBar`'s pick.
- **No enemy has sub-parts yet.** The bellows are parts of the Forgewright's state, each with a hurtbox and health. A `partAt(e, x, y)` check routes hits in `strike` (`combat.ts`), `blastArea` (`blast.ts`) and `melee.ts`. Plating replaces `shieldBlocks` for this boss and also covers blasts and burn ticks. A part hit damages the part and passes Cold and Fire's statuses to the parent.
- **One hook covers every Fire source.** `damageEnemy` (`enemies.ts`) already chills on cold damage for direct hits, Shards, Bursts, Bomblets, mines and Pool-bursts. Ignite goes beside it. The burn tick runs in its own pass, not inside `tickCold`'s early-outs; it never re-ignites and never hit-stops or plays a sound. The name `burning` is taken (054's Pool arrows), so it is `burn*`.
- **A stat would collide.** A `radius` line scoped Fire would also widen fire bombs' bursts. The spread talent uses a new StatId, `spread-radius`; the duration talent's `duration` is safe.
- **Fire rows show only after cinderite is carried.** `shownAfter` exists only on recipes. Stages gain an optional `shownAfter`, `REVEALING_ITEMS` covers stages, and `taggedKnown` checks `found`.
- **The Fire rune has one build-bar piece, in Arrows.** That is where the frost rune is (`stageBase` is the tag's first family). The spec's "in each family's build bar group like the frost rune" means the same, and the spec text is corrected to say one piece.
- **The fourth entrance goes at tx 14.** tx 9–10 is the sealed wing. Code that assumes three entrances or a middle one:
  - `intakeAnchor` (`entrances[1]`, throws), `art/intake.ts` (`INTAKE_INLETS`, `FLARE.half`, gauge `xs`), `entrances[floor(len/2)]` in `research.ts` and `foundryMap.ts`
  - `TUBE_SLOT_FRAMES` (3), `SANDBOX.loadout` (3)
  - about ten tests with literal threes
  - the guided build's conduit through (14, 1)
- **The cinderite port** goes at tx 1, ty 9 on the west wall: floor, between the ports at ty 8 and 10.
- **The minimap** at scale 0.6 would be 138 px wide; about 0.45 keeps it in its band (`minimapTerrain.test.ts`).
- **The flood's damage** lands once a second, as one hit every 60 ticks, which suits `HIT_INVULN_TICKS` (30).

## Slice 1: the world grows (a pure move)
**Tests first**
- `roundWorld.test.ts`, `overworld.test.ts` and `hollows.test.ts`: every landmark, node, road waypoint, pylon and arena tile sits at the same offset from the centre as on main (a snapshot of offsets taken before the move).
- The existing reachability, ring, barrier and population tests pass unchanged, apart from literal coordinates.
- `minimapTerrain.test.ts`: the minimap stays in its pixel band.

**Code**
- `WORLD_SHAPE.size` becomes about 230 (exact size: `emberworks` outer radius + ragged edge + margin), with the centre at the grid's middle and `WORLD_SHIFT` derived from it.
- Literal tiles go through the shift.
- `MINIMAP.scale` becomes about 0.45.
- The ground beyond 79 stays cliff for now.

## Slice 2: the Emberworks ring and its barrier
**Tests first**
- `ringOf` returns 4 for r in [79, 110).
- `RING_SCALE[4]` is ×4/×4, and `RING_XP[4]` is 4.
- `regionAt` returns 3.
- `inHollows` is false past 79.
- No packs spawn in ring 4.
- The `emberworks` gate blocks feet, enemies and every projectile, opens on the Bulwark's first kill only, and stays open after a KO.
- The cliff edge runs past the outer radius, with no bare wall.
- Flood fill: every Emberworks tile is reachable from each ramp once open, and nothing past 79 is reachable while shut.
- e2e: in the sandbox, after the Bulwark's defeat, walk up a ramp.

**Code**
- `worldShape.ts`: `emberworks` radius and `ramps` bearings.
- New `emberworks.ts` data (salt, edge, terrace and kiln settings, ramp tiles, gate tiles).
- `emberworksGen.ts`, run after `generateHollows`.
- New TILE symbols: `kiln` and `chimney` (block feet and shots), `slag` (blocks feet; shots pass), `bridge` and `ramp`.
- The `GateId` `emberworks`; `createGates`, `stepGates`, the save shape and `summary.ts`.
- Roads up the ramps.
- Ground paint for the Emberworks (ash ground, rust glow) in the overworld ground pass, its minimap colours, and tile-based barrier drawing and collapse reusing the Hollows' look and sound.
- `SAVE_VERSION` 13.

## Slice 3: the places and cinderite
**Tests first**
- Data: every new landmark and pylon is in ring 4; the Ash Kilns has a ley-line route; placement rules hold for a new `vent` placement; references resolve.
- Sim:
  - A vent cycles through closed, warning and open, from per-vent seeded phases, and E gathers only while it's open.
  - Claiming the Ash Kilns adds the cinderite port at (1, 9) and supplies it; it joins fast travel; first-discovery XP is given.
  - The Slag River blocks feet but not shots; the bridges are walkable.
  - The Outpost Forge holds a Ruined Cache.
  - The Ley Spring heals.
- Reachability includes every new landmark.

**Code**
- `emberworksSites.ts`: the Cinder Vents, the Ash Kilns, the Slag River, the Outpost Forge, the spring, and the Anvil Hall's walls and door (the boss comes in slice 7).
- `cinderite` item and icon; `cinder-vent` node with its cycle data and a sim tick; `TARGET_LIFT` entry; the port fixture.
- Art: vents in their three states, kilns, chimneys, slag and bridges, the outpost forge.
- Sound: vent flare.

## Slice 4: the Fire rune and burn
**Tests first**
- Data:
  - `fire` makes its 7 rounds.
  - `fire-rune` costs 1 cinderite per 4.
  - Fire is live, with its template rendered with no digits.
  - The keyword rule passes for Fire (after slice 5's talents; until then Fire sits in the test's expected-failure list for one commit only, never in `KEYWORD_DEBT`).
  - The keyword, tag and reserved-word tests are updated.
- Sim (`fire.test.ts`):
  - Ignite on direct hits, Shards, Bursts, Bomblets and mines.
  - 25% of the hit each second for 3 s; a refresh keeps the larger damage per second; no stacking.
  - Spread on death within 64 px, at full duration and the same damage per second, chaining across ticks.
  - Burn ticks never re-ignite.
  - The fire rune's rows show once cinderite has been carried; hand-crafting a fire round unlocks the rune.
- e2e: a fire bomb burns a sandbox pen, and burn numbers show.

**Code**
- `tags.ts` `fire` plus the `FIRE` numbers; `stages.ts` `fire-rune` with `shownAfter`; stage reveal in `REVEALING_ITEMS` and `taggedKnown`; `BUILD_BAR` and `MACHINE_IDS`.
- `sim/fire.ts` (`igniteEnemy`, `tickBurn`, `spreadBurns`); `EnemyState` fields `burnTicks`, `burnDps` and `burnLeft`; the hook beside the chill in `damageEnemy`; spread in `removeDead`.
- A burn-tick hit marker for render.
- `keywords.ts` Fire live; `legibility` and `describeRound` summary extras; `describeChanges` and enemy chips.
- Art: `TAG_ART.fire`, `ROUND_LOOKS`, `SHARD_TRAILS`, `BURST_TINTS`, `ENTRANCE_GAUGE_COLORS`, `hitFire` particles, flames on burning enemies (an overlay like `drawIce`).
- Sound: burn crackle.

## Slice 5: Fire's two talents
**Tests first**
- `talents.test.ts`: 21 nodes, the two new ids in the Bombs lane, links valid.
- The new `spread-radius` StatId is allowed and read only by the spread.
- The +50% duration and +1 tile spread change the burn.
- `LEVEL_CAP` is 17 with 16 curve steps.
- The keyword rule now passes for Fire with no expected-failure entry.

**Code**
- `talents.ts`: two nodes (b4 at step 3, b5 offset beside it or at a fifth step; checked on the panel).
- `statDefs.ts` `spread-radius`; `fire.ts` reads `duration` and `spread-radius` via `statOf(statusEmission('fire'))`.
- `leveling.ts` cap and curve.
- Talent art for the two icons.

## Slice 6: the fourth entrance
**Tests first**
- `entrance-4` costs a `forgewright-core` and needs `entrance-3`.
- Four fed entrances fire at ±7.5° and ±22.5°.
- Each test with a literal three is updated (the list above).
- The guided build still completes with the new entrance at (14, 0).
- e2e: restore the fourth entrance in the sandbox and fire a four-lane volley.

**Code**
- `foundry.ts` fourth entrance (tx 14, lane 3, capped); `research.ts` `entrance-4`.
- `intakeAnchor` and the pipe's middle made count-agnostic.
- `art/intake.ts` drawn for four inlets; the HUD tube slot's fourth frame; `SANDBOX.loadout` four entries.
- `forgewright-core` and `forge-rivet` items and icons.

## Slice 7: the Forgewright
**Tests first** (`forgewright*.test.ts`, on a `hall()` fixture like `forum()`)
- **Wake and reset:** it wakes on entering the Anvil Hall through the door, and the door, KO and reset rules follow 055.
- **Plating:** while not vented, arrows, Shards, Bursts, Bomblets, mines, punches and burn ticks deal it nothing and record `blocked`.
- **Bellows:**
  - Placement: 2 tiles each side, square to its facing, turning with it.
  - Part hits damage the part and chill or burn the parent.
  - A broken bellows patches at 240 ticks.
  - Both broken at once vents it: a 360-tick stagger, all damage lands, heat goes to 0, and the bellows come back whole.
  - One then the other within 4 s vents it; past 4 s it doesn't.
  - A three-lane fan from about 7–8 tiles breaks both.
- **Heat:** fills over 1,800 ticks; Chill stacks slow it by `slowPerStack` each; enraged it fills 1.5× as fast.
- **Attacks:**
  - Forge Flood: 90-tick wind-up on the player's half, pools for 300 ticks at 20 damage a second, then heat resets.
  - Slam: front circle, 54-tick wind-up, 45 damage with knockback.
  - Ember spray: 7 embers in a 45° cone after 45 ticks.
  - Every telegraph is at least `MIN_TELEGRAPH_TICKS`.
- **Drops, XP and the altar:** drops, XP (500), the first kill recorded, the altar's summon for 8 cinderite.
- **No ring scaling:** ring 4's ×4 never applies.

**Code**
- `data/forgewright.ts` (a new `kind`); `EnemyDef` union, `attackOf`, `thinkOf`.
- `sim/forgewrightAi.ts` and `sim/forgewrightParts.ts` (bellows, plating, venting), each under 300 lines.
- Heat in its own step beside the AI, like the Bulwark's wave.
- Embers through `orbs.ts` with a per-orb direction.
- Flood pools as a new player-hurting hazard list (`sim/floodPools.ts`).
- `partAt` routing in `strike`, `blastArea` and `melee`.
- `ARENAS` gains the Anvil Hall; `arenaOf` and `arenaOfAltar` generalised.
- Events and `hollowsFeel`-style feel in a new `emberworksFeel.ts`.
- **Render:**
  - The rig with its poses and anims; bellows whole, broken and patching; plated sparks.
  - `BossBar` gains the blue shield state and the heat gauge.
  - Telegraphs for the slam, spray and flood; flood pools.
- **Sounds:** bellows break, vent hiss, slam, spray, flood roar.
- Measure: `tests/measure/forgewright.measure.ts` with a decent three-entrance bot, recorded only.

## Slice 8: goals, end card, sandbox, shots
**Tests first**
- The `m2` goal chain in order after "Feed all three entrances", each check met in a scripted run.
- The end card fires on the Forgewright's first kill and not on the Bulwark's.
- The sandbox has the Anvil Hall, the new items and fire rounds, and the Forgewright in spawn.

**Code**
- `objectives.ts` `m2` and its steps; the waypoint target for the Emberworks ramps.
- `endCard.ts` boss `forgewright`.
- `SANDBOX_ARENAS` and `REGION_RINGS`.
- Review shots in docs/review/060 (the spec's list).
- The spec's results and raised items.

## Order, agents and verification
- One builder agent works the slices in order, on this branch, committing after each slice with `npm run check` green and the touched e2e files passing.
- Slices 1–3 change the world, so they come first. Slices 4–6 are independent of each other. Slice 7 needs 3 (the hall) and 6 (the core's use).
- After slice 8: `/verify` (CI runs the full suite), `/review` with the reviewer agent, fixes, wrapup, then the playtest.
- Rough size: about 3,000–4,000 lines with art and tests. An ETA comes from 034's history once slice 1 lands.
