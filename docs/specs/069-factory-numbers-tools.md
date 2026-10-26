# 069: Factory numbers and tools
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun, 2026-10-26.

Drafted from the factory playtester's findings (docs/brainstorm/2026-10-26-agent-playtest.md, "Quality of life") and the proposal Shaun approved (docs/brainstorm/2026-10-26-playtest-calls.md).

## Goal
Building and retooling lines stops being guesswork. Machines and the intake show their numbers. Hoppers take sensible amounts. A jammed lane can be purged. A pipette copies a piece. Area pick-up hands items back to you. Build mode can zoom out to see the whole foundry.

## Design references
- docs/design.md, "The Foundry":
  - "No ratio math ... Machines show where the bottleneck is."
  - "Rearranging a line is fast, so retooling for a fight never takes long."
- Specs 006 (building), 022 (hopper amounts), 047 (inventory and screens), 052 (logistics), 063 (blueprints and the Area tool).

## Acceptance criteria
- [x] **Recipe cards:** a build-bar piece's hover and a placed machine's hover show its recipe card, e.g. "1 wood → 2 shafts · 1.0 s". `machine-speed` is applied, and for a tiered machine it's the variant running now. A running machine also shows items a minute out.
- [x] **The intake:** *(its fire rate is the round's own, not measured: 069.1)* its hover shows, for each open entrance, its round, its fill, its supply rate in and its fire rate ("in 2.3/s · fires 4/s"), measured over the last few seconds.
- [x] **Hoppers:**
  - a click inserts 10 (or all, if fewer);
  - Shift-click inserts half the stack;
  - Ctrl-click inserts the whole stack;
  - taking out mirrors this.
  - This replaces 022's amounts; 022's tests are updated, not deleted.
- [x] **Purge:** E at an intake entrance offers "Purge". It moves that entrance's reservoir into the stash (or the inventory if the stash can't take it), so a new round kind can flow in.
- [x] **Pipette:** in build mode, Q over a placed piece puts that piece in hand with its facing and settings (a conduit's turn, a stage's round), ready to place. Q over nothing empties the hand.
- [x] **Area pick-up:** contents go to the inventory first and the stash for whatever doesn't fit. This replaces 063's stash-only rule, and the refusal now applies only if both are full.
- [x] **Zoom:** *(0.75× fits the foundry's width, not all of its height: 069.10)* in build mode, the mouse wheel steps the camera between 1× and 0.75× so the whole foundry fits, and leaving build mode returns to 1×. Placement and hovers work at both zooms.
- [x] Every number shown is read from sim data, never computed separately in render.
- [x] Review shots (docs/review/069): a machine's recipe card; the intake's rates; a purge; the pipette; the build mode zoomed out.

## Out of scope
Splitter filters; copy and paste without saving; camera panning beyond the zoom.

## Test plan
- Sim tests for: the rate measurement; hopper amounts; purge; area pick-up's order (inventory, then stash).
- Render tests for the recipe card text and the intake lines.
- Playwright for: the pipette, the zoom, purge, and hopper clicks.
- Review shots.

## Decisions in this draft
- The rates are measured over a window (start 5 s) rather than computed, so they show real bottlenecks.
- Purge goes to the stash first, because a reservoir can hold more than the inventory has room for.

## Raised after the build
Built on `claude/069-factory-numbers-tools` (plan: docs/plans/069-factory-numbers-tools.md). Where the spec was silent, the most conservative option is built; each stands unless Shaun says otherwise.

- **069.1 The fire rate isn't measured.** The tube is quiet in the foundry (015), and the intake's hover only shows there, so a fire rate measured over the last 5 s would always read 0 when it can be seen. "fires N/s" is the entrance's round's own shots a second with the player's talents and gear (the Build tab's number, no held Overpressure ramp), from the sim. The rate in is measured as the decision says. Alternative: measure the fire rate over the last 5 s of firing, so it shows the last fight's real pace (0 until the first).
- **069.2 Hoppers only.** A plain click moves ten on a hopper's screen, in and out; a crate's and the stash's screens keep 047's one per click (the spec names hoppers). Shift half and Ctrl the stack are as before everywhere. Alternative: ten on crates and the stash too.
- **069.3 A stage's tip.** A summary holds three lines (040's test), so a stage's tip is now its recipe card, "Takes: …" and the bonus hint; its generated line ("Cold: added to any round", which its chip already names) moved to the top of the breakdown (Shift). A machine's card leads its tip, its description under it.
- **069.4 The card's words.** "1 wood → 2 shafts · 1.0 s": names in lower case, plural past one except raw materials and rope, ley dust, ley-steel, ley glass, stormsteel and storm glass (src/data/descriptions.ts). A placed machine's card is the line under its name on the hover (the icons and counts stay above it), for the recipe its status reads (062: the variant crafting now; idle, the one whose inputs it holds). While its status is working it adds "· 120 shafts/min", as a port's plate reads its rate.
- **069.5 The intake's lines.** Each open entrance reads "12/30 · in 2.3/s · fires 4/s"; an empty one "0/30 · in 0/s"; a capped one "capped" as before. The window is 5 whole seconds, so the rate changes once a second; rates show one decimal without a trailing ".0". The readout widens to its text, and the name tag keeps off it.
- **069.6 Which E wins at the intake.** The first reservoir's restore diagram is drawn on the open entrance's own tile (033), so E there still opens it, unless the cursor is on the entrance's mouth (or the pipe above it): then E offers Purge. With no diagram nearer, the nearest entrance holding rounds takes E wherever the cursor is. The menu is the house's small click menu with one row, "Purge" (the round's and the stash's icons); Esc or E closes it, and it stays open while the entrance can be purged. A purge the stash and inventory can't hold between them is refused whole (it can't happen today: both have no limit, so `INVENTORY_CAP` joins 063's `STASH_CAP`, unbounded).
- **069.7 Area pick-up.** Contents go kind by kind into the inventory up to its cap, the rest to the stash. The full hint reads "The inventory and the stash are full" (it can't fire today, as 063.5).
- **069.8 The pipette.** Q, rebindable as "Pipette" in Settings' key list (13 rows a column now, so the sandbox's 26 rows fit). A stored binding already on Q leaves it unbound (063.2's rule). Over a piece: that piece, its facing, a conduit's turn, a splitter's side and a stage's round; a click lays it (a conduit drag still lays its own corners), and R turns a held conduit's turn with it. Over nothing: an empty hand, with no ghost or bar highlight, where a click places nothing (right click still picks up); a bar cell or the wheel over the bar fills it again and drops the copied turn and round. A piece not on the bar leaves the hand as it is. An underground pair's link isn't copied (each end pairs by the usual rule).
- **069.9 The wheel.** In build mode the wheel over the build bar still steps it (020); over the world it zooms. 020's test (menuLabels.spec) now wheels over the bar.
- **069.10 0.75× fits the width.** The foundry is 24 × 16 tiles and 48 px of wall above (768 × 560 px). At 0.75× the view is 853 × 480 world px: its whole width fits, centred, but 15 of its 16 rows, and the HUD covers the bottom. About 0.6× would fit it all. Alternative: a third step, or 0.6× in place of 0.75×.
- **069.11 Saves.** The rate window (`link.inflow`) and the purge event change the save's shape, so `SAVE_VERSION` is 22 (067 took 20 on main and 068 takes 21), with no migration.

### Results
- Criteria: all met, two as raised (069.1, 069.10).
- Sim (Vitest): tests/sim/intakeRates.test.ts, recipeCard.test.ts, purge.test.ts, pipette.test.ts; 022's hopperAmounts.test.ts and 063's area.test.ts and blueprintSave.test.ts updated to the new amounts and order; interactables.test.ts has the entrance's prompt.
- Render (Vitest): tests/render/recipeCard.test.ts, pipette.test.ts, zoom.test.ts; hoverRecipe.test.ts (the intake's lines), clickInput.test.ts, describe.test.ts and settingsStore.test.ts updated.
- Playwright: tests/e2e/purge.spec.ts, pipette.spec.ts, zoom.spec.ts; 022's hopperAmounts.spec.ts (click 10, Shift half, Ctrl the stack, in and out) and 063's blueprints.spec.ts (contents into the inventory) updated. readability.spec.ts's stored bindings (a player's from before 069) no longer carry the pipette, whose Q they rebind to rotate.
- Checks:
  - `npm run check` passes (2,538 unit tests, after merging main's 067).
  - Locally, one worker on port 5340: the six touched e2e files (13 passed), and the foundry's others: hoverPress, readability, playtestUi, legibility, foundry, foundryFlow, research, stash, settings, tunnels, tubeLink, fifthEntrance, guidedTutorial, foundryTutorial, playtestFixes2 and hudInventory (68 passed).
  - Older shot specs that show the foundry, build mode or the hovers ran with REVIEW_SHOTS=1 (research, guidedTutorial, guidance, ammoStages, legibility, playtestFixes2, shippable, blueprints, readability, hudInventory, inventoryHotbars, materialTiers, stormsteel, hopperAmounts, stash: 70 passed), and their images were restored as on main. One failed: guidedTutorialShots' "07 the goal panel under the foundry minimap" (the waypoint reads "edge", not "over"), which fails the same way on main since 067.
- Review shots, docs/review/069:
  - 01-machine-card.png
  - 02-build-bar-card.png
  - 03-intake-rates.png
  - 04-purge-menu.png
  - 05-purged.png
  - 06-pipette.png
  - 07-zoomed-out.png
