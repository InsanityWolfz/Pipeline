# Plan 027: Foundry tutorial

Spec: docs/specs/027-foundry-tutorial.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec; docs/design.md is not touched. Shaun chose the arrow line.

## Shape of the change
1. **Data** (`src/data/objectives.ts`).
   - `ObjectiveCheck` gains `placed { piece }` (a piece of that id stands in the foundry), `hopperHolds { item }` (some hopper holds that item) and `machineMade { item }` (machines have made at least one, never counting hand crafts). `intakeFed` takes an optional `item`: with it, the line must also be putting that item into an entrance (a refill of it this tick), the spec's "with arrows arriving".
   - `ObjectiveDef` gains `highlight?: pieceId` (the build-bar cell that pulses) and `marker?: 'intake'` (the arrow marker). `PromptTarget` gains `newestHopper`.
   - The single "Build an ammo line into the intake (B)" becomes the spec's seven steps, in order, between "Craft a bomb and a ley bolt (C)" and "Fill the tube from your line":

     | # | Text | Check | Prompt / marker | Highlight |
     | --- | --- | --- | --- | --- |
     | 1 | Press B and place a hopper | placed hopper | B over player | hopper |
     | 2 | Put wood in the hopper (E) | hopperHolds wood | E over newest hopper | hopper |
     | 3 | Place a cutter in front of the hopper | machineMade shaft | B over player | cutter |
     | 4 | Make arrowheads: hopper of stone → knapper | machineMade arrowhead | B over player | knapper |
     | 5 | Make rope: hopper of fiber → spinner | machineMade rope | B over player | spinner |
     | 6 | Feed all three into an assembler | machineMade arrow | B over player | assembler |
     | 7 | Run a conduit from the assembler into the intake | intakeFed arrow | marker over intake | conduit |
   - Popup and pulse tuning (`MADE_POPUP` in `assets.ts` beside `PICKUP_POPUP`; `BUILD_PULSE` in `hudLayout.ts`), the intake marker's lift and bob in `TUTORIAL_LAYOUT`, and two new vector sprites: the pulse ring over a build-bar cell (`hud.ts`) and the arrow marker (`TUTORIAL_SPRITES.marker`).
2. **Sim.**
   - `src/sim/events.ts`: `made: { id, pieceId, itemId, count }[]`, pushed by `flow.ts` when a machine's craft finishes.
   - `src/sim/state.ts`: `machineMade: Record<string, number>`, the per-item tally, kept through a KO with the foundry.
   - `src/sim/objectives.ts`: `stepObjectives` adds each `made` event to the tally (as it notes harvests) and the new checks hold from state.
   - `getState()` reports `machineMade`; the objective's index and text as today.
3. **Render.**
   - `BuildView`: while the bar is open and the current objective has a `highlight` that is on the bar, a gold ring just round that cell pulses (alpha on a sine from scene time). `ui().buildBar.pulsing` names the piece, or null.
   - `PromptView`: the `newestHopper` target (the hopper placed last); the `intake` marker, a bobbing arrow over the open entrance (the middle one of those open), shown anywhere in the foundry, not only within prompt range. `ui().prompt` (key, world point, alpha) and `ui().marker` (world point) report them.
   - `TutorialUi.play(events)`: when an objective whose check is `machineMade` completes, a small "+ shaft" (the item's name, lower case) pops above the machine that made it, from that tick's `made` event, once. `ui().madePopups` lists the ones on screen.
   - Nothing pauses; no panel.
4. **Tests (written first).**
   - Vitest `tests/sim/foundryTutorial.test.ts`: the seven steps' texts and order, ending before "Fill the tube from your line"; each check from a scripted build (placed, hopperHolds, machineMade for each part and the arrow, intakeFed only with arrows arriving); hand-crafting a shaft does not complete `machineMade`; steps already done skip (a line built before the foundry steps leaves the line on "Fill the tube"); the tally survives a KO; the `made` event; replay.
   - Vitest `tests/data/data.test.ts`: every highlight is a build-bar piece, every `placed` piece exists, every `machineMade` item is some machine's output, every `hopperHolds` item exists, and every highlighted machine is unlocked (its output hand-crafted) by an earlier `crafted` objective's chain, so its cell is on the grouped bar (026) when its step comes up.
   - Rewritten: `tests/sim/sim.test.ts` (the `made` event list), `tests/e2e/tutorial.spec.ts` (the run builds the arrow line through the seven steps instead of the ley bolt line, checks each index and text, and ends on "Fill the tube from your line" before filling it).
   - Playwright `tests/e2e/foundryTutorial.spec.ts`: from `?start=field&attuned`, harvest a tree, a rubble pile and reeds, pick up dropped raws (the hook's `drop`), hand-craft the arrow and bomb chains, go down to the foundry; then the seven steps one at a time, checking the text, the B / E prompts and the intake marker, the pulsing cell, and the "+ shaft" popup, ending on "Fill the tube from your line". With `REVIEW_SHOTS=1`, into `docs/review/027/`: step 3 with the cutter cell pulsing, the "+ shaft" popup (tweens slowed), the step 4 text (its arrow glyph), and step 7 with the intake marker.

## Not dictated by the spec
- **"With arrows arriving"** is `intakeFed { item: 'arrow' }`: the line feeds the intake and an arrow went into an entrance this tick.
- **Step 2 also pulses the hopper** (it names one); steps 1–6 prompt B over the player and step 2 E over the newest hopper, as the spec lists.
- **The intake marker shows anywhere in the foundry**, not only within the 64 px prompt range, so it points the way across the room.
- **The popup** reads "+ shaft" (the item's name in lower case), rises and fades over 1.2 s, and shows when the step completes, i.e. the first time any machine makes that item.
- **The full tutorial e2e now builds the arrow line** (the old run built a ley bolt line, which no longer finishes the steps). To keep its scripted fights winnable without the ley line, it gathers a little more (one more vein regrowth, a tree, rubble and reeds), hand-crafts its crystals into ley bolts, tops the line's hoppers up, wears the identified armor for the shrine, and feeds both side entrances with ley bolts for the spread.
- **The pulse ring and marker are gold**, not cyan or brass: the cells already have brass corners and the pipe is cyan, so gold reads over both.

## Risks
- The arrow line needs more raws than the old ley line; the full run may need to gather a little more before the foundry.
- The "→" in two step texts may not be in Cinzel; the browser falls back for that glyph. Checked in the screenshots.
