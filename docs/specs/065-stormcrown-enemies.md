# 065: Stormcrown enemies
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

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
- [ ] A flier: it moves over walls, cliffs and chasms, and it can be hit only by shots, Shards and Bursts that reach it. It is never blocked by terrain.
- [ ] It circles the player at `orbit` distance. Every `cooldownTicks` it marks a dive line through the player's feet, locked at the wind-up's start (the red lane telegraph), then dives along it.
  - It hits the player once for `damage` with knockback.
  - It climbs away to its orbit.
- [ ] While it circles, it's evasive: it turns at `turnDegPerSec`, so straight shots lead it poorly and homing rounds track it.

**Static mites (data, sim)**
- [ ] They always spawn and move in threes, as one pack slot each.
- [ ] Each runs at the player and zaps on contact: a 30-tick red pulse under it, then `damage`. Then it backs off for `recoverTicks`.
- [ ] **Discharge:** a mite the player kills discharges `discharge.damage` lightning damage into every other mite within `discharge.radius`. That can kill them in turn, chaining. It never hurts the player.

**Storm sentinel (data, sim)**
- [ ] A slow rod-turret. It keeps between `keep.min` and `keep.max` from the player, using 061's keep-distance.
- [ ] Every `cooldownTicks`, with a clear line, it calls a red strike circle of `strike.radius` on the player's feet, striking after `strike.windupTicks` for `strike.damage`.
- [ ] It never stacks more than one live circle per sentinel.

**Gale ram (data, sim)**
- [ ] A heavy wind construct that walks toward the player. Within `gust.range`, it winds up a red cone of `gust.arcDegrees` in front of it, locked at the wind-up's start.
- [ ] Then it gusts: a player inside takes `gust.damage`, is pushed back `gust.push` px, and is slowed by `gust.slow` for `gust.slowTicks`. A roll's i-frames dodge it.
- [ ] The slow is a new player status. It shows on the HP bar and lowers walk and roll speed.

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

- [ ] Every wind-up is at least `MIN_TELEGRAPH_TICKS`; a data test holds each.

**Drops (data)**
- [ ] Each kill always drops 1 `stormglass`, plus a 20% chance at `cinderite`, a 4% chance at a `storm-coil`, the shared schematic roll and a 10% chance at unidentified gear.
- [ ] A static mite drops stormglass at a third of the rate (one mite in three, on average), so a trio drops like one enemy.
- [ ] Champions follow 032.

**Spawning (data, sim)**
- [ ] Ring 5 keeps 12 packs of 4–6 alive under 017's rules, only once the `stormcrown` gate is open, never in the Crown Spire or a safe zone.
  - Members are picked from `['thunderhawk', 'thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram']`.
  - A picked mite brings its trio, and the three count as 3 members.
  - Limits: at most 1 storm sentinel and 1 gale ram per pack.
- [ ] Region 4's four never appear in rings 1–4, and earlier enemies never appear in ring 5.
- [ ] **The Weathervane's guards:** a fixed pack of 2 thunderhawks, 1 mite trio, 1 storm sentinel and 1 gale ram, cleared before claiming. They never return after the claim.
- [ ] **Champions:** 1 in 3 packs in ring 5. A champion mite makes a champion trio.

**Render, art and sound**
- [ ] Vector art (docs/art.md):
  - the thunderhawk: a brass-and-slate storm bird construct with lightning-veined wings;
  - static mites: tiny spark-beetles;
  - the storm sentinel: a squat turret with a rod and a lens;
  - the gale ram: a broad fan-faced construct.
  - Each has idle, move, wind-up, attack, hit and death. Also: the dive and climb, the discharge chain, the sentinel's call, and the gust's swirl.
- [ ] Telegraphs in the shared enemy red. The slow shows as a wind swirl on the player and on the HP bar.
- [ ] Synth sounds: the hawk's screech and dive, the mites' buzz and discharge, the sentinel's call, the ram's gust.

**Sandbox, measure, shots**
- [ ] The sandbox's spawn panel lists the four (a mite spawns as a trio).
- [ ] `npm run measure` gains ring 5 packs, recorded and not tuned. Record a decent five-entrance steel Lightning build and a stone build.
- [ ] Review shots (docs/review/065):
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
