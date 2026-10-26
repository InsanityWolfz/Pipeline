# 063 plan: blueprints and area pick-up

Plan for docs/specs/063-blueprints.md on `claude/063-blueprints` (InsanityWolfz/Pipeline#74). A plan file because it spans the sim (a new command family, state and a research node), build mode's input, three new HUD pieces and art, well past 300 lines.

Five vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code follows them.

## Findings that shape the plan

- **Single pick-up puts contents in the inventory** (`removePieceAt`, `src/sim/placement.ts`). Area pick-up sends them to the stash (spec). `removePieceAt` gains a destination (`inventory` | `stash`); the hand pick-up and the claim's port clearing (`src/sim/claims.ts`) keep the inventory. Each piece still records its `pickUps` event, so FeelView's `if (ev.pickUps.length > 0)` already plays the pick-up sound once for the batch.
- **The stash has no limit** (052: "no practical limit"; `src/sim/stash.ts`). The spec's "if the stash can't hold them all, nothing is picked up" can't fire today. The rule is built against `STASH_CAP` in `src/data/blueprints.ts`, set to `Infinity` (052), and its test passes a small cap. Raised.
- **The sandbox can't reach the foundry** (`SANDBOX_KEY_LIST`'s note, `src/data/sandbox.ts`). The spec's Playwright run "in the sandbox" moves to `?playtest`, which carries 10 ancient gears and 10 aqueduct valves, so the table is restored by hand there, every machine and stage is unlocked, and the tube is attuned. The sandbox's start already restores every research node (`createSandboxSim`), so "the table starts restored in the sandbox" holds with no code; a sim test pins it. Raised.
- **F is taken.** 042.4 moved Flip to G and gave F to the feedback note (`DEFAULT_BINDINGS`). The spec's "F mirrors" would clash with Feedback, and its data test says bindings have no clashes. The ghost mirrors on the existing `flip` action (G by default, rebindable), as the splitter's ghost does. Raised.
- **Build mode's keys and clicks** live in `src/render/controls.ts` (R and G turn and flip the ghost), `src/render/pointerInput.ts` (presses over the world) and `src/render/buildDrag.ts` (the queued place and pick-up actions, one a tick). Esc's order is `src/render/MenuRouter.ts` (the last step before pausing leaves build mode). The tool modes slot in there: a new `BlueprintInput` (render) holds the tool (`piece` | `area` | `ghost`), the drag box and the ghost's turn and mirror; Esc and right-click drop the menu, then the ghost or the area tool, before leaving build mode.
- **The build bar is full.** With every piece unlocked it is 610 px of the 640 view (`groupedBottomRow`), so two more cells don't fit in it. The Area and Blueprints buttons sit as a small "Tools" group of two cells at the bar's right end, raised one row (above the Mines group's label, clear of the strip and the HP block on the left). Same cell art and hover line as the bar (GuideBar's). Raised.
- **The release menu** reuses the house's small click menu (`ChoiceMenu`, the pylon's and waystone's), centred on screen. **The overwrite and delete questions** reuse it too: "Overwrite <name>" rows plus Cancel, and "Delete <name>" plus Cancel.
- **The build lock** (`src/sim/guided.ts`): `buildLocked` refuses a whole area pick-up and a whole stamp. They record `pickUpFails` / `placeFails` with `tutorial` or `ghost`, so GuidedView's hint ("Not yet", "Build on the glowing outline") shows as for a single piece. A full stash records `pickUpFails` with a new reason `stash-full` ("The stash is full"). Saving changes nothing in the foundry, so the lock doesn't block it.
- **Events are at 291 lines** (`src/sim/events.ts`). Blueprint events go in their own `src/sim/blueprintEvents.ts`, joined like `ForgeEvents`.
- **A wall tile for the table.** The north wall (row 0) has floor below at tx 3–8 and 11–20. Taken: braziers (4, 20), banners (8, 16), machine speed's panel (6), the intake (11–14). The wing's notch is tx 9–10. The Blueprint table goes at **(18, 0)**, "north wall, east", a tile clear of the banner and the brazier, and off the guided ley line (row 1, tx 13–15). Its art is a wall panel like machine speed's: `RESEARCH_SPRITES.wallArt['blueprint-table']`.
- **Per-piece settings that exist:** a conduit's `inFrom` (013), a splitter's `mirrored` (033, the spec doesn't list it but it is the same kind of player choice), a stage machine's `made` (the round it works on, 029), and an underground end's `pair` (052). Saved as `inFrom`, `mirrored`, `made` and `link` (the partner's index in the blueprint). Placing passes `inFrom` and `mirrored` through `place()`'s shape, sets `made` on the new stage machine, and pairs linked ends with each other after all are down (an end whose partner was skipped pairs by the normal rule).
- **Naming needs the round's plural** ("Frost arrows"). Item names are singular ("Frost arrow"). `src/data/blueprints.ts` holds the naming words: an `s` by default, with overrides (`ley-dust` "Ley dust", `rope` "Rope").
- **"The round its last stage machine makes":** stage machines have no flow order in the sim. Built: the stage machine whose `made` carries the most tags (the most finished round), the latest in the blueprint's piece order on a tie. Raised.
- **The transform** is held as (`turns`, `mirrored`): rotate `turns` × 90° clockwise after an optional left–right mirror. R adds a turn; flip mirrors and inverts the turns, so the ghost always mirrors on screen. The stamp command carries the box's top-left tile, so the sim never reads the cursor.
- **Key list height.** The key list holds 10 rows a column (`BINDINGS_PANEL.perColumn`); two more actions make the second column 14 rows, past the view. `perColumn` goes to 12 (12 and 12; the sandbox's 12 and 13, its height today).
- **Save.** `SimState.blueprints` is new shape: `SAVE_VERSION` 14, the save-shape fixture regenerated. A KO never touches it (`resetWorld` resets only the world).

## Slice 1: the area tool and area pick-up
**Tests first**
- `tests/sim/area.test.ts`:
  - A box counts only whole pieces: a 3×1 assembler with two tiles inside isn't counted, with three it is, in both orientations.
  - A box over the stash, the bench, a port and the intake's floor counts no fixture.
  - Pick-up removes every counted piece at once and records a `pickUps` event each and one `areaPickUps` event.
  - Every item goes to the stash, none to the inventory: a machine's buffer and output, a craft in progress, a hopper's, a crate's, a conduit's, an underground entrance's tunnel (and an exit picked with its entrance).
  - A stash cap that can't hold the lot refuses the whole pick-up with a `stash-full` pick-up fail, and nothing changes.
  - The build lock refuses it (`tutorial`, and `ghost` during a guided step), picking up nothing.
  - Outside the foundry it does nothing; with no table it works.
  - A box covering no pieces does nothing.
- `tests/render/settingsStore.test.ts` (existing clash test) passes with the `area` action; the build strip test gains the Area entry.
- e2e `tests/e2e/blueprints.spec.ts`: in `?playtest`, B, then Q, drag a box over two placed pieces with the real mouse; the box and both pieces show while dragging; the menu offers Pick up and Cancel (no table yet); Pick up empties them into the stash; Esc cancels a second menu.

**Code**
- `src/data/blueprints.ts`: `STASH_CAP`, the menu labels, the hint text, the tool's look numbers.
- `src/sim/area.ts`: `AreaBox`, `piecesInBox`, `areaPickUp`.
- `removePieceAt` gains its destination; `PlaceFail` gains `stash-full`.
- `Command.area: { box, action } | null`; `stepBuild` runs it.
- `src/sim/blueprintEvents.ts` (`areaPickUps`).
- Settings: the `area` action (default Q), its label; `BINDINGS_PANEL.perColumn` 12.
- Render:
  - `BlueprintInput` (tool mode and drag box)
  - `ToolCells` (the Tools group: Area and Blueprints cells, hover lines, the greyed Blueprints cell)
  - `AreaView` (the cyan box and the counted pieces' outlines)
  - `BlueprintMenus` (the release menu)
  - MenuRouter's Esc order, the build strip's Area entry, `ui().blueprints`.
- Art: the Area and Blueprints emblems. Sound: the box's release.

## Slice 2: the Blueprint table and saving
**Tests first**
- `tests/sim/blueprintTable.test.ts`:
  - `blueprint-table` costs 4 ancient gears and 2 aqueduct valves.
  - It is revealed from the start with no requires, its diagram is at (18, 0), and its row is in the Walls group.
  - Restoring it unlocks saving; the sandbox starts with it restored.
- `tests/sim/blueprintSave.test.ts`:
  - Saving records piece ids, tiles relative to the box's top-left, facings, a conduit's turn, a splitter's side, a stage machine's round and an underground pair's link, and no contents.
  - The naming rule:
    - a last stage machine ("Frost arrows", "Cluster bombs" from a cluster die)
    - else an assembler, packer or mine packer ("Bombs")
    - else the first machine's product ("Shafts")
    - else "Logistics"
  - A used name gets a number ("Frost arrows 2", "3"), overwriting a slot frees its own name.
  - The icon is the named item's.
  - 8 slots: a ninth save without a slot fails; with a slot it overwrites it; deleting frees a slot.
  - Before the table, saving does nothing.
  - "Save and pick up" saves and picks up.
  - Blueprints survive a KO and a save round trip (`snapshot` / `restore`).
- `tests/sim/saveShape.test.ts`: the fixture regenerated at `SAVE_VERSION` 14.
- `tests/data/research*.test.ts`: references and the wall-art map hold for the new node.
- e2e (`blueprints.spec.ts`): restore the table at its diagram with E in `?playtest`; the release menu then offers all four rows; Save blueprint saves one.

**Code**
- `research.ts`: `blueprint-table`, the `blueprints` effect.
- `src/sim/blueprints.ts`: `Blueprint` types, `blueprintsUnlocked`, `captureBlueprint`, `blueprintName`, `saveBlueprint`, `deleteBlueprint`.
- `SimState.blueprints`; `Command.area` gains `save` and `saveAndPickUp` with an optional `slot`; `Command.deleteBlueprint`; events `blueprintSaves`, `blueprintSaveFails`, `blueprintDeletes`.
- `SAVE_VERSION` 14.
- The getState summary's `blueprints`.
- The overwrite menu (8 full).
- Art: the table's diagram and its restored drafting table.

## Slice 3: the blueprint list
**Tests first**
- `tests/render/blueprintListLayout.test.ts`: rows for 8 blueprints fit above the Tools cells and inside the view; the delete control sits at each row's right end.
- e2e (`blueprints.spec.ts`):
  - Before the table, the Blueprints cell is greyed, its hover reads "Restore the Blueprint table", and its key does nothing.
  - After it, the key (P) and the cell open the list.
  - Each row shows its icon, name and piece count.
  - The delete control asks, Cancel keeps it and Delete removes it.

**Code**
- `blueprints` action (default P).
- `BlueprintList` (a tablet in the house panel style, rows with icon, name, count and a delete mark), its layout as pure functions in `blueprintListLayout.ts`, the delete confirm via `BlueprintMenus`.
- Clicking a row takes it as the ghost (slice 4 draws it).
- Art: the delete mark and the row's look.

## Slice 4: placing
**Tests first**
- `tests/sim/blueprintTransform.test.ts`:
  - A turn moves (x, y) to (h−1−y, x) in an h×w box and turns facings, conduit sides and 3×1 footprints clockwise.
  - A mirror moves (x, y) to (w−1−x, y), swaps left and right facings and conduit sides, and flips a splitter's side.
  - Four turns, and two mirrors, are the identity.
  - Flip after a turn equals the stored (turns, mirrored) form.
- `tests/sim/stamp.test.ts`:
  - A stamp places every piece that fits at once, new and empty, with saved settings kept (a conduit's corner, a splitter's side, a frost rune's round, a pair linked to each other).
  - It skips pieces on a taken tile, a fixture, a wall or off the floor, and pieces not unlocked, and records which were skipped.
  - The same blueprint stamps twice in two places.
  - The build lock refuses the whole stamp.
  - Before the table, nothing happens.
  - A frost arrow line stamped turned and mirrored makes frost arrows.
- e2e (`blueprints.spec.ts`), in `?playtest`, the spec's run:
  - Build a frost arrow line by hand and save it.
  - Pick it up with the area tool.
  - Take it from the list, R and G (flip), see red ghost tiles over a piece in the way.
  - Click, and see the placed line run (frost arrows reach its crate).

**Code**
- `src/sim/blueprintTransform.ts`, `src/sim/stamp.ts` (`stampPlan` for the ghost's colours, `stamp`), `Command.stamp`, the `stamps` event.
- `place()` takes an option to skip auto-pairing; tunnels gain `pairEnds`.
- Render:
  - `BlueprintGhost`: every piece's body tinted cyan or red, red tiles for the skipped ones, and the "Not unlocked" line over a hovered locked piece.
  - `BlueprintInput`: R and flip turn and mirror it; a click stamps (the ghost stays); Esc and right-click drop it.
- Sound: the stamp. FeelView plays the stamp once instead of a place sound per piece.

## Slice 5: shots, results
- Review shots in docs/review/063 (`blueprintsShots.spec.ts`):
  - the area box over a line
  - the release menu
  - the list with three saved lines
  - a ghost turned and mirrored with red tiles
  - a stamped line
- Older foundry and build-mode shot specs run with REVIEW_SHOTS=1, then their images restored.
- The spec's results and "Raised after the build" (063.N).

## Order, agents and verification
- One builder agent works the slices in order on this branch. After each slice it commits with `npm run check` green and the touched e2e files passing, and pushes.
- Playwright runs one process at a time with `--workers=1`, against a dev server on its own port.
- After slice 5: `/verify` (CI runs the full suite), `/review`, fixes, wrapup, then the playtest.
