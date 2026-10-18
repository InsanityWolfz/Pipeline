# Progress

Newest entry first.

## 2026-10-18: 004 Enemies spec
**Changed:** interviewed Shaun and wrote `docs/specs/004-enemies.md` (status: draft). Decisions: player health 100 with a placeholder KO that resets the whole room (011 replaces it); a pack of 3 Husks (40 HP, 50 px/s) with a 0.6 s wind-up and a 120° front arc locked at wind-up start, which a roll or a sidestep avoids; 20 swipe damage, 0.5 s hit invulnerability, knockback both ways, hit flash, enemy health bars; RotMG-style aggro (on screen or hit, chase while on screen, return home after 1 s off screen, re-aggro on return, heal to full at home, always damageable); drops of 1–2 husk resin plus a 50% wood/stone/fiber, walked over to collect, with a pickup popup and a HUD material column; a hit cancels loading; no regen.
**Next:** Shaun approved the spec and the `/plan` (copied to `docs/plans/004-enemies.md` so it survives the cloud container). Run `/build` next.
**Notes:** tuning values are starting points for playtest. Planning choices: one 16×16 sprite per material for both ground and HUD icon; a 6-tick `swipe` state for the animation; a chasing Husk holds position inside swipe range while its cooldown runs. With the specced timings a swipe cycle is 66 ticks, so the 60-tick cooldown doesn't bind yet. The aggro model came from the open-source RotMG server behaviors (`Follow`, `StayCloseToSpawn`).

## 2026-10-17: 003 Tube firing
**Changed:** built 003 on `claude/003-tube-firing`.
- **Sim:** inventory; the tube (tap R loads one round per 15 ticks into 6, hold left mouse fires at 4 shots/s, empty tube dry-fires, no firing or loading in a roll); arrows at 480 px/s that stop at walls or after 320 px.
- **Data:** the arrow item and ammo, tube tuning, a starting stack of 30.
- **Render:** mouse aim, the tube held toward the aim, firing poses, arrows over ground shadows, a one-slot HUD with a sprite digit font, the crosshair.

Shaun approved the sprites by eye and playtested the preview: it's good. 89 unit tests and 8 e2e tests pass; review found no blocking issues.

**Next:** Shaun merges the 003 PR when ready, then `/spec 004` (enemies: the Husk, health, damage, death, drops).

**Notes:**
- Arrow damage 10 is a placeholder for 004 to tune. Arrows already carry damage and type.
- When not firing, the tube points at the cursor while the body faces the walk direction (per spec). It passed the playtest, but revisit it if it reads oddly once enemies exist.
- `NO_COMMAND` aims at the world origin. Code that steps the sim without an aim moves the tube's draw direction; the test hook avoids this by keeping the last aim.
- The reviewer's unaddressed suggestion: render depth constants (`FLOOR_DEPTH`, `SHADOW_DEPTH`, `TUBE_DEPTH_NUDGE`, `HUD_DEPTH`) could move into one table in `src/data`. Pick it up when those files are next touched.
- No mistake happened twice this slice, so no new rule.

## 2026-10-17: 002 Movement
**Changed:** built 002 on `claude/002-movement`: walk, roll and feet-box collision in `src/sim`, movement tuning and the `ruin-hall` room in `src/data`, keyboard commands, room and player views, clamped camera and the `?view=` / V toggle in `src/render`; `__GAME__.step(frames, command)` and `setView()`. Sprites for both views drawn and approved by Shaun. Verify (check, e2e, qa screenshots) green; review addressed. Shaun playtested the preview: everything feels fine, and **three-quarter view wins**. Then, at Shaun's request, a cleanup removed the straight-down view, its sprites, `?view=`, V and `__GAME__.setView()`. 60 unit tests and 4 e2e tests pass.
**Next:** `/spec 003` (tube firing).
**Notes:**
- Shaun asked (in chat) that every reply end with what's needed from Shaun next; it's now a line in CLAUDE.md, committed on this branch.
- Chosen in the build, not by the spec, and accepted in the playtest: after a roll the player keeps walk speed in the roll direction (drifts ~5 px when no key is held); sliding diagonally along a wall runs at ~71% of walk speed; diagonals show the side sprite.
- CLAUDE.md's hook line now lists `step(frames, command?)`.
- `src/data/assets.ts` must stay import-free: `npm run art` loads it with Node's type stripping, which can't resolve extensionless imports.

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
