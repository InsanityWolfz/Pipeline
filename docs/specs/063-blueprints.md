# 063: Blueprints and area pick-up
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 63"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

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
- [ ] In build mode, the Area tool (a build-bar button and a rebindable key, shown in Settings' key bindings) lets the player drag a box over the foundry grid. The box shows while dragging, and so does every piece it covers.
- [ ] Only pieces wholly inside the box count: a 3×1 piece needs all three tiles inside. Fixed fixtures are never included: the intake, the ports, the bench and the stash.
- [ ] On release, a small menu offers:
  - **Pick up**
  - **Save blueprint** (only once the Blueprint table is restored)
  - **Save and pick up** (likewise)
  - **Cancel**

  Esc or a right-click cancels. A box covering no pieces offers only Cancel.

**Area pick-up (sim)**
- [ ] Pick up removes every counted piece at once, as picking each one up by hand does. Pieces are free, so nothing is refunded.
- [ ] Every item inside those pieces goes to the stash: machine buffers, hoppers, crates, conduits and underground belts.
- [ ] If the stash can't hold them all, nothing is picked up and a hint says the stash is full.
- [ ] The guided tutorial's build lock (058) blocks area pick-up as it blocks single pick-ups.
- [ ] Area pick-up is available from the first foundry visit after the build lock ends. It needs no table.

**The Blueprint table (data, sim)**
- [ ] A new research node, `blueprint-table`: a wall diagram on the foundry's north wall (tile chosen in /plan, clear of the existing panels and the wing's door).
  - Restored with E for 4 `ancient-gear` and 2 `aqueduct-valve` (033's rules).
  - Shown from the start; no requirements.
- [ ] Restoring it unlocks saving and placing blueprints. Its row shows in the research list (J) under Walls.

**Saving (sim)**
- [ ] **Save blueprint** records every counted piece: its piece id, its tile relative to the box's top-left, its facing, and any per-piece setting the player chose (a conduit's turn, a stage machine's round, an underground pair's link). Contents are never saved.
- [ ] **Naming:** each blueprint is auto-named after the most finished thing its pieces make.
  - The rule: the round its last stage machine makes ("Frost arrows"); else the round its assembler, packer or mine packer makes ("Cluster bombs"); else its first machine's product ("Shafts"); else "Logistics".
  - A name already used gets a number ("Frost arrows 2").
  - It shows that round's or item's icon.
- [ ] There are 8 slots. With all 8 full, saving asks which slot to overwrite (Cancel keeps all).
- [ ] Blueprints live in the save, so a KO, Continue and Quit never lose them. `SAVE_VERSION` goes up by one.

**The blueprint list (render)**
- [ ] In build mode, a Blueprints button (and a rebindable key) opens the list.
  - Each row shows the blueprint's icon, its name and its piece count.
  - Clicking a row takes it as a ghost.
  - Each row has a delete control that asks to confirm.
- [ ] Before the table is restored, the button is greyed and its hover says "Restore the Blueprint table".

**Placing (sim, render)**
- [ ] A taken blueprint follows the cursor as a ghost of all its pieces, snapped to the grid.
  - R turns it 90° clockwise (every piece's facing with it).
  - F mirrors it left to right (facings and conduit turns mirrored).
- [ ] Each ghost piece shows red where it can't go: off the floor, on a fixture, or on a taken tile. A click places every piece that fits, all at once, and skips the red ones.
  - Placed pieces are new and empty.
  - Stage machines and conduits keep their saved settings.
- [ ] **Clicks:** the ghost stays after a placement, so the same blueprint can go down again. Esc or a right-click drops it.
- [ ] **Locked pieces:** pieces the player hasn't unlocked yet (a blueprint saved in the sandbox, say) are skipped and shown red with a "not unlocked" hover.
- [ ] **The build lock:** it blocks placing.

**Sandbox (044)**
- [ ] The Blueprint table starts restored in the sandbox.

**Art and sound**
- [ ] Vector art: the Blueprint table's diagram and its restored drafting-table look on the wall; the Area tool's box (cyan, the player's colour); the red ghost tiles; the blueprint list's rows in the house panel style.
- [ ] Sounds: the box's release, a stamp when a blueprint goes down, and pick-up's existing sound played once for the batch.

**Review shots (docs/review/063)**
- [ ] The Area box over a line; the release menu; the blueprint list with three saved lines; a ghost turned and mirrored with red tiles; a stamped line.

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
