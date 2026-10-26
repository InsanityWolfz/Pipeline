# 063: Blueprints and area pick-up
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 63"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

Plan pre-approved by Shaun, 2026-10-26.

Drafted from Shaun's blueprints interview (docs/brainstorm/2026-10-26-blueprints-interview.md), 2026-10-26.

## Goal
Retooling the foundry becomes quick:
- **Area pick-up:** drag a box in build mode to pick up a whole line at once.
- **Save:** once the Blueprint table is restored, save a dragged area as a blueprint.
- **Place:** stamp it back down anywhere in one click, turned or mirrored.

So a player can keep a "Bulwark bombs" line and a "Forgewright fan" line and swap between them in seconds.

## Design references
- docs/design.md, "The Foundry", Blueprints: "Layouts can be saved and rebuilt quickly, like a twin-core breaker for a boss. Rearranging a line is fast, so retooling for a fight never takes long."
- docs/design.md, "Death and tension": blueprints are always kept.
- docs/design.md, "Combat", "Bosses are engineering puzzles": "A first attempt can be pure scouting: learn the mechanics, run, retool, return."
- docs/specs/006-foundry-building.md (placement, facing, picking up; it put blueprints and area pick-up out of scope), docs/specs/033-research.md (restoration diagrams and costs), docs/specs/052-foundry-logistics.md (the stash), docs/specs/058-guided-tutorial.md (the build lock).

## Acceptance criteria

**The area tool (sim, render)**
- [x] In build mode, the Area tool (a build-bar button and a rebindable key, shown in Settings' key bindings) lets the player drag a box over the foundry grid. The box shows while dragging, and so does every piece it covers.
- [x] Only pieces wholly inside the box count: a 3×1 piece needs all three tiles inside. Fixed fixtures are never included: the intake, the ports, the bench and the stash.
- [x] On release, a small menu offers:
  - **Pick up**
  - **Save blueprint** (only once the Blueprint table is restored)
  - **Save and pick up** (likewise)
  - **Cancel**

  Esc or a right-click cancels. A box covering no pieces offers only Cancel.

**Area pick-up (sim)**
- [x] Pick up removes every counted piece at once, as picking each one up by hand does. Pieces are free, so nothing is refunded.
- [x] Every item inside those pieces goes to the stash: machine buffers, hoppers, crates, conduits and underground belts.
- [x] If the stash can't hold them all, nothing is picked up and a hint says the stash is full. *(The stash has no limit, so this can't fire today: 063.5.)*
- [x] The guided tutorial's build lock (058) blocks area pick-up as it blocks single pick-ups.
- [x] Area pick-up is available from the first foundry visit after the build lock ends. It needs no table.

**The Blueprint table (data, sim)**
- [x] A new research node, `blueprint-table`: a wall diagram on the foundry's north wall (tile chosen in /plan, clear of the existing panels and the wing's door).
  - Restored with E for 4 `ancient-gear` and 2 `aqueduct-valve` (033's rules).
  - Shown from the start; no requirements.
- [x] Restoring it unlocks saving and placing blueprints. Its row shows in the research list (J) under Walls.

**Saving (sim)**
- [x] **Save blueprint** records every counted piece: its piece id, its tile relative to the box's top-left, its facing, and any per-piece setting the player chose (a conduit's turn, a stage machine's round, an underground pair's link). Contents are never saved.
- [x] **Naming:** each blueprint is auto-named after the most finished thing its pieces make.
  - The rule: the round its last stage machine makes ("Frost arrows"); else the round its assembler, packer or mine packer makes ("Cluster bombs"); else its first machine's product ("Shafts"); else "Logistics".
  - A name already used gets a number ("Frost arrows 2").
  - It shows that round's or item's icon.
- [x] There are 8 slots. With all 8 full, saving asks which slot to overwrite (Cancel keeps all).
- [x] Blueprints live in the save, so a KO, Continue and Quit never lose them. `SAVE_VERSION` goes up by one.

**The blueprint list (render)**
- [x] In build mode, a Blueprints button (and a rebindable key) opens the list.
  - Each row shows the blueprint's icon, its name and its piece count.
  - Clicking a row takes it as a ghost.
  - Each row has a delete control that asks to confirm.
- [x] Before the table is restored, the button is greyed and its hover says "Restore the Blueprint table".

**Placing (sim, render)**
- [x] A taken blueprint follows the cursor as a ghost of all its pieces, snapped to the grid.
  - R turns it 90° clockwise (every piece's facing with it).
  - F mirrors it left to right (facings and conduit turns mirrored). *(Built on the flip key, G: 063.1.)*
- [x] Each ghost piece shows red where it can't go: off the floor, on a fixture, or on a taken tile. A click places every piece that fits, all at once, and skips the red ones.
  - Placed pieces are new and empty.
  - Stage machines and conduits keep their saved settings.
- [x] **Clicks:** the ghost stays after a placement, so the same blueprint can go down again. Esc or a right-click drops it.
- [x] **Locked pieces:** pieces the player hasn't unlocked yet (a blueprint saved in the sandbox, say) are skipped and shown red with a "not unlocked" hover.
- [x] **The build lock:** it blocks placing.

**Sandbox (044)**
- [x] The Blueprint table starts restored in the sandbox.

**Art and sound**
- [x] Vector art: the Blueprint table's diagram and its restored drafting-table look on the wall; the Area tool's box (cyan, the player's colour); the red ghost tiles; the blueprint list's rows in the house panel style.
- [x] Sounds: the box's release, a stamp when a blueprint goes down, and pick-up's existing sound played once for the batch.

**Review shots (docs/review/063)**
- [x] The Area box over a line; the release menu; the blueprint list with three saved lines; a ghost turned and mirrored with red tiles; a stamped line.

## Data changes
- `research.ts`: `blueprint-table` and a `blueprints` effect.
- New `blueprints.ts`: slot count, naming words and the menu's labels.
- Key binding defaults for the Area tool and the list. Assets for the art above.

## Out of scope
- Typed names, sharing or exporting blueprints, unlimited slots.
- Building blueprints piece by piece on ghosts. They go down all at once.
- Clearing what's in the way when placing. Taken tiles are skipped.
- Copy and paste without saving, undo.
- The Bulwark's wing as a room.

## Test plan
- **Sim (Vitest):**
  - Area counting: whole 3×1 pieces only; never fixtures.
  - Pick-up: everything removed; contents to the stash; refused whole when the stash is full; the build lock.
  - The table: its cost and the unlock.
  - Save: relative tiles, facings and settings; no contents; the naming rule and duplicates; 8 slots and overwriting.
  - Rotate and mirror: positions, facings and conduit turns.
  - Placing: everything that fits; skipping taken, fixture, off-floor and locked tiles; settings kept; repeated placement.
  - Blueprints survive a KO and a save round trip.
- **Data:** references resolve; key bindings have no clashes.
- **Playwright:** in the sandbox, build a frost arrow line; save it; pick it up; place it turned and mirrored; check it runs. Plus the review shots.

## Open questions
None: the interview settled them.

## Decisions in this draft (OK them with the approval)
- Area pick-up is free from the start (it's convenience, not power); saving and placing need the Blueprint table.
- A pick-up the stash can't hold is refused whole rather than done in part.
- The auto-name follows the line's most finished product, as above.
- Pieces not yet unlocked are skipped when placing.
- The ghost stays after a placement, for placing again.

## Raised after the build
Built on `claude/063-blueprints` (plan: docs/plans/063-blueprints.md). Where the spec was silent, the most conservative option is built; each stands unless Shaun says otherwise.

- **063.1 Mirroring is on the flip key (G), not F.** 042.4 gave F to the feedback note and moved Flip to G, and the spec's own test says no key clashes. The ghost mirrors on the existing, rebindable Flip key, as the splitter's ghost does. Alternative: move Feedback off F.
- **063.2 The new keys.** Area tool on X, Blueprints on P, both rebindable and listed in Settings' key bindings (12 rows a column there now, so the list still fits). A stored binding that already holds X or P leaves the new action unbound rather than resetting every key. They aren't on the build controls strip: two more entries pushed it into the HP block, so each Tools cell's hover names its key ("Area tool (X): drag a box", "Blueprints (P)").
- **063.3 Where the buttons are.** The build bar is 610 of the view's 640 px with every piece unlocked, so the Area and Blueprints buttons sit as a small "Tools" group of two bar cells at the bar's right end, raised a row. The list opens as a tablet just above them.
- **063.4 The area tool's clicks.** The release menu is the house's small centred click menu (the pylon's). After a choice the Area tool stays on for another box; Esc and right click back out one step at a time (the menu, a drag, then the tool, then build mode). With the Area tool on, a right click doesn't pick up a piece.
- **063.5 A full stash.** The stash has no practical limit (052), so the refusal can't fire. It is built against `STASH_CAP` in src/data/blueprints.ts (unbounded), and its test uses a small cap. "Save and pick up" saves even if the pick-up is refused. Saving isn't blocked by the build lock (it changes nothing in the foundry); picking up and placing are.
- **063.6 The sandbox can't reach the foundry** (044), so the spec's Playwright run is in `?playtest`, where the table is restored by hand at its diagram. The sandbox's start restores every node, so the table starts restored there (a sim test).
- **063.7 Naming.**
  - "Its last stage machine" is the stage machine whose round carries the most tags; on a tie, the latest in the blueprint.
  - A packer names a line "Bombs"; "Cluster bombs" comes from a cluster die, which is a stage.
  - Plurals add an "s", except Ley dust and Rope.
  - A Logistics blueprint shows the conduit's emblem.
- **063.8 A splitter's side is saved too** (G flips it, a player choice like a conduit's corner), and mirroring flips it.
- **063.9 The table.** At (18, 0), "north wall, east", between the east banner and brazier, clear of the guided ley line. Named "Blueprint table": "Save a dragged area as a blueprint and place it again." Its diagram is a drafting table in cyan linework; restored, a wooden board on brass legs holding a deep-blue sheet, with a straightedge and compass.
- **063.10 The ghost.**
  - It is centred on the cursor, and the saved box keeps its dragged size, empty margins included.
  - Red also marks a solid piece over the player's own feet (placing's rule).
  - Picking a piece on the bar puts the ghost down, as Esc and right click do.
  - Deleting a blueprint moves the later ones up a slot.
- **063.11 The questions.** With all 8 slots full, Save lists "Overwrite <name>" for each slot, then Cancel; the overwritten slot's own name is free to reuse. Delete asks "Delete <name>" or Cancel. Both use the same small menu.

### Results
- Criteria: all met, two as raised (063.1, 063.5).
- Sim (Vitest):
  - tests/sim/area.test.ts
  - blueprintTable.test.ts
  - blueprintSave.test.ts
  - blueprintTransform.test.ts
  - stamp.test.ts
- Render (Vitest): tests/render/blueprintInput.test.ts, blueprintLayout.test.ts, blueprintListLayout.test.ts; settingsStore.test.ts for the new keys.
- Playwright: tests/e2e/blueprints.spec.ts (5 tests, the spec's run among them: a frost arrow line saved and picked up with the area tool, placed again turned and mirrored past red tiles, filled by hand, making frost arrows).
- Review shots, docs/review/063:
  - 01-area-box-over-line.png
  - 02-release-menu.png
  - 03-blueprint-list.png
  - 04-ghost-turned-mirrored-red.png
  - 05-stamped-line.png
  - 06-table-diagram.png
  - 07-table-restored.png
- `SAVE_VERSION` is 14.
- Checks:
  - `npm run check` passes (2,067 unit tests).
  - Locally, one worker on its own port, these passed: blueprints, foundry, foundryFlow, tunnels, guidedTutorial, foundryTutorial, research, settings, stash, readability, hoverPress and hotbars (34 tests).
  - Older shot specs that show the foundry or build mode ran with REVIEW_SHOTS=1 (research, guidedTutorial, guidance, ammoStages, legibility, playtestFixes2, shippable, equipment: 43 passed), and their images were restored as on main. The key list still fits with the two new keys.

