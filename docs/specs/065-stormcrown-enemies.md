# 065: Stormcrown enemies
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

Plan pre-approved by Shaun, 2026-10-26.

Drafted from Shaun's Region 4 interview (docs/brainstorm/2026-10-26-region-4-interview.md, answer 9), 2026-10-26.

## Goal
The Stormcrown fills with four enemies built to test a late build:
- the **thunderhawk**, which dives from above the walls;
- **static mites**, a swarm in threes that Lightning chains love;
- the **storm sentinel**, which calls strikes from range and is killed first;
- the **gale ram**, which blows you back and slows you.

The Weathervane gains guards.

## Design references
- docs/design.md, "Combat": RotMG density with every attack telegraphed; "Lightning chains between targets"; "Bosses are engineering puzzles" (here, packs that reward homing and chains).
- docs/specs/035-hollows-enemies.md and docs/specs/061-emberworks-enemies.md: a region's four, with starting values, drops, spawning, guards, champions, art and tests. 061's shared ground hazards and death hooks.
- docs/specs/064-stormcrown.md: ring 5 (×10), stormglass, the storm coil, the Weathervane, Lightning.

## Acceptance criteria

**Thunderhawk (data, sim)**
- [x] A flier: it moves over walls, cliffs and chasms, and it can be hit only by shots, Shards and Bursts that reach it. It is never blocked by terrain.
- [x] It circles the player at `orbit` distance. Every `cooldownTicks` it marks a dive line through the player's feet, locked at the wind-up's start (the red lane telegraph), then dives along it.
  - It hits the player once for `damage` with knockback.
  - It climbs away to its orbit.
- [x] While it circles, it's evasive: it turns at `turnDegPerSec`, so straight shots lead it poorly and homing rounds track it.

**Static mites (data, sim)**
- [x] They always spawn and move in threes, as one pack slot each.
- [x] Each runs at the player and zaps on contact: a 30-tick red pulse under it, then `damage`. Then it backs off for `recoverTicks`.
- [x] **Discharge:** a mite the player kills discharges `discharge.damage` lightning damage into every other mite within `discharge.radius`. That can kill them in turn, chaining. It never hurts the player.

**Storm sentinel (data, sim)**
- [x] A slow rod-turret. It keeps between `keep.min` and `keep.max` from the player, using 061's keep-distance.
- [x] Every `cooldownTicks`, with a clear line, it calls a red strike circle of `strike.radius` on the player's feet, striking after `strike.windupTicks` for `strike.damage`.
- [x] It never stacks more than one live circle per sentinel.

**Gale ram (data, sim)**
- [x] A heavy wind construct that walks toward the player. Within `gust.range`, it winds up a red cone of `gust.arcDegrees` in front of it, locked at the wind-up's start.
- [x] Then it gusts: a player inside takes `gust.damage`, is pushed back `gust.push` px, and is slowed by `gust.slow` for `gust.slowTicks`. A roll's i-frames dodge it.
- [x] The slow is a new player status. It shows on the HP bar and lowers walk and roll speed.

**Starting values (data)**
All values are starting values in data, before ring 5's ×10, tuned in playtest.

| | Thunderhawk | Static mite | Storm sentinel | Gale ram |
| --- | --- | --- | --- | --- |
| health | 40 | 12 | 60 | 140 |
| move | 110 px/s, flies; turn 180°/s | 90 px/s | 20 px/s | 35 px/s |
| trigger | orbit 160 px | contact 16 px | keeps 200–300 px | gust range 80 px |
| wind-up | 45 | 30 | 60 (strike) | 54 |
| attack | dive lane 260 × 20 px at 480 px/s | pulse 20 px | circle 36 px | cone 70°, 96 px |
| damage, knockback | 24, 32 px | 8, 8 px | 30, 24 px | 20; push 120 px, slow 40% for 120 ticks |
| recover | climbs 60 | backs off 40 | 30 | 48 |
| cooldown (from wind-up start) | 210 | 60 | 120 | 180 |
| other | | discharge 40 px, 12 lightning | one live circle | |
| xp | 8 | 3 | 8 | 8 |

- [x] Every wind-up is at least `MIN_TELEGRAPH_TICKS`; a data test holds each.

**Drops (data)**
- [x] Each kill always drops 1 `stormglass`, plus a 20% chance at `cinderite`, a 4% chance at a `storm-coil`, the shared schematic roll and a 10% chance at unidentified gear.
- [x] A static mite drops stormglass at a third of the rate (one mite in three, on average), so a trio drops like one enemy.
- [x] Champions follow 032.

**Spawning (data, sim)**
- [x] Ring 5 keeps 12 packs of 4–6 alive under 017's rules, only once the `stormcrown` gate is open, never in the Crown Spire or a safe zone.
  - Members are picked from `['thunderhawk', 'thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram']`.
  - A picked mite brings its trio, and the three count as 3 members.
  - Limits: at most 1 storm sentinel and 1 gale ram per pack.
- [x] Region 4's four never appear in rings 1–4, and earlier enemies never appear in ring 5.
- [x] **The Weathervane's guards:** a fixed pack of 2 thunderhawks, 1 mite trio, 1 storm sentinel and 1 gale ram, cleared before claiming. They never return after the claim.
- [x] **Champions:** 1 in 3 packs in ring 5. A champion mite makes a champion trio.

**Render, art and sound**
- [x] Vector art (docs/art.md):
  - the thunderhawk: a brass-and-slate storm bird construct with lightning-veined wings;
  - static mites: tiny spark-beetles;
  - the storm sentinel: a squat turret with a rod and a lens;
  - the gale ram: a broad fan-faced construct.
  - Each has idle, move, wind-up, attack, hit and death. Also: the dive and climb, the discharge chain, the sentinel's call, and the gust's swirl.
- [x] Telegraphs in the shared enemy red. The slow shows as a wind swirl on the player and on the HP bar.
- [x] Synth sounds: the hawk's screech and dive, the mites' buzz and discharge, the sentinel's call, the ram's gust.

**Sandbox, measure, shots**
- [x] The sandbox's spawn panel lists the four (a mite spawns as a trio).
- [x] `npm run measure` gains ring 5 packs, recorded and not tuned. Record a decent five-entrance steel Lightning build and a stone build.
- [x] Review shots (docs/review/065):
  - a mixed pack;
  - a hawk's dive line;
  - a mite trio discharging;
  - a sentinel's circle;
  - a ram's gust cone;
  - the slowed player;
  - the Weathervane's guards.

## Data changes
- `src/data/stormcrownEnemies.ts`: the four defs, their numbers and drops. New kinds in the `EnemyDef` union and the AI and scaling switches.
- `population.ts`: ring 5 and the trio rule.
- `stormcrownSites.ts`: the Weathervane's guards.
- The player's slow status in `player.ts`.
- Art, anims, sounds and sandbox rows.

## Out of scope
- Stormsteel (066).
- New keywords: the slow is a status the HUD shows, not a keyword, for now.
- Flying enemies elsewhere.

## Test plan
- **Sim, per enemy:**
  - Thunderhawk: orbiting; the dive line locked; a sidestep dodges; one hit per dive; flying over terrain; homing tracking it.
  - Static mites: trios spawn together; contact pulses; the discharge chain kills neighbours, never the player.
  - Storm sentinel: keeping its distance; one live circle; hits and misses.
  - Gale ram: the cone hit and miss; push, slow and roll dodge; the slow's effect on walk and roll.
- **Spawning, guards, champions and drops** as listed.
- **Playwright:** sandbox scenes for each, plus the review shots.
- **`npm run measure`:** ring 5 packs, recorded.

## Open questions
None: the interview settled them.

## Decisions in this draft (OK them with the approval)
- A flier can be hit by every shot that reaches its hurtbox; it just ignores terrain while moving.
- A mite trio counts as three pack members, and a trio drops like one enemy.
- The gale ram's slow is the first player slow. It lowers walk and roll speed but never stops a roll.
- A killed mite's discharge never hurts the player.

## Results
Built in five slices on `claude/065-stormcrown-enemies` (docs/plans/065-stormcrown-enemies.md). Every criterion above
is met; where the build settled something the spec left open, it is raised below. `SAVE_VERSION` is 18.

- **Measure** (`npm run measure`, tests/measure/stormPacks.measure.ts, recorded, no target): a ring 5 pack of a
  thunderhawk, a mite trio, a storm sentinel and a gale ram (6), against the decent build (041.7's level-7 talents and
  gear) with all five entrances fed (three Lightning arrow lines, two Lightning bomb lines), the pack bot 7 tiles off.
  - Steel: 20/20 cleared in 9.9–19.7 s, 0 KOs, no damage taken.
  - Stone: 20/20 cleared in 17.2–29.1 s, 0 KOs, no damage taken.
  - The careful bot reads every telegraph and takes no hit, so the pack may read easier than it plays (065.24).
- **Review shots** in docs/review/065: a mixed pack; a hawk's dive line; a mite trio discharging; a sentinel's circle;
  a ram's gust cone, then its gust; the slowed player (in the sandbox, god mode on); the Weathervane's guards; and the
  four on the contact sheet.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

Flight and the thunderhawk:
- 065.1 A flier ignores every tile and anything standing in the way, a shut barrier too (packs only spawn once it's
  open, so this shows only in the sandbox). It stays on its room's grid, never crosses into a boss arena's walls (unless
  posted inside one), and keeps out of safe zones by position as anyone does.
- 065.2 A flier and a walker never push each other apart (one is in the air); two fliers do, over any terrain.
- 065.3 A hawk killed over something solid drops its loot on the nearest open tile (up to 8 tiles out).
- 065.4 A punch in reach hits a flier as it would anything: the spec's "only by shots, Shards and Bursts that reach it"
  is read as being about reach, per the draft's decision.
- 065.5 It dives whenever its cooldown is ready and the player's feet are within its line's length (260 px), so its
  first dive can come as it closes in, before it settles into its orbit. It hovers still through the wind-up; the line
  runs 260 px from where it hovers, through the player's feet; only the line's end stops the dive.
- 065.6 The climb is its recovery: for 60 ticks it flies on round its orbit (turning back from the dive's heading at its
  turn rate), drawn low over its shadow and rising, hittable throughout.
- 065.7 Half the hawks circle clockwise, half anticlockwise (by id). Measured, a circling hawk holds 75–125% of its
  orbit's radius.
- 065.8 Numbers the spec didn't give: feet 16 × 8 px, hurtbox 26 × 20 px lifted 30 px, weight 1, a 6-tick knock.

Static mites:
- 065.9 Trios are linked in list order wherever a pack is made (population, the Weathervane's guards, a cache's
  returning guards, the sandbox). One mite awake wakes its trio. A mite is picked for a pack only with 3 places left.
- 065.10 Contact is 16 px feet to feet. It holds still through its 30-tick pulse; the zap shows 6 ticks with a 4-tick
  knock; it backs off by running straight away from the player for its 40 ticks.
- 065.11 Any mite's death discharges (a burn's, an arc's, another discharge's), not only a round's kill. The discharge
  hits only other mites, never arcs on, and scales with ring and champion as damage does (061.4's rule). In ring 5 it
  deals 120, a plain mite's whole health there, so a killed mite always takes its trio with it.
- 065.12 "Drops at a third" is the whole drop (table, part, schematic and armor) one time in three, for a champion mite
  too, so a champion trio drops like one champion on average. Each mite of a champion trio is named on its own.

The storm sentinel:
- 065.13 It calls only within 300 px (its band's far edge), with a clear shot line, its cooldown (from the call) ready
  and none of its circles waiting. It holds still while its circle waits (60 ticks), its call's pose shows 8 ticks,
  then it recovers 30. Keep-distance is 061's tender's, now shared.
- 065.14 Its circle is 064's strike: it still lands if the sentinel dies first, and knocks 24 px out from the circle's
  centre over 6 ticks (strikes gained a knockback; the Conductor's is 0). Any strike landing shows the Conductor's
  landing bolt and crack.

The gale ram and the slow:
- 065.15 The gust pushes 120 px out from the ram (not along the cone's axis) over 15 ticks (8 px a tick). The cone is
  centred on its feet; the gust's pose shows 10 ticks. Its wind-up cue is the Charger's snort; its roar plays as it lands.
- 065.16 A new slow while slowed keeps the stronger share and the longer time left. A KO clears it. A gust spent on a
  Wardstone block doesn't slow. The slow takes its share of walk speed after gear, talents and firing, and of a roll's
  distance over the same ticks. It isn't scaled by ring or champion.
- 065.17 On the player the slow is three pale wind curls circling the legs, fading over its last half second; on the HP
  bar, pale streaks sliding across the fill. The gust itself shows pale wind curls sweeping out through the cone.

Spawning, the sandbox and the rest:
- 065.18 Ring 5 packs spawn only on slate reachable from the ramps' tops (061.15's rule), and never in the Crown Spire.
- 065.19 The Weathervane's guards stand on its terrace, in its local tiles: hawks at (2, 3) and (2, 8), the trio at
  (5, 4), (6, 5) and (5, 6), the sentinel by the pylon at (8, 8), and the ram at (3, 5).
- 065.20 The sandbox's four new pens run on east (the room is 60 tiles wider). A mite's pen holds a trio 14 px apart,
  and the spawn panel's count is trios for a mite.
- 065.21 A killed mite's discharge is drawn as Lightning's arc bolts, lower, with its own snap. The four rigs are a
  first draft for your eye.
- 065.22 064's tests that held "no packs until 065" now hold that ring 5 has no packs while its barrier stands, and the
  Weathervane lists its guards.
- 065.23 At ring 5's ×10, one hit is most of a bare 100-HP player: a dive 240, a strike 300, a gust 200, a zap 80. That
  is the spec's ×10 and was not tuned.
- 065.24 The measure's bot takes no damage in either build: it reads every telegraph. A player who misreads one at ×10
  is likely KO'd.

