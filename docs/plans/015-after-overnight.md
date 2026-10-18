# Plan: 015 Fixes after the overnight run (docs/specs/015-after-overnight.md, approved)

Shaun approved the spec and asked me to carry 015 through on my own (2026-10-18). Branch `claude/015-after-overnight`, stacked on 014.

## Sim
- **Data:**
  - `LogisticsDef.kind` gains `'sorter'`. `PIECES.sorter` (Sorter, 1x1, free) goes in `BUILD_BAR` after the conduit.
  - Every `PieceDef` gets a `description`. A data test checks each one is non-empty and uses only glyphs the pixel font has.
- **State:**
  - `SorterState { kind: 'sorter'; item; progress; filter: string | null; mirrored: boolean }`.
  - `createPiece(..., opts)` takes `{ inFrom?, mirrored? }`.
- **`pieces.ts`:** `sortTile(p)` is the side the sorted item leaves by: right of the facing (`rotateCw`), or left when mirrored. `exitTile(p, item)` is that side for the filter item, else the front.
- **`flow.ts`:**
  - `advance` moves a sorter's item like a conduit's.
  - `transfer` offers to `exitTile`, and a refused item waits, which stalls the sorter.
  - `offer` takes an item into a sorter only from its back.
  - Hoppers may feed sorters.
- **Placement:**
  - `place` gains `mirrored`.
  - `conduitInFrom`'s feeder check counts a sorter whose front or sort side is the new tile.
  - `pieceContents` returns a sorter's held item.
- **Commands:** `setFilter: { id, itemId | null } | null`. In `foundryUse`, it applies to a sorter in reach. Sorters count as usable, so E finds them; the sim does nothing on E, and render opens the picker.
- **Tube:** `stepTube` doesn't fire while `roomId === FOUNDRY_ROOM`. There's no shot, no ammo spent, no dry fire, and `firing` stays false.
- **Summary:** the sorter's `item`, `progress`, `filter` and `mirrored`.

## Render
- **Camera:** remove the lead (`leadToward`, `resetLead`, `CAMERA_LEAD`).
- **Menu clicks:** a press that starts over any UI (the build bar, the picker, world menus, the HUD hotbar and strip) blocks fire until the button is released. `Controls` latches it on pointerdown. The HUD gets an `overUi` for its slot and strip.
- **Sorter view:**
  - A body sprite per view (down, up, side, flipped for left), with a mirrored variant drawn flipped across the flow. The filter item's icon sits in its slot.
  - Items ride the conduit path to the front or the sort side.
- **Arrows:** an input arrow on the back, a cyan output arrow on the front, and a gold output arrow on the sort side (the `out` sprite tinted gold).
- **Ghost:** F flips the ghost (`Controls.mirrored`), which is sent with `place`.
- **Picker:** E on a sorter in reach opens a `ChoiceMenu` in `SiteMenus` with "Clear" plus every item. A click sends `setFilter`.
- **Hover names:** `src/render/hoverNames.ts` has a pure `nameAt(sim, roomId, x, y)`. It checks, in order: foundry piece, fixture, enemy (sprite box), ground item, node, pylon, tube stone, crystal. `WorldNameView` draws the name in the letter font above the thing, above the readout for pieces.
- **Build bar:** hovering a cell shows a panel with the name and the description wrapped to the panel width.

## Art (pending review)
- `sorter-down`, `sorter-up`, `sorter-side`: a conduit body with a gate notch on the sort side.
- `emblem-sorter`.
- A panel backing for the description, reusing `craft-panel` if it fits.

## Tests
- **`tests/sim/sorter.test.ts`:**
  - routing (right, left when mirrored, no filter)
  - intake only from the back
  - stalling on a blocked exit
  - `setFilter` reach
  - pick-up
  - conduit auto-join on the sort side
  - a supply-port split into two crates
  - determinism
- **`tests/sim/tube.test.ts`:** no fire in the foundry.
- **`tests/render/hoverNames.test.ts`:** names for each kind of thing.
- **Data:** descriptions and glyph coverage, and the sorter sprites.
- **e2e:**
  - a sorter split built with the mouse, F and the picker
  - a menu click doesn't fire
  - the build-bar description
  - a Husk's hover name
