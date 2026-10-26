# 064: Region 4: the Stormcrown and the Conductor
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

Plan pre-approved by Shaun, 2026-10-26.

Drafted from Shaun's Region 4 interview (docs/brainstorm/2026-10-26-region-4-interview.md), 2026-10-26.

## Goal
The Forgewright's first kill opens the highest ring: the Stormcrown, rod-studded heights where the ley lines surface as weather. It is ×10 enemy health and damage, a real wall.

In the Stormcrown the player:
- harvests stormglass from rods in the moments after lightning strikes them;
- claims the Weathervane's pylon;
- unlocks the **Lightning rune**: a hit arcs to two more enemies;
- fights the **Conductor**, who blinks between six rods and is answered by homing ammo and by breaking his rods.

His core restores the fifth and last intake entrance: the design's five-arrow spread.

This is the first of three Region 4 specs. 065 brings the region's four enemies; until then the Stormcrown has no packs. 066 brings stormsteel.

## Design references
- docs/design.md:
  - "World, regions, ley lines, bosses": difficulty by distance; "Boss gates"; the world is round, each region a ring.
  - "The Foundry": "each boss core restores one more: ... later bosses' the 4th and 5th."
  - "Combat":
    - "Lightning chains between targets."
    - "Bosses are engineering puzzles": "evasive movement (ley-guided ammo)", with raw throughput always a slower but valid answer.
    - "Keywords": a new keyword needs a template, numbers, a source and two payoffs.
    - "Skill tree": it grows with each region.
  - "Theme rule".
- docs/specs/060-emberworks.md: the region pattern this follows, including vents (here, rods), the barrier on a boss kill, the arena with door and altar, the fourth entrance, and the world growing round its centre.
- docs/specs/061-emberworks-enemies.md: the shared ground hazards. docs/specs/062-material-tiers.md: tiers.

## Acceptance criteria

**The ring (data, sim)**
- [x] The world grows by a fifth ring, the Stormcrown, as wide as the Emberworks (31 tiles). It runs from the Emberworks' outer radius out to about 141 tiles from the foundry's door. The world grows round its centre as in 060: one shift, every existing tile at the same offset from the centre, and an offsets snapshot test.
- [x] Ramps rise through the Emberworks' outer cliff edge (count and bearings in data). Past the Stormcrown is a final ragged cliff edge.
- [x] Terrain is generated from the seed with Stormcrown settings: wind-scoured rock, iron rods and cairns that block feet and straight shots, chasms that block feet only, and a slate-violet glow with cyan ley.
- [x] **Ring 5:** `ringOf` returns 5 past the barrier (060's "region starts at the barrier" rule). `RING_SCALE[5]` is ×10 health and ×10 damage (Shaun), and `RING_XP[5]` is 10. It is region 4.
- [x] The roads run up the ramps to every landmark. Every landmark is reachable on foot from each ramp once the barrier is down (flood-fill test).
- [x] No packs spawn here until 065.

**The barrier (sim, render)**
- [x] A `stormcrown` gate seals each ramp's top, drawn as the earlier barriers. The Forgewright's first kill drops it for good.

**Places (data)**
Names are placeholders.
- [x] **The Rod Field:** a resource site of stormglass rods.
- [x] **The Weathervane:** a claimable site with a pylon (no guards until 065). It supplies stormglass to a new port on the foundry's wall.
- [x] **The Broken Sky-bridge:** a ruined builders' bridge arching over a chasm, crossable on its deck.
- [x] **A Ley Spring** on the far side of the ring from the nearest ramp.
- [x] **The Crown Spire:** the Conductor's arena, walled, with a door and altar (055's rules), ringed by six rod sockets.

**Stormglass (data, sim)**
- [x] `stormglass`, a raw, is gathered with E at `storm-rod` nodes, and only while a rod is charged.
  - A rod cycles in data: idle for `idleTicks` (start 900), then a flashing warning for `warnTicks` (start 90), then a lightning strike, then charged for `chargedTicks` (start 240).
  - Each rod starts its cycle at its own seeded point, on its own salted rng stream.
- [x] A strike never hurts the player (as 060's vents).
- [x] Stormglass also drops from the Conductor.

**The Lightning rune (data, sim)**
- [x] A new element tag `lightning` (prefix "Lightning", damage type `lightning`) for every family. A new stage, the Lightning rune: 1 stormglass per batch of 4, one build-bar piece in the Arrows group like the frost and fire runes.
  - It is unlocked by hand-crafting a lightning round.
  - Its rows show once stormglass has been carried.
- [x] **Chain:** each lightning hit arcs on.
  - The direct hit, each Shard, and each Burst or Bomblet from the enemy nearest its centre arc to the nearest living enemy within `chainRange` (start 96 px, 3 tiles) that this chain hasn't hit.
  - That arc deals `chainShare` (start 0.5) of the hit's damage, then arcs again from there, up to `chains` (start 2) arcs.
  - Arcs skip burrowed, immune and plated enemies. A Shield doesn't stop an arc, because it comes from beside, not the front.
  - Arc hits never arc again on their own, never Split, and never set off talents that trigger on a round's hit.
  - Each arc shows as a jagged cyan-white bolt.
- [x] Lightning's keyword becomes live with its template generated from data. The tier multiplier (062) reaches arcs through the hit's damage.

**Lightning's payoffs: two talents (data)**
- [x] Two new minor talent nodes in the Ley lane:
  - "Lightning: +1 chain", on a new StatId `chains`;
  - "Lightning: +1 tile chain range", on a new StatId `chain-range`, so it never widens a Burst.
- [x] The tree has 23 nodes. `LEVEL_CAP` is 19, and `XP_CURVE` gains two steps.
- [x] The keyword rule passes for Lightning with no `KEYWORD_DEBT` entry.

**The Conductor (data, sim)**
All numbers are starting values in data, tuned in playtest. Bosses keep their own numbers; ring 5's ×10 never applies.
- [x] `conductor`: a boss with 6,000 health, waking on entering the Crown Spire by 055's rules. It stands at a rod and faces the player.
- [x] **Rods:** six arena rods, each with its own hurtbox and health bar (200 health). A broken rod regrows after `rodRegrowTicks` (start 1200, 20 s).
- [x] **Blink:** every `blinkTicks` (start 240), it picks another standing rod, from the seeded rng and never its own. That rod flashes for `blinkWarnTicks` (start 45, 0.75 s), then the Conductor vanishes and appears there.
  - Shots in flight toward its old place miss.
  - A homing round that has lost its target re-locks onto it within its lock radius, by the homing rules.
  - With fewer than 2 standing rods it is **grounded**: it can't blink until a rod regrows.
- [x] **Arc lash:** a red line from its rod to the player, locked at the wind-up's start (45 ticks), then a lash along it: 50 damage with knockback to a player on it.
- [x] **Storm call:** 3 red circles of 40 px land on and around the player, each striking after 60 ticks for 40 damage.
- [x] **Rod chain:** red lines between neighbouring standing rods for a 60-tick wind-up, then lightning runs along them for 30 ticks, dealing 45 to a player on a line.
- [x] It picks its attacks in data order with cooldowns. Every telegraph is at least `MIN_TELEGRAPH_TICKS`.
- [x] **Enrage** below half health: `blinkTicks` becomes 150.
- [x] Running away, KOs, the first kill, resets, XP (`CONDUCTOR_XP`, start 800) and the altar (refights for 8 stormglass) follow the Forgewright's rules.
- [x] **Drops:** 1 `conductor-core`, 6–8 `stormglass`, 1–2 `storm-coil`.

**The fifth entrance (data, sim, render)**
- [x] The intake grows to five entrances, the new one at foundry tile tx 15, capped. `entrance-5` costs 1 `conductor-core` and needs `entrance-4`.
- [x] Five fed entrances fire a symmetric fan by 048's rule: 0°, ±15°, ±30°.
- [x] The intake art, the HUD tube slot and the sandbox loadout show five entrances.

**Items (data)**
- [x] `stormglass` (raw), `conductor-core` (core, research) and `storm-coil` (Region 4's machine part, research), each with an icon and an inventory group.

**Goals and the end card (data)**
- [x] After 062's goals, milestone `m3`:
  1. "Reach the Stormcrown"
  2. "Gather stormglass at the Rod Field"
  3. "Claim the Weathervane's pylon"
  4. "Craft a lightning round (C)"
  5. "Defeat the Conductor"
  6. "Restore the intake's fifth entrance (E with the Conductor core)"
  7. "Feed all five entrances"
- [x] The end-of-demo card moves to the Conductor's first kill.

**Sandbox (044), saves**
- [x] The sandbox gives the new items and lightning rounds, lists the Conductor, and has the Crown Spire. Its spawn panel offers ring 5.
- [x] `SAVE_VERSION` goes up by one.

**Art and sound**
- [x] **Vector art in the house style:**
  - Stormcrown ground, rods, cairns, chasms and ramps; the Sky-bridge.
  - Storm rods: idle, warning, striking and charged.
  - Icons for stormglass, the storm coil and the Conductor core; the Lightning rune machine; lightning round icons and their in-flight looks; the arc bolt.
  - The Conductor rig: idle, blink out and in, lash, call, chain, hit and death.
  - The arena rods (standing, broken, regrowing); the five-entrance intake.
- [x] **Synth sounds:** a rod strike, a lightning arc crackle, the blink, the lash, the storm call and the rod chain.

**Measure and review shots**
- [x] `npm run measure` gains a Conductor target, recorded and not tuned: a decent four-entrance homing-bolt build kills it in about 90–150 s with at most 2 KOs over 20 seeds. Also record a no-homing build.
- [x] Review shots (docs/review/064):
  - the Stormcrown from a ramp, and the Rod Field charged;
  - a lightning arc across a sandbox pen;
  - the Conductor blinking, with the target rod flashing;
  - a storm call, the rod chain, and the Conductor grounded;
  - the five-entrance intake and a five-lane volley.

## Data changes
- `worldShape.ts`: the Stormcrown's radius and ramps; a new `stormcrown.ts` and `stormcrownSites.ts`.
- `ringScale.ts`: ring 5 ×10. `leveling.ts`: ring XP, the cap and curve, `CONDUCTOR_XP`.
- `items.ts`: the three new items. `tags.ts`: `lightning` and its `LIGHTNING` numbers. `stages.ts`: `lightning-rune`.
- `keywords.ts`: Lightning live. `statDefs.ts`: `chains` and `chain-range`. `talents.ts`: the two nodes.
- A new `conductor.ts`. `research.ts`: `entrance-5`. `foundry.ts`: the fifth entrance and the stormglass port.
- `objectives.ts`, `endCard.ts`, `sandbox.ts`, `save.ts`, plus art and sound data.

## Out of scope
- The Stormcrown's enemies (065) and stormsteel (066).
- Poison; a sixth entrance; tuning ring 5's ×10.

## Test plan
- **Sim (Vitest):**
  - **World and access:** the world move is pure (the offsets snapshot); ring 5 and its multipliers; the barrier on the Forgewright's kill; reachability.
  - **Rods and the Weathervane:** the rod cycle, with gathering only while charged and no damage from a strike; claiming the Weathervane and its supply.
  - **Lightning:**
    - arcs: count, range, share and nearest-first;
    - never the same enemy twice; skips burrowed, immune and plated;
    - one chain per Burst; arc hits don't arc again;
    - the talents' numbers; the keyword rule.
  - **The Conductor:**
    - the blink's timing, warning and target choice; misses on its old spot; homing re-locks;
    - rod health, breaking and regrowth; grounded with fewer than 2 rods;
    - the lash, call and chain hit and miss;
    - enrage, drops, XP, reset and altar.
  - **Goals and the end card:** `entrance-5` and the five-lane fan; the m3 goals; the end card's trigger.
- **Playwright:** walk up a Stormcrown ramp after the Forgewright; a lightning arc in the sandbox; break rods to ground the Conductor in the sandbox; restore the fifth entrance. Plus the review shots.

## Open questions
None: the interview settled them.

## Decisions in this draft (OK them with the approval)
- A lightning Burst or Bomblet chains once, from the enemy nearest its centre, not once per enemy it hit, so a bomb can't start dozens of chains.
- Arcs ignore Shields (they come from beside), but skip plated, burrowed and immune enemies.
- Arc hits don't arc again, Split, or set off on-hit talents.
- A rod strike never hurts the player, as 060's vents don't.
- The Conductor is always hittable: no plating; his rods are the puzzle.
- Fewer than 2 standing rods grounds him until one regrows.
- The end card moves to the Conductor.

## Results
Built in eight slices on `claude/064-stormcrown` (docs/plans/064-stormcrown.md). Every criterion above is met; where the
build settled something the spec left open, it is raised below. `SAVE_VERSION` is 17 (15 is 063's, 16 062's).

- **Measure** (`npm run measure`, tests/measure/conductor.measure.ts, recorded, not tuned): 041.7's decent build (level
  7, its six talents and four Common pieces) with four entrances fed, and a careful bot that keeps near the spire's
  middle (inside the rod chain's hexagon), walks off the lash's line and out of the storm call's circles, and holds fire
  at the Conductor's body. It reads the Conductor as a player does (041's bot rule): after a blink it keeps aiming at
  the old spot until the new one has shown for its 15-tick reaction delay.
  - Four homing ley-bolt lines: 20/20 won in 55.7–59.1 s (mean 57.6), 0 KOs, no damage taken; 12–13 blinks a fight.
    Under the spec's 90–150 s target (MISSED, recorded).
  - Four plain arrow lines (no homing): 20/20 won in 54.0–63.5 s (mean 58.0), 0 KOs, no damage taken; 12–14 blinks.
    Homing gives only a small edge here (064.28).
- **Boot and e2e budgets**, measured against 062's head (60dd4bb) one Playwright process at a time, with another
  build's tests running beside them. The bigger world doesn't slow the game's boot: a boot to the field took 2.9–4.4 s
  on both, and settings.spec's reload test 18–34 s on 062 and 20–30 s here; it gets 45 s
  (it ran past the default 30 s once on CI). The sandbox's mixed-loadout test makes 44 panel clicks (062: 39) at about
  1.1 s each, 66–96 s here against 47 s on 062, and gets 150 s. The Conductor's sandbox test (about 8 s) and the walk up
  into ring 5 (about 15 s) get 60 s; the review shots 45–180 s, about three times what each took.
- **Review shots** in docs/review/064:
  - the Stormcrown from the top of the north-west ramp, and the Rod Field charged with a rod just struck;
  - a lightning arc across a sandbox pack;
  - the five-entrance intake, every cap restored and fed, and a five-lane volley;
  - the Conductor about to blink, the rod it goes to flashing;
  - the storm call's three circles; the rod chain's lightning round the hexagon;
  - the Conductor grounded in the sandbox, five rods broken (one already regrowing).

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

The world and the ring:
- 064.1 The world grows to 292 tiles, its centre at (146, 146); the minimap's scale goes to 0.34 to stay in its band.
  The Ash Kilns' ley-line waypoints, written in 060's coordinates, now go through `laidOut060`.
- 064.2 Three ramps, at 320° (beside the Anvil Hall), 60° and 200°; the barrier stands across each ramp's top, as the
  Emberworks' does. Ring 5 gives ×10 kill XP (`RING_XP`), as the ring's ×10.
- 064.3 Ground: 640 iron rods, 900 cairns and 160 chasms (1–5 × 1–3 tiles) from the ring's own salted stream; roads
  keep 2 tiles clear of them. The final cliff edge is ragged, as the Emberworks' is.
- 064.4 Roads climb the ramps from the Emberworks' roads: from the Anvil Hall to the Crown Spire's door, from the
  Emberworks spring road to the Weathervane, from the Outpost Forge to the Sky-bridge, and from the south ramp round to
  the Stormcrown's Ley Spring.

Places and stormglass:
- 064.5 The Crown Spire is at 345°, 126 tiles out, a walled court 21 × 17 tiles, its door in the south wall facing the
  centre, its altar in the north-west corner; its six rod sockets are a hexagon 6 tiles from its middle, clockwise from
  the east. The Weathervane is at 80°, 122 out, overlooking the Rod Field (80°, 131 out); the Sky-bridge at 255°, its
  chasm running across the ring; the Ley Spring at 130°, 124 out.
- 064.6 The Weathervane's pylon is dormant until the shrine's claim, as every pylon is, and has no guards until 065; its
  stormglass comes home to a new port at foundry tile (1, 5), along its own ley line.
- 064.7 To fit the Weathervane's line in at the ruin, the Ley Grotto's line now arrives at 86° (was 95°) and the Husk
  Hive's at 125° (was 118°), round a bend clear of the Hive's road. The other lines are unchanged.
- 064.8 The Rod Field has six rods. A harvest in progress is lost if the charge runs out before it finishes. Each rod's
  strike is drawn and heard only when it's in view.

The Lightning rune and its talents:
- 064.9 The Lightning rune takes 1 stormglass per 4 rounds, as the Fire rune takes cinderite. Its rows show once
  stormglass has been carried, and it unlocks by hand-crafting a lightning round. It sits in the build bar's Arrows
  group; to fit the 25th piece, the bar's cells now touch (2 px closer).
- 064.10 An arc is drawn from body height to body height and holds about a quarter second; its crackle plays once a
  frame however many arcs leapt. The hover shows "arcs 2× for N" after the damage line.
- 064.11 The two talents: Forked Bolt (+1 chain) a step on along the Ley lane, and Long Arc (+1 tile chain range) beside
  it toward the Tube lane, both forking from Splinter. 23 nodes; `LEVEL_CAP` 19; `XP_CURVE` gains 950 and 1070.

The fifth entrance:
- 064.12 The fifth mouth is at tx 15 (lane 4). With five mouths the intake's middle (tx 13) is a mouth, so the pipe's
  research diagram moves to the mouth that starts open (tx 12). The pipe, gauges and tube slot widen to five; the
  sandbox's loadout is five plain arrows.
- 064.13 One core opens one cap, any cap: with two caps left after the Bulwark, either takes the Forgewright's core,
  and the last the Conductor's.

The Conductor:
- 064.14 It stands 40 px in from its rod, toward the middle, so its body and the rod are hit apart. It starts on its
  start tile by the north-east rod and appears at a rod's stand point when it blinks.
- 064.15 A rod's hurtbox is 20 × 60 px. The arena rods never block feet; standing, they take a hit as a part (shots,
  Bursts in reach of their socket, punches), never a lightning arc, and broken they're shot through.
- 064.16 The blink waits out an attack in progress, and it doesn't start an attack during a blink's warning. If the
  warned rod breaks during the warning, the blink is called off and it picks again at once (a new 45-tick warning).
  Grounded, a due blink waits for a rod to regrow.
- 064.17 The arc lash: a line 360 px long and 24 wide from its rod's socket toward the player's feet, locked at the
  wind-up's start; it lands once, knocking 40 px along the line. Recovery 30 ticks, cooldown 150 from the wind-up's
  start.
- 064.18 The storm call: one circle on the player, the other two 64 px off either side of them at a seeded angle,
  called down at the wind-up's start and striking as it ends; a roll's i-frames let a strike pass. Recovery 30,
  cooldown 240.
- 064.19 The rod chain: lines 16 px wide between neighbouring standing rods, chosen at the wind-up's start; a line
  whose rod breaks goes dead at once. It hits a player once a chain. With no two neighbouring rods standing, it isn't
  picked. Recovery 30, cooldown 360.
- 064.20 Data order with cooldowns means the lash comes first and most often: lash, call, lash, chain, and so on.
  Its first lash starts the tick it wakes.
- 064.21 It can't walk, so running away or a downed player resets its fight at once (back at its start, healed, rods
  whole, strikes gone), where the Forgewright walks home first.
- 064.22 Homing's re-lock: a homing round that locked on at launch and has lost its target re-locks onto the nearest
  Conductor within the round's lock radius (measured from the round), in the player's room. A round that never locked
  flies straight, as ever. A round locked on it follows it through a blink.
- 064.23 The rig (draft for your review): a tall robed storm construct in slate violet, a faceless hood with cyan eyes,
  a storm rod for a staff. Its blink is a gathering pose with a flicker while the rod flashes, then a column of light
  where it leaves and where it appears. The arena rods are their own sprites, each with a small bar once hurt (cyan,
  filling back, while broken).
- 064.24 Sounds: a crack of current as any attack winds up, the storm call's hum and the rod chain's buzz as they
  start, the blink's zip, the strikes' crack (and a small shake). The Crown Spire's rods stand whole when the Conductor
  isn't in the room (after its first kill).

Goals, sandbox and kit:
- 064.25 The m3 goals point at the nearest Stormcrown ramp top, the storm rods, the Weathervane's pylon, the crafts'
  raws, the Conductor, the caps and the intake. With them, the tutorial's chain now ends at "Feed all five entrances".
- 064.26 The sandbox's spawn column gains a Conductor reset row; to fit the view its rows are 1 px apart (were 2). A
  Conductor spawned from the panel stands where it's placed; its rods are always the Crown Spire's.
- 064.27 The `?playtest` kit carries one stack of stormglass (a raw's is two) and leaves out the storm coil, so its
  cores stay on the bag's first screen (062.15's rule).
- 064.28 The measure's target is missed (about 58 s, not 90–150): the careful bot takes no damage and both builds win
  about as fast. With the bot's reaction delay after a blink, homing's edge is small: a mean 57.6 s against 58.0 s for
  plain arrows, and its slowest fight 59.1 s against 63.5 s. The Conductor stands still between blinks, so straight shots
  land as well once the bot has turned to him. Recorded, not tuned.
- 064.29 The arc lash starts at the socket of the rod he stands at, even when that rod is broken (the spec doesn't say
  what a broken rod should do to it). Left as built.
