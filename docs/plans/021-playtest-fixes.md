# Plan 021: Playtest fixes

Spec: docs/specs/021-playtest-fixes.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec.

## Shape of the change
Four independent fixes, each its own commit:
1. **Pickup reach (sim, data, render).** `stepPickups` already measures from the feet box and never checks what's in between, so the sim change is `PICKUP_RADIUS = 64` plus tests that pin the "ignores what's in between" and "same room only" rules. Existing tests that expect a drop to sit on the ground beside the player are updated to move the player away first. Render: `GroundItemView` keeps a picked-up item's image and slides it into the player over `PICKUP_SLIDE.ms` (data in `src/data/juice.ts`) before destroying it.
2. **No shake on firing (render).** `FeelView` drops its `shake('small')` per shot. `JuiceView` keeps a short log of the shakes asked for, which the test hook reports as `ui().shakes`.
3. **Menu pointer (render, data).** A new `CursorView` owns the crosshair (moved out of `HudView`) and a new vector `pointer` sprite (`src/data/art/hud.ts`), both on `DEPTHS.cursor` (above every other depth). Each frame the scene tells it whether a menu is open (craft, pause, hopper picker, site menus covering pylon, stash, bench and sorter, the wake panel) or the mouse is over the build bar; then it shows the pointer, else the crosshair. `WakeView` gets an `isShown` getter. The OS cursor stays `none`. The test hook reports `ui().cursor`: which one shows, its depth, and the highest depth of anything else in the scene.
4. **Arrowhead (data/art).** Remove the wood stub line from `ARROWHEAD`.

## Tests (written first)
- **Vitest** (`tests/sim/drops.test.ts`, `tests/sim/pickupReach.test.ts`):
  - pickup at 63 px, none at 65 px
  - pickup through a solid tile (overworld ruin wall) and through a node's box
  - the behind-the-tree harvest: player south of a tree, `scatterPoint` forced (module mock) to put the log north of the tree; it's picked up on the completing tick without the player moving
  - no pickup of an item in another room within 64 px
  - `PICKUP_RADIUS` is 64
  - the arrowhead icon has no wood-coloured shape; arrow and shaft icons unchanged (snapshot of their shapes)
  - `DEPTHS.cursor` is above every other depth; the pointer sprite exists
- **Playwright** (`tests/e2e/playtestFixes.spec.ts`):
  - with the craft menu open, `ui().cursor` is the pointer, and its depth is above every other object's; closed, it's the crosshair
  - firing several shots records no shake; a bomb explosion records one
  - screenshots into `docs/review/021/` (run with `REVIEW_SHOTS=1`): craft menu with the pointer over a row, the arrowhead icon (contact-sheet figure, beside the unchanged shaft and arrow), a log lying behind a tree and then sliding in
  - Harvest drops land on the player's side of a node, so the screenshot can't get a log behind a tree by harvesting. Two dev-only hook additions make it: `drop(itemId, x, y)` lays an item in the player's room (through a new `layItem` in `src/sim/drops.ts`, which `spawnDrops` uses too), and `tweenSpeed(scale)` slows every tween so the slide is caught mid-way. `ui()` reports `sliding`.

## Risks
- Existing sim and e2e tests that leave drops on the ground near the player (harvest, enemy drops) now see them picked up at once. Fix the tests, not the rule.
- e2e `collect()` still walks to items; with a bigger reach it just finishes sooner.
