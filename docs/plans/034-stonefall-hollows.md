# Plan 034: Region 2, Stonefall Hollows and the Bulwark

Spec: docs/specs/034-stonefall-hollows.md, with Shaun's decisions in docs/brainstorm/2026-10-19-open-questions.md (C, E, G, H, J, K; 034.1–034.15; H: lobbed rounds and mines always land against shields, straight shots and punches into the front are blocked). Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`).

**Scope cut (034.13, approved):** the spec's "Landmines" and "The cluster stage" sections are backlog item 038, built later. Nothing here builds `landmine`, `iron-plate`, the plate press, the mine packer, the Shard die, the `cluster` tag, hotbar key 4, `mineBursts` or armed mines in `getState()`. Their acceptance criteria, tests and screenshots are left for 038. Region 2's enemies are 035: until then its packs and the Cistern Terrace's guards are Husks and Wisps (034.14). docs/design.md already carries the 034 wording, so it isn't touched.

## Shape of the change
Small vertical commits, failing tests first in each:

1. **The map grows west, and the barrier.**
   - **Shift +40.** The Hollows take x 0–39 and the old map moves to x 40–119 (120×45). Every Region 1 tile in data (`overworld.ts`, `landmarkSites.ts`, `grotto.ts`, `springs.ts`, art's `fieldPaving`) moves +40; nothing else names tiles. `OVERWORLD.width` 120; a `REGION_1_X` (40) offset in data.
   - **Same terrain.** Region 1 is generated exactly as before, its RNG draws unchanged, offset by 40 and kept inside its own 80 columns (a generated cluster near its west edge never spills into the Hollows, so no extra draws). Its west forest edge stays as the border. The Hollows are generated after, from their own RNG (the map seed with a salt in data), in their 40 columns. Everything new in Region 1 (the road west, the approach to the gap) is stamped after generation, as 030/032 did, so the old stream is untouched and every old tile is the same, shifted.
   - **New tiles** (`TILE`): `cliff` `C` (solid, stops shots), `pillar` `P` (an aqueduct pillar or colonnade column: solid, stops shots), `fallen` `F` (a fallen span: solid, stops shots), `arch` `A` (walkable under a standing arch; shots pass), `terrace` `=` (a quarry-cut terrace step: walkable). Rubble is the existing rock `R`, drawn as Hollows rubble there. `WALKABLE` gains `A` and `=`.
   - **`src/data/hollows.ts`** (new): bounds, generator settings (cliff map edge depth and raggedness, cliff runs, rubble, terraces), the east wall with its 4-tile gap, the `hollows` gate tiles, the road (the old west path's end (52, 27) west to the gap, then on to the Terrace, the spring and the arena), the arena, its boss start, altar and offering, the aqueduct span and a second quarry wall, the `?start=hollows` spawn. `ringOf` returns 3 anywhere inside the bounds; `regionAt` returns 2 there (1 elsewhere).
   - **The barrier:** `GateId` gains `hollows`; `Gates.hollows` starts shut on every start (even the open-gated ones) unless the start's claims include the shrine. `stepGates` opens it, with its `gates` event, the tick the shrine is claimed. Its tiles are solid to feet (as the shrine's are) and, while shut, stop arrows, orbs and bombs (a bomb whose ground point reaches one bursts there). A KO never shuts it (gates are kept).
   - `?start=hollows`: the playtest kit, attuned, gates open, the shrine claimed (so the barrier is down and the Terrace's pylon awake), standing just inside the gap; not populated, so tests start calm.
2. **Region data: landmarks and the site.**
   - `src/data/hollowsSites.ts` (new): the Ley-iron Cut (a resource-site landmark: a quarry face of cliff with five `ley-iron-seam` nodes under it and two boulders; no pylon of its own, its ley-iron and stone are the Terrace's area), the Broken Aqueduct (pillars, arches and fallen bays across the region, with rubble spilled below the fallen ones), the Cistern Terrace (pylon, broken terrace walls, a fixed guard pack of six placeholders, a ley line home) and the Hollows Ley Spring (030's rules, in `SPRINGS`). `LandmarkDef` gains ring 3, `stamps` (hand-placed tiles of any symbol) and an `aqueduct` marker; `LandmarkPylon.supplies` becomes a list.
   - `SITE_SUPPLY['cistern-terrace']` = ley-iron and stone. A `ley-iron-port` fixture on the foundry's west wall at (1, 3), above the wood port (the bench stays clear at (1, 12)). The Terrace joins the waystone's menu through 032's claimed-pylon list.
   - Population: ring 3 slots (6 packs of 4–5, ring 2's Husks and Wisps until 035), spawning only once the barrier is down, only on ground reachable from the gap, never in the arena.
   - The 017 flood-fill test and 032's landmark tests extended to the Hollows; reachability from the barrier.
3. **Ley-iron:** item `ley-iron` (raw), node `ley-iron-seam` (3 uses, regrowth and remains as 018) with placement `cliff-seam` (the tile north of it is a cliff), the Bulwark drops it.
4. **The shield rule and the Bulwark** (`src/sim/shield.ts`, `src/sim/bulwarkAi.ts`, `src/sim/enemyBombs.ts`, all new):
   - `shield?: { arcDegrees, turnDegPerSec }` on enemy defs; every enemy keeps a continuous `angle`. A shielded one turns toward its target at most `turnDegPerSec`.
   - An arrow, ley bolt or star shard whose hit point's bearing from the enemy's feet is within `arcDegrees / 2` of its angle is blocked: no damage, it stops (piercing or not), no star burst, a `blocked` event. A punch is tested by the player's bearing: no damage, no knockback. Bomb bursts are never tested.
   - `bulwark` (`kind: 'bulwark'`, `boss: true`): the spec's starting values. Modes `chase` (walk 18 px/s toward the player inside its arena, turning), `lob` (30-tick wind-up, still turning) → `throw` (the bombs leave), and the pound's `windup` → `swipe` → `recover` (no turning). The lob cooldown counts from its wind-up's start; the pound's 300 from its wind-up's start, as the Warden's.
   - Enemy bombs: one at the player's feet, the rest within `lob.scatter` (seeded RNG); each a ring of `lob.radius` with a disc growing over `lob.fuseTicks`; at the fuse's end, `lob.damage` and knockback to the player's feet inside (roll i-frames and hit invulnerability as any hit). They never touch enemies.
   - Aggro when the player's feet enter the arena; it never steps out of the arena; 300 ticks with the player outside (or KO'd), it walks home and heals.
5. **Altar refights and first-kill effects** (`src/sim/altar.ts`, new): `bossDefeats` (kept through a KO; a defeated boss's placement no longer spawns), `summoned` (a summoned boss lives, kept through a KO), the altar (solid, by the arena's west wall): dim before the first kill, awake after, spent while its boss lives or rises. E at it is swallowed by the sim; render opens the offering row; the `summon` command pays 8 ley-iron and starts a 120-tick rise at the start point (`summons` event). The first kill: `bossDefeats` event, and the sealed wing (033) unseals (its node marked restored).
6. **Goals:** after "Claim a second pylon": "Breach Stonefall Hollows" (`inRegion 2`), "Claim the Cistern Terrace's pylon" (`claimed`), "Defeat the Bulwark" (`bossDefeated`), "Restore the intake's third entrance (E with the Bulwark core)" (`restored entrance-3`), then 028's "Feed all three entrances".
7. **Hook:** `getState()` gains `area.region` and ring 3, `gates.hollows`, `bosses` (health, angle in degrees, mode, lob and pound cooldowns, engaged), `enemyBombs` (position, radius, fuse and progress), `bossDefeats`, `altars` (state, summon ticks) and the events `blocked`, `bossDefeats`, `summons`, `enemyBursts`, `lobs`, `pounds`.
8. **Render, art, sound:**
   - Hollows ground (grey-blue stone, quarry-cut terraces, cyan veins, rubble) in its own painter, standing sprites for cliffs (lit top edge), pillars, arches over walkable bays, fallen spans, Hollows rubble; the forum's and the terrace's paving; minimap colours.
   - The barrier: a shimmering cyan wall over the gap, collapsing (fade, shards, flash) with a sound on its gate event.
   - The Bulwark rig (3 views; idle, walk, turn, lob wind-up, throw, pound wind-up, pound, recover, hit, death) behind a rune-carved shield plate, a glowing core seam on its back; a brass shield flash and spark with a clang on `blocked`. Its pound circle in the Warden's style; enemy bombs as two red circles with the bomb arcing in; a boss bar with its name along the top while engaged.
   - The altar (dim, awake, summoning) with the cracking red circle, the offering row (033 restore-panel style), the `ley-iron-seam` node frames and remains, the `ley-iron` icon, the Terrace's pylon, the aqueduct icon on the minimap.
   - Palette entries for Hollows stone, rust and cyan veins (docs/art.md lists them). Sounds: barrier collapse, shield clang, enemy bomb tick and burst, pound, summon (synth recipes).
   - New `ui()` fields behind `RoomViews`, `EnemyView`/`HudView` and `SiteMenus`: the barrier, the boss bar, the altar and its menu, enemy bombs drawn.

## Tests (written first)
- **Vitest**
  - `tests/sim/hollows.test.ts`: deterministic generation; the old map is the same tiles shifted +40; cliffs and pillars stop feet and arrows, bombs land over them; the map edge is cliff; `ringOf` 3 and `regionAt` 2 everywhere inside; every Hollows landmark, node, guard, the pylon, the altar and the arena reachable from the barrier.
  - `tests/sim/barrier.test.ts`: shut before the shrine claim (blocks the player, enemies, arrows and bombs), open on the claim with its event, still open after a KO; `?start=hollows` starts open.
  - `tests/sim/leyIron.test.ts`: harvest, regrowth, remains; the Terrace's claim adds the ley-iron port and a pylon to the stone port; the waystone lists it.
  - `tests/sim/shield.test.ts`: front arrow blocked and stopped even piercing; back arrow lands; front punch does nothing; a bomb on the front side lands; turning capped at `turnDegPerSec`.
  - `tests/sim/bulwark.test.ts`: lob count and the bomb at the feet, the fuse, damage inside and not outside, a roll avoids it, no damage to enemies; pound triggers in range, damages inside, holds its angle through the recovery; aggro on entering the arena; the leash and full heal; a KO before the first kill resets it; the first kill is permanent; determinism.
  - `tests/sim/altar.test.ts`: dim before the first kill; the offering spent; the rise after 120 ticks; the same drops; spent while one lives; a summoned one survives a KO.
  - `tests/data/hollows.test.ts`: data references, rings, the new port, the goal order.
  - Rewritten deliberately: tests naming Region 1 tiles move +40 (through `OVERWORLD` where they hard-coded), landmark-list and pylon-list expectations gain the Hollows', ring types gain 3, seeded expectations moved by the shift.
- **Playwright** `tests/e2e/hollows.spec.ts`: with `?playtest`, claim the shrine, walk west, see the barrier drop (gate event and the wall gone); with `?start=hollows`: claim the Cistern Terrace; fight the Bulwark with arrows from behind (front hits blocked) and win; the core drops; summon it again at the altar. `tests/e2e/hollowsShots.spec.ts` with `REVIEW_SHOTS=1` into docs/review/034/: the barrier and breached, the Ley-iron Cut, the aqueduct, the Cistern Terrace, the Bulwark facing the player, mid-turn, mid-lob with the circles, the pound circle, a blocked-hit spark, the altar dim and awake, the art on the contact sheet. (Armed mine and cluster burst shots: 038.)

## Not dictated by the spec
- The shift is +40 (the spec allowed either); every test names tiles through data.
- Tile positions: the gap at (38–39, 26–29) with the barrier on x 39; the road on rows 27–28; the Cut along a quarry face at y 4 (x 17–33); the Terrace's pylon at (25, 12); the aqueduct along y 20 (x 4–35); the spring at (7, 26); the Sunken Forum inside (3–21, 30–42) with its way in on the north (x 10–14), the Bulwark's start at (12, 36) and the altar at (5, 36).
- The Ley-iron Cut has no pylon: the Cistern Terrace beside it is the region's one claimable site and sends its ley-iron and stone (the spec's "claims the region's pylon"). The Terrace's guards hold both.
- Ring 3's pack count and size (6 of 4–5, 035's starting values) with ring 2's makeup; ring 3 has no champion chance until 035 adds one; its packs only appear once the barrier is down.
- Enemy-bomb knockback 24 px over 6 ticks (the spec gives damage only); the pound's knockback over 8 ticks; the throw pose holds 12 ticks; the pound pose 8.
- A blocked star round doesn't burst; a blocked arrow records the enemy as hit.
- A summoned Bulwark lives through a KO (and a rise in progress completes), so a KO never eats the offering.
- The sealed wing "unseals" by its node being marked restored: its door is drawn gone; what's inside is a later spec.
- The ley-iron port at (1, 3).

## Build notes
(filled in as the build goes)

## Notes for Shaun
(filled in at the end)
