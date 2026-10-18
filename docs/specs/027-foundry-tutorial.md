# 027: Foundry tutorial: building your first line, step by step
status: draft

## Goal
Once the player enters the foundry, the objective line walks them through building an arrow line, one small step at a time: hoppers, the three part machines, the assembler, and a conduit into the intake. Each step ticks off as they do it, so nobody has to guess how machines feed the tube.

## Design references
- docs/design.md:
  - "Opening: first 30 minutes" beat 5 ("Commit the one starting supply slot to a favorite and build its line")
  - "The Foundry" ("Ammo is built physically": wood → cutter → shafts, stone → knapper → heads, fiber → spinner → rope, assembler → arrows)
- docs/specs/012-tutorial-flow.md: objectives and prompts
- docs/specs/024-intake-spread.md: entrances
- docs/specs/026-menu-labels.md: build-bar categories, which this highlights
- Shaun's playtest notes, 2026-10-18: "we also need a little tutorial once you get in the foundry on how to make the machines that feed the tube"
- Interview answer (Shaun, 2026-10-18): step-by-step objectives that tick off as you go.

## Acceptance criteria

**Steps (data, sim)**
- [ ] The single objective "Build an ammo line into the intake (B)" becomes these steps, shown one at a time in the existing objective line:
  1. "Press B and place a hopper"
  2. "Put wood in the hopper (E)"
  3. "Place a cutter in front of the hopper": the cutter makes a shaft
  4. "Make arrowheads: hopper of stone → knapper": a knapper makes an arrowhead
  5. "Make rope: hopper of fiber → spinner": a spinner makes rope
  6. "Feed all three into an assembler": an assembler makes an arrow
  7. "Run a conduit from the assembler into the intake": `intakeFed` with arrows arriving
- [ ] Each step completes from sim state through new objective checks:
  - `placed { piece }`
  - `hopperHolds { item }`
  - `machineMade { item }`, which counts items made by a machine, not by hand
- [ ] Steps complete in any order, as objectives do today. A player who already built a line skips straight past them.
- [ ] Wording is data and is a first draft for Shaun to edit.

**Guidance (render)**
- [ ] During a step that names a piece, that piece's build-bar cell pulses gently while the build bar is open.
- [ ] The key prompt floats over the relevant thing:
  - **B** over the player for placing steps
  - **E** over the newest hopper for filling it
  - an arrow marker over the intake for the conduit step
- [ ] When a machine first makes its part during the tutorial, a small "+ shaft" (or the part's name) pops above it once.
- [ ] Nothing pauses the game, and no panel blocks the view.

**Hook**
- [ ] `getState()` reports the current objective's index and text, as today.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/objectives.ts`:
  - the steps above
  - the new check kinds `placed`, `hopperHolds` and `machineMade`
  - an optional `highlight: pieceId` on an objective
- `src/sim/objectives.ts`: the new checks, and a per-item machine-made tally kept in state.

## Out of scope
- Tutorials for bombs, ley bolts, sorters or spreads (the spread objective is in 024).
- Voice-over, a picture panel, and re-playing the tutorial.

## Test plan
- **Vitest:** each new check completes from a scripted build. Steps skip if already done. Hand-crafting a shaft does not complete `machineMade`.
- **Playwright:** a scripted run through the foundry steps. The objective text advances through all 7 and ends on "Fill the tube from your line".
- **Screenshots:** step 3 with the cutter cell pulsing, and step 7 with the intake marker.

## Open questions
- [ ] **Which line.** The tutorial teaches the arrow line, the design doc's own example. Would you rather it teach a shorter line, such as ley crystal → grinder → focuser (two machines, no assembler)?
