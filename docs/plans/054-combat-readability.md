# Plan 054: Combat readability

Spec: docs/specs/054-combat-readability.md (approved on draft: 054.1 and 054.2's proposals are built). Branch `claude/054-combat-readability`, from `main`. Each slice is vertical (sim rule, render view, data numbers, colours and words), tests first, its own commit, `npm run check` green at each. Anything the spec doesn't decide goes under "Raised after the build" in the spec with the most conservative choice built.

## Slices

### 1. The immune flag and the blue shield bar (E.1)
- **Sim** `src/sim/enemies.ts`: `immune(e)` — nothing can damage it now (a Burrower underground, an add still rising); `targetable` is its opposite, so every hit path (shots, Shards, punches, Bursts, homing locks, Stun) already follows it and a future immune state joins both at once. A shield's front isn't immunity (it can be hit from behind). Derived, so SimState's shape doesn't change. `getState()` enemies gain `immune`.
- **Data** `src/data/assets.ts` `ENEMY_FX`: the immune bar's colour (`water`) and the shield icon's key and gap; **art** `enemy-immune-shield` (a small blue shield) in `src/data/art/hud.ts`.
- **Render** `EnemyView.drawBar`: while immune the bar shows even at full health, its fill blue, with the shield icon at its left end; back to the normal bar (or none at full health) the moment it can be hit. `ui().enemyBars`: `{ id, shown, immune }` per drawn enemy.
- **Tests first** `tests/sim/immune.test.ts`: burrowed and rising are immune, surfaced and risen aren't, a Shardback or the Bulwark (shielded fronts) never is; `getState()` reports it. e2e (`tests/e2e/readability054.spec.ts`): in the hollows sandbox a burrowed Burrower's bar reads immune in `ui()`, normal once it surfaces.

### 2. The back wave's red shading (E.2)
- **Data** `HOLLOWS_LOOK.wave`: a shade alpha and fill alpha, in danger red.
- **Render** `bulwarkLook.drawWave`: the whole rear arc shaded faintly red on the ground and a fill growing out to its edge through the wind-up (the pound's and stomp's style), the ripples drawn over it. `ui().hollowsEnemies.waveShade` counts the shaded waves.
- **Tests**: e2e: a building wave reports its shade.

### 3. The burning Pool arrow (E.3, 054.2)
- **Sim** `src/sim/keystones.ts`: `burning(arrow)` — it has drawn from a Pool (Blastfletch), for the rest of its flight (unlike `pooled`, which its Burst spends). Derived from `pooledBy`, no shape change. A burning arrow's hits carry `burning: true` in their hit events. Nothing extra happens (054.2). `getState()` arrows gain `burning`.
- **Data** `src/data/talentAssets.ts` `BURNING_LOOK`: the tip's flicker, the ember trail (cinder colours, points, width) and the hit flash's size and time; **art** `burning-tip` and `burning-flash` in `src/data/art/talents.ts`.
- **Render** `ArrowView`: a burning arrow gets the flame tip and ember trail from the tick it takes the Pool; `TalentFxView`: a small flash on each burning hit. `ui().tagged.burning` counts burning arrows drawn.
- **Tests first** `tests/sim/keystones.test.ts`: an arrow through a Pool is burning and stays burning after its Burst; an arrow outside a Pool, or without the talent, isn't; its hit events say so.

### 4. Homing at about 60% speed (E.4)
- **Data** `src/data/tags.ts`: `HOMING.speedScale: 0.6`; a tag's `speedScale` applies to its rounds' speed in `src/data/ammo.ts` (so a homing bolt flies 180 px/s against a plain bolt's 300, the same turn rate and range). The Shot keyword's speed reads the homing rounds' own speed in breakdowns.
- **Tests first** `tests/sim/homing.test.ts`: a homing bolt's speed is 0.6 of a plain bolt's, frost too; the turn rate is unchanged; it still curves in and hits.

### 5. The star shot (E.5, 054.1)
- **Data** `src/data/tags.ts` `SPLIT`: `damageShare: 0.5` (the Shard's damage before stats is half its bolt's), `range: 96` (3 tiles); the Split keyword's text (039) from 054.1: "On hit: 5 Shards fly out, each dealing half damage to another enemy." **Art** the Shard redrawn bigger and brighter, with a short cyan trail (`ROUND_LOOKS`-style look for Shards).
- **Sim** `src/sim/combat.ts`: Shards' damage is half the bolt's base damage through the Shards' stats (so Ley and All-ammo bonuses still reach them once); 5 evenly spaced, skipping the struck enemy (as now).
- **Render** `ArrowView`: the Shard's trail. `ui().tagged.shards` counts Shards drawn.
- **Tests first** `tests/sim/split.test.ts`: 5 Shards 72° apart, half the bolt's damage, range 96, the struck enemy skipped, the first other enemy hit; the keyword text. e2e: a star shot's Shards are drawn.

## Verify
- `npm run check`; the touched e2e files on port 5254 while building; the full `npx playwright test` once at the end on 5254.
- Review shots `tests/e2e/readability054Shots.spec.ts` (REVIEW_SHOTS=1, docs/review/054/): the blue bar on a burrowed Burrower and a rising add, the shaded back wave, a burning arrow, star Shards in flight. Older shots that show a burrowed Burrower, rising adds, the back wave or Shards rerun; only what 054 changes is retaken.
- `npm run measure` once; recorded, not tuned.
