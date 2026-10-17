# Progress

Newest entry first.

## 2026-10-17: 002 Movement build
**Changed:** built 002 on `claude/002-movement`: walk, roll and feet-box collision in `src/sim`, movement tuning and the `ruin-hall` room in `src/data`, keyboard commands, room and player views, clamped camera and the `?view=` / V toggle in `src/render`; `__GAME__.step(frames, command)` and `setView()`. Sprites for both views drawn and approved by Shaun. Verify (check, e2e, qa screenshots) green; review addressed.
**Next:** Shaun playtests the Pages preview (`/branch/claude/002-movement/`, `?view=top` and V) and compares the two views; then `/wrapup`.
**Notes:**
- Shaun asked (in chat) that every reply end with what's needed from Shaun next; it's now a line in CLAUDE.md, committed on this branch.
- Chosen here, not by the spec, to check in the playtest: after a roll the player keeps walk speed in the roll direction (drifts ~5 px when no key is held); sliding diagonally along a wall runs at ~71% of walk speed; diagonals show the side sprite.
- At wrapup, update CLAUDE.md's hook line to `getState()`, `step(frames, command?)` and `setView()`.

## 2026-10-17: 002 Movement spec
**Changed:** interviewed Shaun and wrote `docs/specs/002-movement.md` (status: draft). Decisions: i-frame roll on Space in the move direction (facing when still), committed, with cooldown; snappy 8-way walk; 40×30 walled room with ruin blocks as data; smooth clamped camera; both three-quarter and straight-down views with `?view=` and a V toggle, each with its own sprite set.
**Next:** Shaun reviews and approves the spec, then `/plan`.
**Notes:** tuning values in the spec are starting points for playtest.

## 2026-10-17: 001 Scaffold
**Changed:** seeded RNG, fixed 60 Hz clock and plain-data sim state in `src/sim`; integer-zoom 640×360 render of a tiled floor with the ley crystal; `window.__GAME__` (dev only) with `getState()`/`step()`; Playwright smoke test; art pipeline (`npm run art`), `docs/art.md` and the 24-color dusk-ruins palette. Shaun approved the palette and both sprites by eye and played the Pages preview. 31 unit tests and the smoke test pass.
**Next:** `/spec 002` (movement). That interview is the place to settle the three-quarter vs straight-down camera test and how the dodge works.
**Notes:**
- Tests that use the hook should call `step(0)` first: it takes the sim off the real-time loop so nothing ticks between reads.
- After editing a sprite, run `npm run art`; `npm run check` fails if the committed atlas is stale.
- Only one floor tile exists, so the repeat is visible. Floor variants are worth adding with the first real map.
- The reviewer's unaddressed suggestions (single stepping entry point, local prod-build check, `nextInt` used only by tests) are small; pick them up when those files are next touched.

## 2026-10-17: Bootstrap
**Changed:** scaffolded Phaser 4 + TypeScript + Vite with an empty boot scene; added CLAUDE.md, .claude rules, commands, agents, hooks and settings; copied Phaser's skills; added the Pages preview workflow; created backlog, decisions and this log. `npm run check` passes.
**Next:** merge the bootstrap PR, then Shaun selects `gh-pages` / root in Settings → Pages. Then `/spec 001`.
**Notes:** process.md was updated before bootstrap (InsanityWolfz/Pipeline#1): PR-based wrapup, Pages previews, Node hooks.
