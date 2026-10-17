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
- **Camera view:** three-quarter, chosen by Shaun after playtesting both. The straight-down view and its sprites still exist behind `?view=top` / V until a cleanup decides their fate.
- **Commands:** render turns input into a per-tick `Command` (`moveX`, `moveY` in -1/0/1, `dodge` as a press edge). The keyboard latches a Space press until a tick consumes it, so presses aren't lost on frames that run no ticks. `__GAME__.step(frames, command)` holds the command and applies its dodge on the first tick only.
- **Units:** sim positions are px (the feet centre); velocities are px per tick. Tuning in `src/data/player.ts` is per second and converted with `TICK_RATE`.
- **Movement:** velocity moves toward the target by a fixed vector step each tick (one rule for acceleration and deceleration). Diagonal input is normalized. Facing snaps to 4 directions, horizontal first on diagonals.
- **Roll timing:** a roll runs ticks 1–18 (invulnerable on 1–12) and ends at the start of the next tick, which then starts the 30-tick cooldown. Presses during the roll or cooldown are dropped, not buffered. When a roll ends the player keeps walk speed in the roll direction.
- **Collision:** a 16×8 feet box against the tile grid, moved one axis at a time and snapped flush, which gives wall sliding. Anything not floor (and anything outside the grid) is solid. Per-tick moves stay under a tile wide, so nothing tunnels. Velocity is zeroed on a blocked axis, so `getState()` reports real movement, including during a pinned roll.
- **Depth:** in three-quarter view, walls, ruin blocks, the crystal and the player sort by the bottom of their footprint. Tall sprites (32×48) use a bottom origin at their footprint's bottom edge.
- **Camera:** Phaser `startFollow` with lerp `CAMERA_LERP`, `setRoundPixels(true)` and bounds set to the room, centred on the player before following so the first frame doesn't snap.
- **Assets:** `src/data/assets.ts` stays import-free because the art build loads it on its own; the roll animation's frame rate (`'roll'` marker) is computed in `PlayerView` from `ROLL_TICKS`. Sprite keys carry a view suffix (`-34`, `-top`); left-facing frames are the side frames flipped.
