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
