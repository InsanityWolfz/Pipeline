# 069 plan: factory numbers and tools

Plan for docs/specs/069-factory-numbers-tools.md on `claude/069-factory-numbers-tools` (InsanityWolfz/Pipeline#83). It touches seven small systems across sim, render and data, so it gets a plan file.

Eight vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code follows them.

## Findings that shape the plan

- **Hovers.** `HoverView` (src/render/HoverView.ts) draws a name tag from `nameAt` (src/render/hoverNames.ts) and, over a machine or the intake, `HoverReadout`'s icon-and-count lines (src/render/readoutLines.ts). The readout is a fixed 44 px wide (`READOUT_LAYOUT`), so text lines like "12/30 · in 2.3/s · fires 4/s" need it to size to its text. The name tag already has a one-line `description` under the name (018, used by ports with the sim's `portPerMinute`): a placed machine's recipe card goes there.
- **Build-bar hovers** go through `BuildView.tipAt` → `describe()` (src/render/describe.ts): `describePiece(id)` for a plain piece, `describeStage(seen, id)` for a stage. `Seen` has no research, so machine speed must be added to what the describe functions read.
- **Machine numbers.** A machine's craft time is `craftTicksAt(pieceId, machineSpeed(research))` (src/sim/research.ts); the recipe it runs is `machineRecipe(m)`, and the one its status and hover read is `statusRecipe(m)` (src/sim/flow.ts, 062). A stage on the bar runs its plain recipe (`STAGE_RECIPES`). A new sim module computes the card (inputs, output, seconds, items a minute) so render never does the maths.
- **The intake.** Each tick's `events.refills` (rounds into an entrance) and `events.entranceFires` (rounds fired) already exist. The rate window needs state: per-entrance counts in one-second buckets on `LinkState`, so the shape changes and `SAVE_VERSION` goes to 22.
- **The tube is quiet in the foundry** (015: `stepFire` returns early there), and the intake's hover only shows in the foundry. A fire rate measured over the last 5 s would therefore read 0 whenever it can be seen. The fire rate shown is the entrance's round's own rate (`fireRate` in src/sim/emissions.ts, with the player's talents and gear, no held ramp: the Build tab's shots/s), from the sim. Raised as 069.1.
- **Hoppers.** `HopperAmount` is `'one' | 'half' | 'all'` (src/sim/input.ts), shared by hoppers, crates and the stash; `clickAmount` (src/render/menuRequests.ts) maps the modifiers, and `InventoryPanel.pressAt` stores the press. A new `'ten'` amount keeps the hook's `'one'` meaning one; the hopper screen's plain click sends it. Crates and the stash keep 047's one (the spec names hoppers only; raised).
- **Purge.** E's targets are listed in `INTERACT_KINDS` (src/data/interact.ts) and found by `interactTarget` (src/sim/interactables.ts); a menu opens in `SiteMenus.interact` (the house `ChoiceMenu`, as the pylon's). The intake has `intakeInReach` (src/sim/intake.ts). The stash and inventory have no limit (052, 047.2), so the inventory fallback is built against a cap, as 063.5 did with `STASH_CAP`.
- **Area pick-up** is `areaPickUp` (src/sim/area.ts), which sends everything to the stash through `removePieceAt(..., 'stash')` (src/sim/placement.ts) and refuses against `STASH_CAP`. The inventory has no cap either, so an `INVENTORY_CAP` (unbounded) joins it and the tests use small caps.
- **Q is free.** The bindings (src/data/settings.ts `DEFAULT_BINDINGS`) use W A S D, Space, E, C, B, I, J, T, R, G, X, P, F, 1–5, the backtick and right click; M, [ and ] are fixed sound keys. A new rebindable action `pipette` on Q joins `NEWER_ACTIONS`, as 063's keys did.
- **Pipette settings.** A conduit's turn is its `inFrom`; a splitter's side is `mirrored`; a stage's round is `made`. The place command takes `inFrom` and `mirrored` already; it gains an optional `round` (as `stamp` sets `made` on a stage, src/sim/stamp.ts). Render holds the pipetted turn and round with the ghost's facing (Controls) and drops them when another piece is chosen. "Empties the hand" needs an empty selection on the build bar, which today always has a piece.
- **The camera.** The main camera's zoom is the screen fit's scale (src/render/SceneCameras.ts, scale.ts); the UI camera has the same zoom. Three places turn pointer px into view px with the *main* camera's zoom: `PointerInput.view`, `BuildView.update` and `CursorView`. At 0.75× those must read the UI camera's. `HoverView` keeps tags inside a view of `VIEW_WIDTH` × `VIEW_HEIGHT` world px; at 0.75× the world view is larger. World points (`getWorldPoint`) already follow the zoom, so placement and hovers in the world stay right.
- **The wheel** in build mode steps the build bar today (020, `MenuRouter.handle`; tests/e2e/menuLabels.spec.ts). With zoom on the wheel, the bar steps only with the wheel over the bar, and over the world it zooms. Raised.
- **The foundry at 0.75×.** It is 24 × 16 tiles (768 × 512 px, plus 48 px of wall above). At 0.75× the view is 853 × 480 world px: the whole width fits (the bounds are widened so the room sits centred), and 15 of its 16 rows. Raised with the zoom that would fit it all.

## Slice 1: intake rates
**Tests first**
- `tests/sim/intakeRates.test.ts`:
  - a fresh link reads 0 in for every entrance;
  - a line feeding an entrance one round every 30 ticks reads 2/s once the window has filled (5 s), and drops back to 0 within a window of the line stopping;
  - the window is `INTAKE_RATE.windowSeconds` (5) seconds of whole buckets, so the rate only changes once a second;
  - the fire rate is the round's own (`fireRate` with talents and gear): an arrow entrance reads the arrow's shots/s; an empty or capped entrance reads none;
  - `getState().intake.entrances[i]` carries `inPerSecond` and `firesPerSecond`.
- `tests/render/hoverRecipe.test.ts` (extended): the intake's lines read "12/30 · in 2.3/s · fires 4/s" from the sim's rates, with the capped line unchanged.
- `tests/sim/saveShape.test.ts`: the fixture regenerated at `SAVE_VERSION` 22.

**Code**
- `src/data/foundry.ts`: `INTAKE_RATE` (window seconds).
- `src/sim/intakeRates.ts`: `stepIntakeRates(state)` after the foundry's flow (counts the tick's refills into one-second buckets), `entranceRates(state)`.
- `LinkState.inflow` (per-entrance buckets); `createLink`; `summary.ts`'s intake entrances.
- `readoutLines.ts`: `intakeLines` takes the rates; `HoverReadout` sizes to its widest text; `HoverView`'s `ui()` gains `hoverLines`.
- `src/data/save.ts`: `SAVE_VERSION` 22.

## Slice 2: recipe cards
**Tests first**
- `tests/sim/recipeCard.test.ts`:
  - a cutter's card: 1 wood → 2 shafts in 1.0 s, 120 a minute;
  - restoring machine speed shortens the seconds and raises the minute's count;
  - a knapper making steel arrowheads shows the steel recipe (the variant running now);
  - a stage on the bar shows its plain recipe; a placed stage on frost bombs shows the bomb one;
  - `getState()`'s machine pieces carry their `card`.
- `tests/render/recipeCard.test.ts`: the card's words, "1 wood → 2 shafts · 1.0 s"; a running machine adds "120 shafts a minute"; an idle or starved one doesn't; the build bar's cutter and frost rune tips lead with their card.

**Code**
- `src/sim/recipeCard.ts`: `recipeCard(recipe, pieceId, speed)`, `machineCard(m, speed)`, `pieceCard(pieceId, speed)`.
- `summaryParts.ts`: the machine summary's `card`.
- `src/data/descriptions.ts` (or `hudLayout`): the card's words.
- `src/render/recipeText.ts`: the card as text.
- `hoverNames.ts`: a placed machine's description is its card; `describePiece` and `describeStage` take the speed and put the card first.

## Slice 3: hopper amounts
**Tests first**
- `tests/sim/hopperAmounts.test.ts` (022's, updated): `'ten'` moves 10, or all if fewer, in and out; half and all as before.
- `tests/render/clickInput.test.ts`: on a hopper's screen a plain click is `'ten'`; on a crate or the stash it stays `'one'`; Shift half, Ctrl all, Ctrl wins.
- `tests/e2e/hopperAmounts.spec.ts` (022's, updated): click 10, Shift half, Ctrl the stack, in and out.

**Code**
- `HopperAmount` gains `'ten'`; `amountOf`; `HOPPER_CLICK` (10) in src/data/foundry.ts.
- `clickAmount(mods, hopper)`; `InventoryPanel.pressAt` takes the modifiers and picks the amount for what's open.

## Slice 4: purge
**Tests first**
- `tests/sim/purge.test.ts`:
  - E's target at an open entrance holding rounds is `entrance`, with no prompt at an empty or capped one;
  - Purge moves the entrance's rounds to the stash and empties it, so another round kind flows in next;
  - with the stash at its cap, what doesn't fit goes to the inventory; with both full, nothing moves;
  - out of reach, or in another room, it does nothing.
- `tests/sim/interactables.test.ts`: the new kind has its prompt.
- `tests/e2e/purge.spec.ts`: E at a fed entrance offers "Purge"; clicking it empties the entrance into the stash.

**Code**
- `src/sim/purge.ts`: `entranceInReach`, `purge`; the `purge` command; `events.purges`.
- `INTERACT_KINDS` `entrance`; `interactTarget`; `INVENTORY_CAP` in src/data/items.ts.
- `SiteMenus`: the purge menu (one row, "Purge"); `MenuRequests.purge`.

## Slice 5: area pick-up into the inventory first
**Tests first**
- `tests/sim/area.test.ts` (063's, updated): contents go to the inventory; with the inventory at a small cap, the rest goes to the stash; refused whole only when both are full.
- `tests/e2e/blueprints.spec.ts` (063's, updated): the picked-up cutter's contents land in the inventory.

**Code**
- `areaPickUp(state, box, caps)`; `removePieceAt` into a given store; `BLUEPRINT_TEXT.stashFull` reworded for both.

## Slice 6: the pipette
**Tests first**
- `tests/sim/pipette.test.ts`: a place command with a `round` sets a stage machine's round; a non-stage ignores it.
- `tests/render/pipette.test.ts`: the hand from a placed piece: its piece id, facing, a conduit's turn, a splitter's side, a stage's round; nothing under the cursor empties it.
- `tests/data` key bindings: `pipette` on Q, no clash.
- `tests/e2e/pipette.spec.ts`: Q over a turned conduit, a flipped splitter and a frost rune on bombs, each placed again with its settings; Q over the floor empties the hand and a click places nothing.

**Code**
- `src/data/settings.ts`: `pipette` on Q, labelled "Pipette", in `NEWER_ACTIONS`.
- `src/render/pipette.ts` (pure); `Controls` holds the turn and round; `BuildDrag` sends them; `BuildView` takes an empty hand.
- The place command's `round`; `stepBuild`.

## Slice 7: the zoom
**Tests first**
- `tests/render/zoom.test.ts`: the zoom steps (1 and 0.75), wheel down out, wheel up in, never past the ends; leaving build mode is 1; the centring bounds for a room narrower than the view.
- `tests/e2e/zoom.spec.ts`: in build mode the wheel over the world zooms to 0.75 and back; a click places on the tile under the cursor at 0.75; a hover names the piece under the cursor; the build bar's cells still take clicks; leaving build mode is 1×; the wheel over the bar still steps it.
- `tests/e2e/menuLabels.spec.ts` (020's): its wheel moves over the bar.

**Code**
- `BUILD_ZOOMS` in src/data/config.ts.
- `SceneCameras.setWorldZoom`; the fit applies it to the main camera only.
- View-px conversions read the UI camera; `HoverView` takes the world view's size.
- `MenuRouter`: the wheel over the world zooms in build mode; `ui().camera.zoom`.

## Slice 8: review shots and results
- `tests/e2e/factoryNumbersShots.spec.ts` (REVIEW_SHOTS=1): a machine's recipe card, the intake's rates, a purge, the pipette, the build mode zoomed out, into docs/review/069.
- The spec's results and "Raised after the build" (069.N).

## Order and verification
- One builder works the slices in order, on this branch, committing after each with `npm run check` green and the touched e2e files passing (one worker, port 5340).
- After slice 8: `/verify` (CI runs the full suite), `/review`, fixes, wrapup, then the playtest.
