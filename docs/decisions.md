# Decisions

Technical choices and why. Newest last.

## 2026-10-17: Bootstrap
- **Versions:** Phaser 4.2.1 (pinned), Vite 8, TypeScript 6, Vitest 5, ESLint 10 with typescript-eslint strict. Playwright pinned to 1.56.1 because its Chromium (revision 1194) is preinstalled in the cloud environment.
- **Node 22.18+** so TypeScript scripts (the art build) can run with Node's built-in type stripping, no extra runner.
- **ESLint enforces the sim rules:** `src/sim` can't import Phaser or render code, or use `Math.random`, `Date` or `performance.now`.
- **Hooks are Node scripts** run as `node .claude/hooks/*.mjs`, so they behave the same on Windows, macOS and Linux. The Stop check skips when there's no `package.json` or only `docs/` changed.
- **Pages previews** use plain git in `.github/workflows/pages.yml`, only first-party GitHub actions. Vite uses `base: './'` so a build works at any path.
- **Phaser skills** are copied from the package (`node_modules/phaser/skills`) into `.claude/skills/phaser/` as reference docs. Claude Code only auto-discovers skills one level deep, so these are read on demand, as CLAUDE.md says, not auto-loaded.
- **Rule frontmatter** uses the documented list form (`paths:` then `- "glob"`).

## 2026-10-17: 001 Scaffold
- **RNG:** sfc32 seeded through splitmix32. Fast, well tested, and its whole state is four 32-bit numbers, so it serializes with the sim as a plain array.
- **Fixed timestep:** 60 ticks per second through a pure accumulator (`src/sim/clock.ts`). Render passes in its frame delta; the sim never reads time. At most 10 ticks run per frame, so a stall drops time instead of freezing to catch up.
- **Test hook control:** the first `__GAME__.step()` call takes the sim off the real-time loop for the rest of the session. Tests call `step(0)` first so nothing ticks between their reads.
- **Hook stays out of production:** it's installed under `import.meta.env.DEV`, and the Pages workflow fails if `__GAME__` appears in `dist/`.
- **Integer scaling:** Phaser `Scale.NONE` with `MAX_ZOOM`, recomputed on window resize, centred. The page background (`outline` color) letterboxes.
- **Art build output is committed** (`assets/build/sprites.*`) so the game runs straight after a clone and Aseprite can open the sheet. `npm run build` regenerates it, so Pages always uses fresh art. The review images aren't committed.
- **Art script runs on Node's built-in TypeScript stripping** (`node scripts/build-art.ts`), so it uses `.ts` import paths and only erasable syntax (`erasableSyntaxOnly` in tsconfig).
- **Palette access:** code reads colors through `paletteHex(id)` and `hexToRgb()` in `src/data/palette.ts`, never hex literals. `index.html` keeps the outline hex in CSS with a comment pointing at the palette.
- **Stale-art guard:** a unit test rebuilds the atlas into a temp folder and compares it byte for byte with the committed `assets/build/sprites.*`.

## 2026-10-17: 002 Movement
- **Camera view:** three-quarter, chosen by Shaun after playtesting both. The straight-down view, its sprites, `?view=` and the V toggle were then removed (Shaun's call), so sprite keys no longer carry a view suffix.
- **Commands:** render turns input into a per-tick `Command` (`moveX`, `moveY` in -1/0/1, `dodge` as a press edge). The keyboard latches a Space press until a tick consumes it, so presses aren't lost on frames that run no ticks. `__GAME__.step(frames, command)` holds the command and applies its dodge on the first tick only.
- **Units:** sim positions are px (the feet centre); velocities are px per tick. Tuning in `src/data/player.ts` is per second and converted with `TICK_RATE`.
- **Movement:** velocity moves toward the target by a fixed vector step each tick (one rule for acceleration and deceleration). Diagonal input is normalized. Facing snaps to 4 directions, horizontal first on diagonals.
- **Roll timing:** a roll runs ticks 1–18 (invulnerable on 1–12) and ends at the start of the next tick, which then starts the 30-tick cooldown. Presses during the roll or cooldown are dropped, not buffered. When a roll ends the player keeps walk speed in the roll direction.
- **Collision:** a 16×8 feet box against the tile grid, moved one axis at a time and snapped flush, which gives wall sliding. Anything not floor (and anything outside the grid) is solid. Per-tick moves stay under a tile wide, so nothing tunnels. Velocity is zeroed on a blocked axis, so `getState()` reports real movement, including during a pinned roll.
- **Depth:** in three-quarter view, walls, ruin blocks, the crystal and the player sort by the bottom of their footprint. Tall sprites (32×48) use a bottom origin at their footprint's bottom edge.
- **Camera:** Phaser `startFollow` with lerp `CAMERA_LERP`, `setRoundPixels(true)` and bounds set to the room, centred on the player before following so the first frame doesn't snap.
- **Assets:** `src/data/assets.ts` stays import-free because the art build loads it on its own; the roll animation's frame rate (`'roll'` marker) is computed in `PlayerView` from `ROLL_TICKS`. Left-facing frames are the side frames flipped.

## 2026-10-17: 003 Tube firing
- **Commands:** `Command` gains `aimX`/`aimY` (world px), `fire` (held) and `load` (a press edge, latched like dodge). Render reads the cursor's world point each frame with `camera.getWorldPoint`. `NO_COMMAND` aims at the world origin, so callers that care about aim set one. `src/render/controls.ts` (`Controls`) replaces `keyboard.ts`.
- **Tick order:** movement, then arrows, then the tube. Roll checks see a roll on the tick it starts. A new arrow sits at the muzzle until the next tick's step, and that step checks both the point it starts on and the point it reaches, so an arrow spawned in a wall is gone on its first tick.
- **Tube timing:** the cooldown counts down at the start of each tick. With a 15-tick interval, held fire shoots on ticks 1, 16, 31… A dry fire also spends the interval, and both firing and dry-firing stop loading. Loading moves one round on its 15th tick.
- **Arrows:** a plain array in `SimState` with ids from `nextArrowId`, so render can pool sprites by id. Collision is a point test at the ground point against the tile grid. Steps are 8 px, under a tile, so arrows can't tunnel. Damage and type are copied onto each arrow from `src/data/ammo.ts` for 004.
- **Inventory:** `Record<itemId, count>` in `SimState`, seeded from `STARTING_INVENTORY`. The slot's item comes from `slotItem()` in `src/sim/tube.ts`, which the sim and the HUD share.
- **Render:**
  - The tube is a separate sprite at a per-direction grip offset (`TUBE_GRIP` in `src/data/assets.ts`), sorted just in front of or behind the player and hidden during a roll.
  - Arrows are drawn `DRAW_HEIGHT` above their ground point and sort by it. Their shadows draw at depth 0, above the floor.
  - The HUD and crosshair use scroll factor 0, and the system cursor is hidden.
- **HUD font:** the numbers are the `hud-digits` sprite font (0–9 and `/`), because Phaser text blurs at 640×360 under integer zoom. The slot layout numbers live in `HUD_SLOT_LAYOUT`.
- **Test hook:** `step()` keeps the player's last aim when a command gives none, as a still mouse would. The load press applies on the first tick only, like dodge.
- **TypeScript:** `erasableSyntaxOnly` rules out constructor parameter properties, so classes assign their fields in the constructor.

## 2026-10-18: 004 Enemies
- **Tick order:** clear events, then the player, enemies (AI, swipe, movement, separation), arrows (with hits), dead-enemy removal and drops, the tube, pickups, and finally the KO check. Enemies act after the player moves, so a swipe lands on where the player stands now.
- **Enemy behaviour** is a mode machine in `src/sim/huskAi.ts`: idle, chase, windup, swipe, recover, return.
  - Each timed mode counts its first tick as 1, so the wind-up's tick 37 is the swipe.
  - Every number comes from the enemy def, so the next melee enemy is data.
- **Aggro box:** the view size (640×360) centred on the player's feet, never the camera, so the sim stays render-free.
  - The off-screen count runs through a swipe, and the leash applies once the swipe recovers.
- **Knockback** (`src/sim/knockback.ts`) is a per-tick push added on top of the body's own move. Input still steers a knocked player, and walls stop the push through `moveBox`.
- **Separation:** overlapping enemies are pushed apart along the axis of least overlap, half each, in array order, so it's deterministic. A body stopped by a wall leaves the rest of the push to the other. The player never collides with enemies.
- **Arrow hits:** `stepArrows` takes a hit test that runs before the wall test at both the start and end point. The hit goes to the live enemy whose hurtbox holds the point and that sits furthest back along the flight. Hurtboxes are boxes on the ground point, offset from the feet.
- **Events:** `SimState.events` (hits, deaths, pickups, ko) is cleared every tick. `GameScene.stepOnce()` gathers them across multi-tick frames for the next draw, and the test hook steps through it.
- **KO reset:** `resetRoom()` rebuilds the player, inventory, tube, arrows, ground items and enemies from room data. It keeps the tick, seed, RNG and every id counter, so a replay differs after a KO and render pools never reuse an id.
- **Drops:** a drop table rolls fixed items plus one chance item through `rng.ts`. Each item scatters to a clear spot within 12 px (8 tries), falling back to the corpse point. Pickup is distance from the item to the feet box.
- **Render:**
  - Depths live in `DEPTHS` in `src/data/assets.ts`.
  - Hit flashes use `setTint(white).setTintMode(TintModes.FILL)`, since Phaser 4 has no `setTintFill`, and `clearTint()` also resets the mode.
  - The telegraph is a Graphics `slice` on the ground.
  - Enemy animations switch only when the key changes, so one-shot swipes hold their last frame.
- **Art workflow:** the Husk grids were generated from simple shapes (auto outline and shading) by a scratch script and committed as ordinary grids. They're edited by hand from here.

## 2026-10-18: 005 Hand crafting
- **Tick order:** clear events, then the player, enemies, node regrow, the harvest, straight shots (with hits), burns, bombs (flight and bursts), dead-enemy removal, the tube (select, then fire or load), pickups and the KO check.
  - The harvest runs before the tube, so fire, load or an ammo switch on the same tick cancels it, and starting one stops loading.
  - Burns run before bombs, so a burst's first burn damage lands exactly `everyTicks` after it.
- **Crafting** is a sim action, `craft(state, recipeId)` in `src/sim/crafting.ts`, called between ticks by the menu and by `__GAME__.craft()`, since the menu pauses the sim and no tick runs to carry a command. It's deterministic: a replay is the same steps and crafts in the same order. Its events land in the previous tick's list.
- **Obstacles:** `moveBox` takes solid rects besides the tile grid, stopping flush against them the same way. Gathering nodes are the only rects so far, full or depleted. Rects a body already overlaps don't stop it, so nothing jumps out of one. Projectiles ignore them.
- **Harvest drops** scatter around the point of the node's box nearest the player and skip spots inside any node, so a drop is always reachable. Enemy drops skip node boxes too.
- **Ley bolts** are straight shots in `state.arrows`, like arrows, with `pierce` on their ammo. Each shot keeps `hitIds`, so a bolt hits each enemy once even when a knockback pushes the enemy along its flight. `getState().arrows` lists both, with `ammoId`.
- **Ammo** is a discriminated union in `src/data/ammo.ts`: `straight` (arrow, ley bolt) and `lob` (bomb). Fire intervals moved from the tube into each ammo's `fireTicks`.
- **Bombs** fly on the ground from the muzzle to the target in `ceil(distance / step)` ticks, at least 1. The arc height is `4·peak·t·(1−t)`, reported for render only. A burst flashes but doesn't knock back. A burn is `burnTicks` plus the ammo that set it, and a new burst resets it.
- **Controls:** presses are latched from each key's `down` event instead of `JustDown`. Phaser's `Key.onUp` clears `_justDown`, so a tap that went down and up between two frames was lost. That also fixes the same loss for Space and R.
- **Menu:** `GameScene` handles C, Esc and menu clicks even under the test hook's manual clock, so e2e tests can gather with `step()` and then craft by clicking. While the menu is open the real-time loop skips the clock entirely, so no time is banked and the game doesn't catch up on close.
- **Render:** `GlyphLine` moved to `src/render/glyphLine.ts` for the HUD, the ammo strip and the menu. The menu's row positions come from `src/render/craftMenuLayout.ts`, which has no Phaser import, so e2e tests can click rows.
