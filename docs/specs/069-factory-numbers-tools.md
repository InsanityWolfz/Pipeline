# 069: Factory numbers and tools
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Drafted from the factory playtester's findings (docs/brainstorm/2026-10-26-agent-playtest.md, "Quality of life") and the proposal Shaun approved (docs/brainstorm/2026-10-26-playtest-calls.md).

## Goal
Building and retooling lines stops being guesswork. Machines and the intake show their numbers. Hoppers take sensible amounts. A jammed lane can be purged. A pipette copies a piece. Area pick-up hands items back to you. Build mode can zoom out to see the whole foundry.

## Design references
- docs/design.md, "The Foundry":
  - "No ratio math ... Machines show where the bottleneck is."
  - "Rearranging a line is fast, so retooling for a fight never takes long."
- Specs 006 (building), 022 (hopper amounts), 047 (inventory and screens), 052 (logistics), 063 (blueprints and the Area tool).

## Acceptance criteria
- [ ] **Recipe cards:** a build-bar piece's hover and a placed machine's hover show its recipe card, e.g. "1 wood → 2 shafts · 1.0 s". `machine-speed` is applied, and for a tiered machine it's the variant running now. A running machine also shows items a minute out.
- [ ] **The intake:** its hover shows, for each open entrance, its round, its fill, its supply rate in and its fire rate ("in 2.3/s · fires 4/s"), measured over the last few seconds.
- [ ] **Hoppers:**
  - a click inserts 10 (or all, if fewer);
  - Shift-click inserts half the stack;
  - Ctrl-click inserts the whole stack;
  - taking out mirrors this.
  - This replaces 022's amounts; 022's tests are updated, not deleted.
- [ ] **Purge:** E at an intake entrance offers "Purge". It moves that entrance's reservoir into the stash (or the inventory if the stash can't take it), so a new round kind can flow in.
- [ ] **Pipette:** in build mode, Q over a placed piece puts that piece in hand with its facing and settings (a conduit's turn, a stage's round), ready to place. Q over nothing empties the hand.
- [ ] **Area pick-up:** contents go to the inventory first and the stash for whatever doesn't fit. This replaces 063's stash-only rule, and the refusal now applies only if both are full.
- [ ] **Zoom:** in build mode, the mouse wheel steps the camera between 1× and 0.75× so the whole foundry fits, and leaving build mode returns to 1×. Placement and hovers work at both zooms.
- [ ] Every number shown is read from sim data, never computed separately in render.
- [ ] Review shots (docs/review/069): a machine's recipe card; the intake's rates; a purge; the pipette; the build mode zoomed out.

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
