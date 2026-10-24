# 061 plan: Emberworks enemies

Plan for docs/specs/061-emberworks-enemies.md on `claude/061-emberworks-enemies` (InsanityWolfz/Pipeline#72). It is a plan file because the spec spans the AI, hazards, population, drops, art and sound: five enemies, well past 300 lines.

Five slices, each committed with `npm run check` green before the next. Tests are listed first; the code follows them. Each enemy follows 035's pattern.

## Findings that shape the plan
- **Registration.** A new kind needs cases in `EnemyDef` and `attackOf` (`src/data/enemies.ts`), `thinkOf` (`src/sim/enemyAi.ts`), `scaleAttack` (`src/sim/ringScale.ts`, which scales damage and own speeds) and `kindSummary` (`src/sim/summaryKinds.ts`). It also needs champion `names` (`src/data/champions.ts`; the test needs every non-boss, whelp included) and `ARMOR_DROP_CHANCE` ids (`src/data/gear.ts`).
- **The hound is the Charger, minus the wall stun.** Reuse `chargerAi.ts`'s lane lock, ram and single strike. A wall ends the dash with `enter(e, 'recover')` instead of a stun. Add the hound to `passesThrough` (`enemies.ts`), so it dashes through enemies as the Charger does.
- **Ground hazards need to generalise.** `floodPools.ts` only knows the Forgewright: rect pools, its damage numbers, and a heat reset when the pools dry. Each pool gains its own `damage`, `everyTicks` and shape: a rect (flood), a circle (the mote's pool), or a capsule (the hound's trail, a segment with a width). The Forgewright's heat reset stays its own rule, keyed by owner. Render grows the same shapes; `ForgewrightView.drawPools` moves to a shared pool drawer.
- **Death hooks go in `removeDead`** (`combat.ts`).
  - A golem's whelps are created with its `group` and pushed after the loop; enemies pushed during it are cut off by `length = kept`.
  - A killed mote's death burst calls `damageEnemy` with fire damage on every other targetable, unplated enemy within its radius, which ignites them through 060's hook.
  - A mote that bursts on its own is flagged (`spent`), so it skips drops, XP and the death burst.
  - Whelps skip drops entirely, including `rollSchematic`, which always rolls today.
- **Enemy-started burns** read the player's Fire talent numbers (`burnTicksOf`, `spreadRadiusOf`). That's consistent with burn spreading, so it's accepted as is (raised).
- **Whelps count toward the pack's wipe** with no extra work: `stepPopulation` counts a slot alive while any enemy carries its group. The same holds for the Ash Kilns' guards, which block claiming through `occupied`.
- **Healing is new.**
  - The tender heals up to `defOf(e).maxHealth`, which is ring and champion scaled.
  - The channel breaks on damage to the tender: there's no damaged-this-tick field, so it tracks its own health at channel start.
  - It skips bosses (`enemyDef(...).boss`).
- **Ring 4 population.**
  - `PopulatedRing` and `createPopulation`'s ring loop gain 4. `candidates` stops excluding it.
  - The spawn wait checks `gates.emberworks` for ring 4.
  - `KEEP_OUT` adds the Anvil Hall's bounds. `chanceByRing[4]` is 1 in 4.
  - `REGION_3_PART` is the forge rivet. `SCHEMATIC_REGIONS` covers region 3.
- **Saves.** The save shape test decides whether `SAVE_VERSION` moves: it will if pools gain fields or enemies gain new state such as the tender's channel.

## Slice 1: shared hazards and the cinder mote
**Tests first**
- `floodPools` beats for each shape: the rect flood is unchanged (060's tests still pass); a circle hits inside and misses outside; a capsule hits along the segment and misses past its ends and sides.
- **The mote's swell and burst:**
  - its trigger;
  - the burst hits inside, misses outside, and a roll dodges it;
  - it leaves a pool, which beats once a second and never hurts enemies;
  - a mote that bursts on its own drops nothing and gives no XP.
- **The killed mote's death burst:**
  - it ignites other enemies in its radius (burn by 060's rules);
  - it never hurts the player and leaves no pool;
  - it skips plated and burrowed enemies.
- Data: the mote's telegraph is at least `MIN_TELEGRAPH_TICKS`; references resolve.

**Code**
- `src/data/emberworksEnemies.ts`: the mote, with `EMBERWORKS_DROPS` and `REGION_3_PART`.
- `src/sim/moteAi.ts`; the hazard shapes in `floodPools.ts` (or a renamed `groundPools.ts` if it reads better); death-burst and spent handling in `removeDead`; all the registration switches.
- Render: the mote rig and anims, the swell telegraph, the pool drawer generalised.
- Sounds: the swell and the burst.

## Slice 2: the bellows hound
**Tests first**
- The lane is locked at the wind-up, and a sidestep dodges it.
- It strikes once per dash and passes through enemies.
- It stops at the lane's end, or at a wall with no stun.
- The trail runs along the ground the dash covered, beats once a second, never hurts enemies, and dries after 180 ticks.

**Code**
- `src/sim/houndAi.ts`, reusing `chargerAi.ts`'s pieces (extract the shared ones if that keeps both files short).
- The trail as a capsule pool.
- The rig, the lane telegraph (`drawLane`), the dash sound.

## Slice 3: the slag golem and its whelps
**Tests first**
- The golem's slam circle hits and misses, and is locked at the wind-up.
- On death, two whelps rise beside it, in its group. A champion golem's whelps are plain.
- The whelp's bite hits in its arc and misses outside it.
- Whelps drop nothing, schematic roll included, give 1 XP, and never split.
- A pack isn't wiped while its whelps live.

**Code**
- `src/sim/golemAi.ts` and `whelpAi.ts`, or a shared melee think if the Warden's slammer fits.
- The split in `removeDead`.
- Rigs and the split anim; the slam and split sounds.

## Slice 4: the kiln-tender
**Tests first**
- It keeps between 160 and 240 px, backing off when closer.
- It picks the packmate with the lowest health share below full, in range with a clear line, never itself or a boss.
- It heals 6 a second, never past max health.
- The channel breaks on a blocked line, the target's death, or damage to the tender.
- Its cooldown counts from the wind-up's start.

**Code**
- `src/sim/tenderAi.ts`, using `keepDistance` from `sniperAi.ts` (extracted to `aiCommon.ts` if both use it).
- The channel state on `EnemyState`.
- Render: the tender rig; the beam in kiln orange; the target's glow and a "Repairing" hover chip.
- Sound: the beam's hum.

## Slice 5: packs, guards, champions, measure and shots
**Tests first**
- **Packs** (in a `populated()` helper like `hollowsPacks.test.ts`'s):
  - ring 4 holds 12 packs of 4–5, only after the gate opens;
  - at most 1 tender and 2 golems per pack;
  - no Hollows enemies in ring 4 and no Emberworks enemies in rings 1–3;
  - never in the Anvil Hall or a safe zone.
- **The Ash Kilns' guards:**
  - the fixed pack (1 golem, 2 hounds, 2 motes, 1 tender) blocks claiming until cleared, whelps included;
  - it never returns after the claim.
- **Champions and drops:** 1 in 4 packs in ring 4, never a whelp; drops as listed.

**Code**
- `population.ts` ring 4; `champions.ts` ring 4 and names; the Ash Kilns' guards in `emberworksSites.ts`; `gear.ts` armor ids; sandbox pen regions (`ENEMY_REGIONS`); an Emberworks start for e2e if one helps.
- **Measure:** ring 4 packs in `packs.measure.ts` with a decent four-entrance Fire build (`packBot.ts`). Recorded only.
- **e2e:**
  - In the sandbox: kill a mote beside a pen and see the pack burn; dodge a hound; split a golem; break a tender's beam.
  - Review shots in docs/review/061 (the spec's list).
- The spec's results and "Raised after the build" (061.N).

## Order and verification
- One builder works the slices in order on this branch, committing each with `npm run check` green and the touched e2e files passing, then pushing. CI runs the full suite.
- Then `/review` with the reviewer agent, fixes, and the wrapup.
- 062 builds after this, on its stacked branch.
