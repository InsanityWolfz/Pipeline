# 001: Scaffold
status: draft

## Goal
The game has its technical foundation: a deterministic sim that runs separately from Phaser, a test hook that steps the game frame by frame, a Playwright smoke test, and a working art pipeline. The game shows a small floor of generated tiles with a ley crystal in the middle, so the Pages preview already looks like the game's art.

## Design references
- docs/process.md: "Repo layout and architecture" (rules 1 to 6), "Art pipeline", "Prototype backlog" item 001
- docs/prototype.md: "Camera and art" (three-quarter view, HD pixel art, theme check), open question "The locked palette for docs/art.md"
- docs/design.md: "World, regions, ley lines, bosses" (theme rule), "Tech and prototype scope"

## Acceptance criteria

**Sim**
- [ ] `src/sim/rng.ts` provides a seeded RNG. The same seed always gives the same sequence, and different seeds give different sequences.
- [ ] RNG state is plain data, so it can be saved and restored to continue the same sequence.
- [ ] `src/sim` advances in fixed ticks of 60 per second. Running N ticks gives the same state however the render frames are spaced.
- [ ] The sim state is plain serializable data: it holds the tick count and the seed.

**Render and loop**
- [ ] The game renders at 640×360 internally and scales up in whole-pixel steps, letterboxed, with no blurring.
- [ ] Render code reads sim state and never changes it directly.
- [ ] The seed defaults to a fixed value and can be overridden with a `?seed=` URL parameter.

**Test hook**
- [ ] In dev builds, `window.__GAME__.getState()` returns a compact JSON summary (at least `tick` and `seed`).
- [ ] In dev builds, `window.__GAME__.step(frames)` advances the sim exactly `frames` ticks and returns the new summary. While tests drive it, the real-time loop doesn't advance the sim.
- [ ] Production builds (and so the Pages previews) don't expose `window.__GAME__`.

**Smoke test**
- [ ] One Playwright test boots the game, checks there are no console errors, checks that `getState()` responds, and checks that `step(60)` moves `tick` forward by exactly 60.

**Art pipeline**
- [ ] `docs/art.md` locks the style: three-quarter top-down view, light from the top left, 32-pixel tiles, characters 32 wide and 32 to 48 tall, a one-pixel outline in the palette's darkest color, the theme rule, and the palette.
- [ ] The palette has about 24 colors in a "dusk ruins" mood: cool slate and violet stone, deep teal shadows, moss greens, warm ember highlights, with ley-line cyan as the signature accent. Its darkest color is a very dark blue-violet, not pure black.
- [ ] Sprites are text grids in `assets/sprites/`, one character per pixel, mapped to palette colors. Animations are sequences of grids.
- [ ] `npm run art` renders every grid to PNG sprite sheets plus Phaser atlas data in `assets/build/`. A grid using a character outside the palette fails the build with the file and position.
- [ ] Two sample sprites exist: a rune-carved stone floor tile (32×32) and a glowing ley crystal pickup.
- [ ] Their asset keys are registered in `src/data/assets.ts`, and the game loads them by those keys.
- [ ] The boot scene shows a floor of the sample tile with the ley crystal in the middle.
- [ ] Shaun approves the palette swatch sheet and both sample sprites by eye (shown at 4×).

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/assets.ts`: asset keys for the floor tile and the ley crystal.
- The palette (generated from or defined alongside `docs/art.md`), used by the art build.

## Out of scope
- Player, movement, input and camera follow (002).
- Any gameplay, entities or game rules beyond tick and RNG.
- Tiled maps. The floor is placed in code for now.
- Animated sprites in the game. The pipeline supports animation grids, but neither sample needs to animate.
- Testing a straight-down camera variant (002, when there's something to look at).
- Pause screen, menus and sound.

## Test plan
- **Vitest (`tests/sim`):** RNG determinism, seed difference and state restore; fixed-tick stepping gives identical state for the same input; the state round-trips through JSON.
- **Vitest (`tests/sim` or a data test):** every key in `src/data/assets.ts` has a built asset; the art build rejects an unknown palette character.
- **Playwright (`tests/e2e/smoke.spec.ts`):** boot with no console errors, `getState()` responds, `step(60)` adds exactly 60 ticks.
- **Screenshot (qa agent):** the boot scene shows the tiled floor and crystal, pixel-crisp at whole-pixel scale.
- **Shaun's review:** the palette swatch and both sprites at 4×.
- **Build check:** a production build contains no `__GAME__`.

## Open questions
None.
