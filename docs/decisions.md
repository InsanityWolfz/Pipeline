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
