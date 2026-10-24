# 061: Emberworks enemies
status: approved

Approved by Shaun in chat, 2026-10-24 ("Approve 61 and 62"), with the draft's listed decisions.

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
- [ ] A small floating ember that drifts toward the player, ignoring walls' cover but not walls.
- [ ] **Swell:** with the player's feet within `trigger`, it stops and swells for `windupTicks` as a red circle of `burst.radius` grows under it. Then it bursts: `burst.damage` with knockback to a player inside, unless a roll's i-frames are running. It leaves a fire pool of `pool.radius` for `pool.ticks`, which deals `pool.damage` once a second to a player standing in it. The mote is gone, dropping nothing and giving no XP.
- [ ] **Killed:** a mote the player kills bursts where it dies: `deathBurst.damage` fire damage to every other enemy within `deathBurst.radius`, which sets them burning by Fire's rules (060). Its death burst never hurts the player and leaves no pool.
- [ ] Its living burst and its pool never hurt enemies.

**Bellows hound (data, sim)**
- [ ] It walks like the Charger (035). With a clear line to the player within `trigger`, it shows its lane (the Charger's red lane telegraph) for `windupTicks`, locked at the wind-up's start, then dashes down it. It hits the player once per dash for `damage` with knockback.
- [ ] **Trail:** the dash leaves a burning trail along the ground it covered, `trail.width` wide, for `trail.ticks`. It deals `trail.damage` once a second to a player standing in it and never hurts enemies.
- [ ] It stops at the lane's end or at a wall, with no wall stun (unlike the Charger), then recovers.

**Slag golem (data, sim)**
- [ ] It walks slowly toward the player. With the player's feet within `slam.triggerRange`, it winds up a red circle in front of it, locked at the wind-up's start, then slams for `slam.damage` with knockback, then recovers.
- [ ] **Split:** when it dies, two **slag whelps** rise where it fell, one each side. They join its pack.
- [ ] **Slag whelp:** small and quick. With the player within reach, it winds up a short front bite (red arc) and bites for `damage`. A whelp drops nothing, gives `xp` 1, and never splits.

**Kiln-tender (data, sim)**
- [ ] It keeps between `keep.min` and `keep.max` from the player, backing off when closer. It has no attack of its own.
- [ ] **Repair beam:** every `cooldownTicks`, it picks the living enemy in its pack, other than itself, with the lowest share of its max health below full, within `beam.range` and with a clear line. It winds up `windupTicks` (a thin beam telegraph to the target). Then it channels for up to `beam.ticks`, healing the target `beam.heal` a second, never past max health.
  - The channel breaks when the line is blocked, the target dies, or the tender takes damage.
  - It never heals a boss.
- [ ] Hovering the beam's target shows it's being repaired (render).

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

- [ ] Every wind-up is at least `MIN_TELEGRAPH_TICKS`, and a data test holds each to it.

**Drops (data)**
- [ ] Each of the four always drops 1 `cinderite`, plus a 20% chance at `ley-iron`, a 4% chance at a `forge-rivet`, the shared schematic roll (033), and a 10% chance at unidentified gear.
- [ ] Whelps and a mote that burst on its own drop nothing.
- [ ] Champions apply their drop multiplier and guaranteed armor (032).

**Spawning (data, sim)**
- [ ] Ring 4 keeps packs alive under 017's rules: spawn distance, out of view, the respawn delay, the spawn cap of 15 within a screen, and never inside a safe zone or the Anvil Hall. Packs spawn only once the `emberworks` gate is open.
  - **Starting values:** 12 packs of 4–5, picked from `['cinder-mote', 'cinder-mote', 'bellows-hound', 'bellows-hound', 'slag-golem', 'kiln-tender']`.
  - **Limits:** at most 1 kiln-tender and 2 slag golems per pack.
  - **Whelps:** they count toward their pack, so a pack is wiped only when its whelps are dead too. They never spawn on their own.
- [ ] The four new enemies never appear in rings 1–3, and the Hollows' four never appear in ring 4.
- [ ] **The Ash Kilns' guards:** a fixed pack of 1 slag golem, 2 bellows hounds, 2 cinder motes and 1 kiln-tender. It must be cleared before the pylon can be claimed (009/017), and it never returns once the site is claimed.
- [ ] **Champions:** any of the four (not a whelp), in 1 in 4 packs, as ring 3. Telegraphs are never shortened. A champion golem's whelps are plain whelps.

**Render, art and sound**
- [ ] Vector art in the house style (docs/art.md):
  - **Cinder mote:** a floating ember in a cage of slag.
  - **Bellows hound:** a lean forge-hound construct with a bellows chest.
  - **Slag golem:** a hunched lump of cooling slag with a glowing core.
  - **Slag whelp:** a small blob of slag.
  - **Kiln-tender:** a small kiln on legs with a brass nozzle.
  - Each has idle, move, wind-up, attack, hit and death. Also: the mote's swell, the golem's split, and the tender's beam.
- [ ] Every telegraph uses the shared enemy red. The tender's beam is the kiln's orange, and a target being repaired shows a soft orange glow.
- [ ] The mote's pool and the hound's trail draw like 060's flood pools, smaller.
- [ ] Synth sounds: the mote's swell and burst, the hound's dash, the golem's slam and split, and the tender's beam hum.

**Sandbox (044)**
- [ ] The spawn panel lists the five new enemies, the whelp included.

**Saves**
- [ ] `SAVE_VERSION` goes up if the save's shape changes.

**Measure**
- [ ] `npm run measure` gains ring 4 packs, recorded, not tuned: a decent four-entrance Fire build clears a ring 4 pack in about 15–30 s with at most one KO over 20 seeds.

**Review shots (docs/review/061)**
- [ ] A mixed pack; a mote swelling; a mote's death burst setting a pack burning; a hound's lane and trail; a golem splitting; a tender's beam on a hurt golem; the Ash Kilns' guards.

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
