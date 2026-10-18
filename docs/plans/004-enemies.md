# Plan: 004 Enemies (docs/specs/004-enemies.md, approved)

## Context
Spec 004 adds the first fight: a pack of 3 Husks with RotMG-style aggro, a telegraphed arc swipe, player health with a placeholder KO reset, arrow hits/knockback/death, and resin drops collected by walking over them. This is a vertical slice: sim rules, data, render and art land together on `claude/004-enemies`, which already holds the spec commit.

## Tests first (written failing before code)

**`tests/sim/health.test.ts`**
- Player starts at 100/100. A connecting swipe deals 20 and sets 30 ticks of hit invulnerability.
- No damage or knockback during hit invulnerability, or during roll i-frames (ticks 1–12). A hit on roll tick 13+ lands.
- Knockback is 24 px directly away from the Husk over 6 ticks, stopped flush by a wall. Input adds on top.
- A hit stops loading: loaded rounds stay, progress resets to 0, and the round stays in the inventory. Firing is unaffected.
- KO: at 0 health the KO flag is set for that tick only. Player at spawn with full health, 30 arrows, empty tube, Husks at home and full (new ids), no ground items, no arrows. The RNG state is not reset (the next drop roll differs from a fresh sim's).

**`tests/sim/husk-ai.test.ts`** (uses `openRoom()` and a new `huskIn()` helper)
- Aggro box:
  - An idle Husk at (321, 0) or (0, 181) from the player stays idle.
  - At (320, 0), (0, 180) and the corners (±320, ±180) it aggros.
  - An arrow hit from off screen aggros it.
- Chase: moves at 50/60 px per tick straight at the player's feet and slides along a wall. Facing follows movement.
- Leash:
  - The Husk goes to return after 60 consecutive off-screen ticks, not 59.
  - Coming on screen at tick 30 resets the count.
  - A returning Husk re-aggros on screen and when hit.
  - It heals to full and idles within 4 px of home.
  - A Husk in wind-up/swipe/recover finishes before leashing.
- Swipe:
  - A wind-up starts at ≤28 px with the cooldown over, stops movement and locks the direction.
  - The hit lands on tick 37 when the player is inside 40 px / ±60°. Edge cases: exactly 40 px, just over; 59° in, 61° out.
  - A sidestep during the wind-up dodges it. A roll through it takes no damage.
  - Recover lasts 24 ticks, then chase resumes. The cooldown is 60 from wind-up start.
  - Knockback during the wind-up moves the Husk but keeps the locked direction (the arc is measured from the new position).
- Separation: two Husks placed overlapping end up not overlapping, and neither is pushed into a wall. The player walks through a Husk unblocked.

**`tests/sim/combat.test.ts`**
- An arrow whose ground point enters the hurtbox is removed and deals 10. With two Husks in line, only the first is hit (no pierce).
- Husk knockback is 6 px along the arrow direction over 4 ticks, stopped by walls. The hit flash lasts 6 ticks.
- 4 arrows kill a Husk: it's removed, a death event (x, y, facing) is recorded and drops are rolled.
- An arrow that hits a Husk standing right in front of a wall still counts as a hit.

**`tests/sim/drops.test.ts`**
- Over many seeds: resin is always 1–2. The extra item comes up about 50% of the time and is only ever wood/stone/fiber. The same seed gives the same drops.
- Scatter lands within 12 px, never inside a solid tile, and falls back to the corpse point when boxed in.
- Pickup happens when an item comes within 8 px of the feet box: the inventory goes up, the item is removed and a pickup event is recorded. Items persist when the player stays away.

**`tests/sim/sim.test.ts`** (extend): a scripted fight (walk to the pack, load, fire, take a hit, kill, pick up, get KO'd) replays tick for tick under the same seed. `summarize()` has the new fields.

**`tests/data/data.test.ts`** (extend):
- Enemy, item and drop-table ids are kebab-case and exist.
- Every room enemy references a known enemy on a floor tile.
- `ruin-hall` Husks start off screen from spawn (outside the aggro box).
- Every new sprite and animation frame is in the atlas.
- The `+` glyph exists in the HUD font.

**`tests/e2e/enemies.spec.ts`** via `__GAME__` (each test fails on console errors):
- Walking toward the pack aggros the Husks.
- Standing still gets the player swiped, and health drops by 20.
- Rolling through the wind-up keeps health at 100.
- Loading, then shooting a Husk to death, makes drops appear. Walking onto them raises the inventory counts.
- Walking away sends the Husks home at full health.
- Taking swipes to 0 triggers the KO reset.

## Sim (src/sim): tick order and files

`stepSim` order: clear events → player (walk/roll + knockback, hurt timers) → enemies (AI, swipe → damage player, movement, separation) → arrows (move, walls, hit enemies → damage, death, drops) → tube → pickups → KO check.

| File | Change |
| --- | --- |
| `events.ts` (new) | `SimEvents { hits, deaths, pickups, ko }`, cleared at the start of each tick. |
| `player.ts` | `PlayerState` gains `health`, `hurtTicks`, `knockX`, `knockY`, `knockTicks`. |
| `movement.ts` | Adds the knockback step to the walk/roll velocity before `moveBox`. Counts down `hurtTicks`. |
| `health.ts` (new) | `damagePlayer(state, amount, fromX, fromY)` checks `isInvulnerable` and `hurtTicks`, applies damage and knockback, and stops loading (reuses `stopLoading`, exported from `tube.ts`). Also `checkKo(state)` → `resetRoom(state)`. |
| `enemies.ts` (new) | `EnemyState` (id, enemyId, x, y, homeX, homeY, facing, state, stateTicks, offScreenTicks, cooldown, health, swipeDirX/Y, knock*, flash), `createEnemies(room, nextId)`, `damageEnemy`, `stepEnemyMovement` and `separate` (pairwise push-out via `moveBox`, array order, so it's deterministic). |
| `huskAi.ts` (new) | `inAggroBox`, the idle/chase/wind-up/swipe/recover/return state machine and the swipe arc test. Reads all numbers from the enemy def, so it's generic to any melee enemy def. |
| `arrows.ts` | `stepArrows(arrows, room, hit?)` takes a callback tried at the start and end point before the wall test, so a Husk against a wall still gets hit. |
| `drops.ts` (new) | `rollDrops` (seeded via `nextInt`/`nextFloat`), scatter with ≤8 tries, `GroundItem`, `stepPickups`. |
| `state.ts` | `SimState` gains `enemies`, `nextEnemyId`, `groundItems`, `nextGroundItemId` and `events`. `resetRoom(state)` keeps `tick`, `seed`, `rng` and the id counters, so render pools never reuse an id. |
| `step.ts` | The order above. |
| `summary.ts` | Player `health`/`maxHealth`/`hitInvulnerable`/`ko`; `enemies[]`; `groundItems[]`; `events`. Helpers go in a second file if it passes ~300 lines. |

Notes:
- **Facing:** reuses `aimFacing`/`facingVector`/`unit` from `direction.ts`.
- **Collision:** reuses `moveBox`/`isSolid` from `collision.ts`.
- **Swipe timing:** wind-up ticks 1–36. On tick 37 the state becomes `swipe` and the hit check runs once. `swipe` stays on for `swipeTicks` (6, so the animation can play), then recover runs 24. **Heads-up:** with these numbers a swipe cycle is 66 ticks, so the spec's 60-tick cooldown never actually binds. I'll keep it as specced (it matters if recover is tuned down).
- **Chase hold:** inside 28 px with the cooldown still running, a chasing Husk holds position rather than walking into the player.

## Data (src/data)
- **`enemies.ts` (new):**
  - `EnemyDef` with the numbers from the spec's Data changes.
  - Feet box 16×8.
  - Hurtbox 20×24, anchored on the body above the feet, so it covers the body at arrow chest height in projection and the ground point. To be confirmed against the sprite.
  - `swipeTicks: 6`.
  - Drop table: `{ always: [{ item: 'husk-resin', min: 1, max: 2 }], chance: 0.5, oneOf: ['wood', 'stone', 'fiber'] }`.
  - `DROP_SCATTER = 12`.
  - Animation key references.
- **`rooms.ts`:** `Room.enemies?: { enemyId; tx; ty }[]`. `ruin-hall` gets Husks at (31,4), (33,5) and (32,7), all floor tiles, about 384 px right of and 416 px above spawn, so they're off screen.
- **`player.ts`:** `MAX_HEALTH 100`, `HIT_INVULN_TICKS 30`, `PICKUP_RADIUS 8`.
- **`items.ts`:** `husk-resin`, `wood`, `stone`, `fiber`. Each item uses **one sprite for both the ground and its HUD icon** (16×16). That trims the art; I'll split them later if they read badly.
- **`assets.ts`:**
  - `HUSK_ANIMS`: idle/walk/windup/swipe/hit in down/up/side, plus death. The side view is flipped for left.
  - The `player-hit-{down,up,side}` poses.
  - `pickup-sparkle` (4 frames), `hud-health` frame, `+` added to `hud-digits`.
  - Layout tables for the HUD health bar and the material column.
  - The telegraph palette ids (`ember`).
  - The flash colour (`mist`, the palette's lightest; no pure white).

## Render (src/render)
- **`GameScene.ts`:** a `stepOnce(cmd)` that runs `stepSim` and appends that tick's events to a frame queue. Both the real-time loop and `testHook.ts` call it, so events from multi-tick frames aren't lost. `draw()` hands the queue to the views and clears it.
- **`EnemyView.ts` (new):**
  - Sprites are pooled by enemy id and depth-sorted by the feet.
  - The animation follows state and facing.
  - Flash: `setTint(mist).setTintMode(TintModes.FILL)` while `flash > 0` (the Phaser 4 API, per `.claude/skills/phaser`).
  - Health bar: a Graphics bar over the Husk when health is below max.
  - Telegraph: a Graphics pie slice on the ground (depth just above the floor) at the reach, arc and locked direction. Its inner radius fills in with wind-up progress.
- **`EffectsView.ts` (new):**
  - Death: on a death event, play the death animation, then fade the corpse.
  - Sparkle: on a pickup event, play the sparkle and a rising "+1 [icon]" (hud-digits plus the icon) that fades.
  - KO: on a KO event, `camera.fadeOut`, then `fadeIn` (~250 ms each), and re-centre the camera on spawn.
- **`GroundItemView.ts` (new):** item sprites pooled by id, each with a small shadow.
- **`PlayerView.ts`:** shows the hit pose for the first 8 ticks of `hurtTicks`, then flickers (alternating visibility every 4 ticks) while `hurtTicks > 0`.
- **`HudView.ts`:** a health bar (frame sprite plus a fill) and a material column, both top-left. The column lists the icon and count of each non-arrow item with a count above 0, in `ITEMS` order.

## Art (`/sprite` flow, reviewed by Shaun at 4×)
- **Husk**, 32×40, a hunched, resin-crusted husk of a ley-drained ruin-dweller in slate, earth and amber resin tones with dim cyan cracks. Poses:
  - idle (1 frame) and walk (4 frames) in down/up/side
  - wind-up (1 frame) and swipe (2 frames) in down/up/side
  - hit (1 frame) in down/up/side
  - death (4 frames)
- **Items:** 4 item sprites at 16×16.
- **Other sprites:** `pickup-sparkle` (4 frames), `player-hit-*` (3 frames), the `hud-health` frame, and the `+` glyph.

## Build order (small commits)
1. Data stubs and the failing sim tests.
2. Player health and knockback.
3. Enemies, Husk AI and separation.
4. Arrow hits and death.
5. Drops and pickup.
6. KO reset.
7. Summary and the test hook event queue.
8. Placeholder-free render views, art drawn via `/sprite` and approved, `npm run art`.
9. HUD.
10. E2E tests.

## Verification
- `npm run check` passes (typecheck, lint, unit tests including the stale-atlas guard).
- `npm run test:e2e` passes (enemies.spec plus the existing specs).
- The qa agent takes the spec's screenshots: Husk poses, the telegraph start and full, the health bar, drops and the popup, the HUD, the KO fade.
- `/review` runs the reviewer agent against the spec.
- Shaun playtests the Pages preview at `/branch/claude/004-enemies/`.
