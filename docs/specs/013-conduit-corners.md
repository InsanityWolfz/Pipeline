# 013: Conduit corners
status: approved

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18). He reviews it in the morning report.

## Goal
Conduits can turn corners. Dragging a conduit run around a bend makes the turn tile an L. A single conduit placed beside a feeding neighbour joins it as an L. Conduits already placed never change shape on their own.

## Design references
- docs/design.md: "The Foundry" (walk-around building; "Rearranging a line is fast")
- docs/specs/006-foundry-building.md: conduits, item flow, drag placement; backlog 013 from the 006 playtest
- Interview decisions (Shaun, 2026-10-18): drag turns plus auto-join on single placement; existing conduits never re-shape.

## Acceptance criteria

**Shape (sim)**
- [ ] A conduit has a facing (its out side) and an `inFrom` side: the side it takes items from. A straight conduit takes from its back. A corner takes from one side next to its back. It still holds 1 item and takes 15 ticks to cross.
- [ ] A conduit only accepts items from its `inFrom` side. This tightens 006's rule, where any side but the front was allowed. Existing straight runs behave the same because they feed from the back.

  *Judgement call, logged for Shaun: one entry side makes lines readable and stops side-feeds from merging by accident. If 006-style merging is wanted, a merger piece can come later.*
- [ ] The `place` command gains an optional `inFrom`. Without it, the conduit is straight.

**Drag (render, sim)**
- [ ] While dragging, each new tile's facing is the drag direction into the next tile. When the path turns, the turn tile's `inFrom` is the side the previous tile came from, so it becomes an L. The first tile uses the ghost's facing. The last tile keeps the direction of the final step.

**Auto-join on single placement (sim)**
- [ ] A conduit placed alone (a click, not a drag) uses the ghost's facing. If nothing feeds into its back, and exactly one neighbour on its left or right side has its front pointing into the new tile, the new conduit becomes an L taking from that side. Neighbours aren't changed.

**Render, art**
- [ ] Corner conduit sprites for all 8 in/out pairs (4 drawn plus flips), with the flow animation following the bend. Items ride the bend, drawn along an L path.
- [ ] The ghost shows a corner when the placement would auto-join, or at a drag turn.
- [ ] Build mode shows a gold input arrow on a conduit's `inFrom` edge. 006 had none on conduits, so this keeps corners readable.

**Hook**
- [ ] The conduit summary gains `inFrom`.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The corner sprites are pending review.

## Data changes
- `src/data/foundryAssets.ts`: corner conduit animation keys.

## Out of scope
- Mergers, splitters, underground conduits, and re-shaping neighbours.

## Test plan
- **Vitest:**
  - A corner takes only from `inFrom` and refuses other sides.
  - Straight conduits are unchanged.
  - A drag path with turns gives the right `inFrom` at each turn.
  - Auto-join with one feeder, and no join with zero or two feeders or a back feeder.
  - Neighbours never change.
  - A U-shaped run carries items end to end.
- **Playwright:** drag an L run with the mouse and see items cross it into a crate.
- **Screenshots:** an L, a U and a zig-zag run with items riding them, and a corner ghost.

## Open questions
- None.

## Build notes
These choices were made in the overnight build, not by the spec. They're logged for Shaun to accept or overturn in the morning report.
- **A drag's first tile faces the drag, not the ghost.** The spec says it uses the ghost's facing. That breaks a run whenever you drag in a direction other than the ghost's: the first piece would point away from the second. So every dragged tile faces the next one, and the first tile also auto-joins a side feeder, as a click does. A click still uses the ghost's facing.
- **The tile under the cursor is held back during a drag** until the next tile says which way it faces. It's laid on release, including a release outside the canvas. A click therefore places on release rather than on press.
- **The ghost during a drag** shows the held tile as it would be laid: straight on from the side the drag came in by. A turn tile becomes a corner, and is laid, the moment the cursor leaves it in the new direction. So the corner shows as a real piece rather than as a ghost.
- **Eight corner sprites, no flips.** All 8 in/out pairs are drawn separately, because a flipped corner would light the wrong edges. The spec said "4 drawn plus flips".
- **Drag logic** lives in `src/render/dragPath.ts` as pure functions, unit-tested (`tests/render/dragPath.test.ts`) for straight, L, zig-zag, U and fast diagonal drags.
- **Side feeds are refused.** A straight conduit no longer takes items from a hopper or machine at its side (006 allowed it). Turn the conduit into a corner instead.
- `portFront` moved from `claims.ts` to `fixtures.ts`, which breaks an import cycle with `placement.ts`.
