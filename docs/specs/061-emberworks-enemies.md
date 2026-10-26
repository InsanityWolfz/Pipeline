# 061: Emberworks enemies
status: approved

Approved by Shaun in chat, 2026-10-24 ("Approve 61 and 62"), with the draft's listed decisions; plan approved 2026-10-26 ("Approve the plans").

Drafted from Shaun's 061 interview (docs/brainstorm/2026-10-22-region-3.md, "061 interview"), 2026-10-24.

## Goal
The Emberworks stops being empty. Four new enemies roam it in packs, each with its own read and its own answer:
- the **cinder mote**, which you kill at range or lure into a pack;
- the **bellows hound**, which dashes down a lane you sidestep and leaves a burning trail;
- the **slag golem**, which splits into whelps that Bursts clean up;
- the **kiln-tender**, which heals the others and is killed first.

The Ash Kilns gain guards to clear before claiming.

## Design references
- docs/design.md:
  - "Combat": "The field is dangerous, at Realm of the Mad God density ... Every enemy still telegraphs attacks you read and dodge, and nothing becomes a mindless horde."
  - "Damage types behave differently": Fire burns over time and spreads.
  - "World, regions, ley lines, bosses": difficulty by distance; champions; claiming.
- docs/specs/035-hollows-enemies.md: the pattern for a region's four (starting values, drops, spawning, champions, art, tests).
- docs/specs/060-emberworks.md: ring 4 (×4), cinderite, the forge rivet, the Ash Kilns, Fire and burn, flood pools (the player-hurting ground hazard).
- docs/specs/017-overworld.md and docs/specs/032-landmarks-champions.md: packs, respawns, the spawn cap, champions.

## Acceptance criteria

**Cinder mote (data, sim)**
- [x] A small floating ember that drifts toward the player, ignoring walls' cover but not walls.
- [x] **Swell:** with the player's feet within `trigger`, it stops and swells for `windupTicks` as a red circle of `burst.radius` grows under it. Then it bursts: `burst.damage` with knockback to a player inside, unless a roll's i-frames are running. It leaves a fire pool of `pool.radius` for `pool.ticks`, which deals `pool.damage` once a second to a player standing in it. The mote is gone, dropping nothing and giving no XP.
- [x] **Killed:** a mote the player kills bursts where it dies: `deathBurst.damage` fire damage to every other enemy within `deathBurst.radius`, which sets them burning by Fire's rules (060). Its death burst never hurts the player and leaves no pool.
- [x] Its living burst and its pool never hurt enemies.

**Bellows hound (data, sim)**
- [x] It walks like the Charger (035). With a clear line to the player within `trigger`, it shows its lane (the Charger's red lane telegraph) for `windupTicks`, locked at the wind-up's start, then dashes down it. It hits the player once per dash for `damage` with knockback.
- [x] **Trail:** the dash leaves a burning trail along the ground it covered, `trail.width` wide, for `trail.ticks`. It deals `trail.damage` once a second to a player standing in it and never hurts enemies.
- [x] It stops at the lane's end or at a wall, with no wall stun (unlike the Charger), then recovers.

**Slag golem (data, sim)**
- [x] It walks slowly toward the player. With the player's feet within `slam.triggerRange`, it winds up a red circle in front of it, locked at the wind-up's start, then slams for `slam.damage` with knockback, then recovers.
- [x] **Split:** when it dies, two **slag whelps** rise where it fell, one each side. They join its pack.
- [x] **Slag whelp:** small and quick. With the player within reach, it winds up a short front bite (red arc) and bites for `damage`. A whelp drops nothing, gives `xp` 1, and never splits.

**Kiln-tender (data, sim)**
- [x] It keeps between `keep.min` and `keep.max` from the player, backing off when closer. It has no attack of its own.
- [x] **Repair beam:** every `cooldownTicks`, it picks the living enemy in its pack, other than itself, with the lowest share of its max health below full, within `beam.range` and with a clear line. It winds up `windupTicks` (a thin beam telegraph to the target). Then it channels for up to `beam.ticks`, healing the target `beam.heal` a second, never past max health.
  - The channel breaks when the line is blocked, the target dies, or the tender takes damage.
  - It never heals a boss.
- [x] Hovering the beam's target shows it's being repaired (render).

**Starting values (data)**
All values are starting values in data, tuned in playtest, before ring 4's ×4 (060). Ticks are at 60 Hz. For comparison, the Charger (035) has 50 health and a 25-damage charge.

| | Cinder mote | Bellows hound | Slag golem | Slag whelp | Kiln-tender |
| --- | --- | --- | --- | --- | --- |
| health | 20 | 45 | 120 | 15 | 40 |
| walk | 60 px/s, floats | 60 px/s | 30 px/s | 70 px/s | 45 px/s |
| trigger | 40 px | 220 px, clear line | 48 px | 20 px | keeps 160–240 px |
| wind-up | 45 | 45 | 54 | 30 | 30 |
| attack | burst radius 40 px | lane 200 × 24 px at 420 px/s | circle 40 px, 32 px ahead | arc 90°, reach 24 px | beam 200 px, 180 ticks |
| damage, knockback | 18, 32 px | 22, 32 px | 30, 40 px | 10, 12 px | heals 6 a second |
| recover | gone | 40 | 48 | 20 | 30 |
| cooldown (from wind-up start) | none | 180 | 150 | 60 | 240 |
| other | pool 32 px, 180 ticks, 8/s; death burst 48 px, 10 fire | trail 24 px, 180 ticks, 8/s | splits into 2 whelps | | |
| xp | 6 | 6 | 6 | 1 | 6 |

- [x] Every wind-up is at least `MIN_TELEGRAPH_TICKS`, and a data test holds each to it.

**Drops (data)**
- [x] Each of the four always drops 1 `cinderite`, plus a 20% chance at `ley-iron`, a 4% chance at a `forge-rivet`, the shared schematic roll (033), and a 10% chance at unidentified gear.
- [x] Whelps and a mote that burst on its own drop nothing.
- [x] Champions apply their drop multiplier and guaranteed armor (032).

**Spawning (data, sim)**
- [x] Ring 4 keeps packs alive under 017's rules: spawn distance, out of view, the respawn delay, the spawn cap of 15 within a screen, and never inside a safe zone or the Anvil Hall. Packs spawn only once the `emberworks` gate is open.
  - **Starting values:** 12 packs of 4–5, picked from `['cinder-mote', 'cinder-mote', 'bellows-hound', 'bellows-hound', 'slag-golem', 'kiln-tender']`.
  - **Limits:** at most 1 kiln-tender and 2 slag golems per pack.
  - **Whelps:** they count toward their pack, so a pack is wiped only when its whelps are dead too. They never spawn on their own.
- [x] The four new enemies never appear in rings 1–3, and the Hollows' four never appear in ring 4.
- [x] **The Ash Kilns' guards:** a fixed pack of 1 slag golem, 2 bellows hounds, 2 cinder motes and 1 kiln-tender. It must be cleared before the pylon can be claimed (009/017), and it never returns once the site is claimed.
- [x] **Champions:** any of the four (not a whelp), in 1 in 4 packs, as ring 3. Telegraphs are never shortened. A champion golem's whelps are plain whelps.

**Render, art and sound**
- [x] Vector art in the house style (docs/art.md):
  - **Cinder mote:** a floating ember in a cage of slag.
  - **Bellows hound:** a lean forge-hound construct with a bellows chest.
  - **Slag golem:** a hunched lump of cooling slag with a glowing core.
  - **Slag whelp:** a small blob of slag.
  - **Kiln-tender:** a small kiln on legs with a brass nozzle.
  - Each has idle, move, wind-up, attack, hit and death. Also: the mote's swell, the golem's split, and the tender's beam.
- [x] Every telegraph uses the shared enemy red. The tender's beam is the kiln's orange, and a target being repaired shows a soft orange glow.
- [x] The mote's pool and the hound's trail draw like 060's flood pools, smaller.
- [x] Synth sounds: the mote's swell and burst, the hound's dash, the golem's slam and split, and the tender's beam hum.

**Sandbox (044)**
- [x] The spawn panel lists the five new enemies, the whelp included.

**Saves**
- [x] `SAVE_VERSION` goes up if the save's shape changes.

**Measure**
- [x] `npm run measure` gains ring 4 packs, recorded, not tuned: a decent four-entrance Fire build clears a ring 4 pack in about 15–30 s with at most one KO over 20 seeds.

**Review shots (docs/review/061)**
- [x] A mixed pack; a mote swelling; a mote's death burst setting a pack burning; a hound's lane and trail; a golem splitting; a tender's beam on a hurt golem; the Ash Kilns' guards.

## Data changes
- `src/data/emberworksEnemies.ts`: the five defs, their numbers and drops. New enemy kinds in the `EnemyDef` union, `attackOf` and `thinkOf`.
- `population.ts`: `PopulatedRing` gains 4, with its pack def and limits.
- `emberworksSites.ts`: the Ash Kilns' guard pack.
- Art, anims, sounds and sandbox rows for the five.

## Out of scope
- The Smelter, the kiln (the machine), and steel and glass rounds (062).
- New keywords or traits (the tender's repair isn't a keyword).
- The Forgewright gaining adds.
- Tuning ring 4's multiplier.

## Test plan
- **Sim (Vitest), per enemy:**
  - Cinder mote: the swell and its trigger; the burst's hit and miss and roll dodge; the pool's beats; no drop or XP from a self-burst; the death burst burning other enemies and never the player.
  - Bellows hound: the lane locked at the wind-up; a sidestep dodges; one hit per dash; the trail's length and beats; no enemy damage from the trail; it stops at a wall.
  - Slag golem: the slam's circle hits and misses; the split into two whelps in its pack.
  - Slag whelp: the bite.
  - Kiln-tender: keeping its distance; picking the most hurt; the heal rate; never past max; the channel breaking on a blocked line, the target's death and damage to the tender; never healing a boss.
- **Spawning:** ring 4 packs only after the gate opens; the limits; whelps counting toward their pack; no cross-region enemies; the Ash Kilns' guards must be cleared to claim; champions in ring 4.
- **Data:** references resolve; every telegraph at least `MIN_TELEGRAPH_TICKS`; drops as listed.
- **Playwright:** in the sandbox, kill a mote beside a pen of Husks and see them burn; dodge a hound's dash; split a golem; break a tender's beam. Plus the review shots.
- **`npm run measure`:** ring 4 pack clears, recorded.

## Open questions
None: the interview settled them. The numbers are proposals, tuned in playtest.

## Decisions in this draft (OK them with the approval)
- A mote that bursts on its own drops nothing and gives no XP; only a killed mote drops.
- A killed mote's death burst hurts only enemies, not the player, and leaves no pool.
- The hound has no wall stun (unlike the Charger), so it reads as its own enemy.
- The tender heals only its own pack, and any damage breaks its channel.
- Whelps count toward their pack's wipe, and give 1 XP and no drops.
- Ring 4's champion chance is 1 in 4, as ring 3's.

## Results
Built in five slices on `claude/061-emberworks-enemies` (docs/plans/061-emberworks-enemies.md). Every criterion above is
met; where the build settled something the spec left open, it is raised below.

- **Measure** (`npm run measure`, tests/measure/emberPacks.measure.ts, recorded, not tuned): a ring 4 pack of two motes,
  a hound, a golem and a tender, against the decent build (041.7's level-7 talents and gear) with two Fire arrow lines
  and two Fire bomb lines, the pack bot kiting from 7 tiles off. It cleared on 20/20 seeds in 5.6–11.2 s with 0 KOs,
  taking at most 22 damage: faster than the 15–30 s target, so the pack may read easy to a careful player. Nothing was
  tuned. Rings 1–3's pack measures are unchanged.
- **Review shots** in docs/review/061: a mixed pack, a mote swelling, a mote's death burst setting a pack burning, a
  hound's lane and its trail, a golem splitting and its whelps, a tender's beam on a hurt golem, the Ash Kilns' guards,
  and the five on the contact sheet.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

The cinder mote:
- 061.1 "Floats" is its look only: walls and the Slag River stop it as any feet. "Ignoring walls' cover" is read as
  needing no clear line to the player to drift at them or swell.
- 061.2 Its swell holds it still, and its burst and pool are centred on it. The pool and the hound's trail beat on
  their first tick and every second after (the flood's rule), so the burst's own hit can swallow the pool's first beat.
- 061.3 Its death burst flashes its targets with no knockback, and passes a Shardback's shield as Bursts do. A mote that
  bursts on its own records no death (its burst plays instead of the death animation).
- 061.4 Ring and champion scaling: the pool's and the trail's beats and the death burst scale as damage does (in ring 4:
  burst 72, pool 32 a second, trail 32 a second, death burst 40). The tender's heal scales the same way (24 a second in
  ring 4), so it keeps pace with the ×4 health it repairs. Unscaled, it would heal ring 4 enemies very little.

The bellows hound:
- 061.5 Its trail lasts 180 ticks from the dash setting off, so its far end lasts about 150. Its far end follows the
  hound's feet as it runs, a tick behind.
- 061.6 Only a solid tile ends its dash (the Charger's rule): a node stops its feet, and it runs out its lane. Its
  wind-up plays the Charger's snort.

The slag golem and its whelps:
- 061.7 Numbers the spec didn't give: the slam pose holds 8 ticks with an 8-tick knock. Whelps rise 14 px either side of
  where it fell, square to its facing (at its point where a wall stands there), awake, with no rising delay. They are
  plain, in its ring, and act from the next tick.
- 061.8 The whelp is the Husk's kind (004's swipe AI) with its own numbers: a 6-tick bite pose and a 4-tick knock. It has
  a sandbox pen and champion names, though it is never a champion in play.
- 061.9 The golem's death animation is its split: it slumps and cracks apart as its whelps rise.

The kiln-tender:
- 061.10 It holds still while it winds up and channels, which is the window to kill it. The wind-up breaks for the same
  three causes as the channel. At its target's full health it channels on (capped) until its 180 ticks run. A Stun
  ends its beam. Range is checked only when it picks: a target walking out of range doesn't break the channel.
- 061.11 A tender with no pack (its group empty) heals nothing. It heals smoothly each tick, not in beats.
- 061.12 Its beam is the kiln's orange through the wind-up too (thin and faint), not the enemy red, since it never hurts
  the player.
- 061.13 Hovering its target shows a line under the name, "Being repaired" (EMBER_ENEMY_LOOK.beam.hoverLine), not a chip:
  hover chips are keywords, and the repair isn't one. A champion target's tag shows the line too.

Spawning, drops and the rest:
- 061.14 The Ash Kilns' guards stand on the site's floor, in its local tiles: motes at (7, 3) and (7, 7), hounds at
  (4, 3) and (4, 7), the golem by the pylon at (3, 5), and the tender at (8, 5).
- 061.15 Ring 4 packs spawn only on ash reachable from the ramps' tops: pockets walled off by kilns are left out, as
  the Hollows' are (034).
- 061.16 The machine-speed schematic can now drop in Region 3. Otherwise the shared schematic roll had nothing to drop
  there.
- 061.17 The sandbox's open middle (the spawn and the bench) stays where it was. Its five new pens run on east past the
  Anvil Hall (the room is wider), and centring on them all would have put the spawn inside the hall.
- 061.18 Sounds: the golem's wind-up is the Husk's cue, and a killed mote's death burst plays the mote's burst sound.
  The art for all five is a first draft for Shaun's eye.
- 061.19 Enemy-started burns (a death burst's) use the player's Fire talent numbers for their duration and spread, as
  the plan noted.
- 061.20 The e2e's "pen of Husks" is two ring 4 Husks spawned from the sandbox panel, with the killed mote between them.
- 061.21 `SAVE_VERSION` is 14: enemies gained `spent`, `beamTarget` and `beamHeld`, and pools gained a shape, a radius
  and their own damage and beat.
- 061.22 A burning mote that bursts on its own still passes its burn on as it goes (Fire's rule, 060: a burning enemy
  that dies spreads its burn). It still drops nothing, gives no XP and sets off no death burst.

