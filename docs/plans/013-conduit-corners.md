# Plan: 013 Conduit corners (docs/specs/013-conduit-corners.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/013-conduit-corners`, stacked on 012.

## Sim
- **State:** `ConduitState.inFrom: Facing` is the side items enter from. A straight conduit enters from the side opposite its facing.
- **Intake:** a conduit only takes items whose source tile is on its `inFrom` side. The 006 rule was "any side but its front".
- **Place command:** gains an optional `inFrom`.
  - Given, it must be perpendicular to the facing, or the opposite of it (straight). Anything else falls back to straight.
  - Absent on a single click, auto-join applies: if nothing faces into the conduit's back, and exactly one neighbour on its left or right has its front on the new tile, the conduit turns to take from that side. Fixtures count too: the supply port's front is its tile ahead.
- **Never re-shaping:** neighbours are never touched.
- **Summary:** the conduit summary gains `inFrom`.

## Render
- **Drag:** each queued conduit carries the facing toward the next tile. A turn tile takes `inFrom` from the side the previous tile is on, which makes an L. The last tile keeps the final step's direction.
- **Single click:** `place` is sent without `inFrom`, so the sim's auto-join decides. The ghost previews the result with a `previewInFrom(sim, tile, facing)` helper shared with the sim.
- **Sprites:** `CONDUIT_CORNERS[in][out]`, 8 animated sprites, 2 frames each.
- **Items on a bend:** an item rides from the `inFrom` edge to the centre, then out to the front edge.
- **Build mode:** a gold input arrow on the conduit's `inFrom` edge.

## Tests first (`tests/sim/corners.test.ts`)
- **Intake:**
  - A corner takes only from `inFrom` and refuses its other sides.
  - Straight conduits behave as before from their back; side-feeds into a straight conduit are now refused.
- **Auto-join:**
  - It joins with one side feeder.
  - It doesn't join with no feeder, with two feeders, or when the back is fed.
  - It joins to the supply port.
  - Neighbours are unchanged.
- **Explicit `inFrom`:** a valid one is kept; an invalid one becomes straight.
- **Flow:** a U-shaped run (right, down, left) carries items end to end into a crate.
- **Data test:** all 8 corner sprites exist.
- **e2e:** drag an L with the mouse; items cross it into a crate.
