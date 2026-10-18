# 015: Fixes after the overnight run
status: approved

Approved by Shaun in chat (2026-10-18: "approve the spec and then follow through to the end of 015 on your own").

## Goal
Shaun's changes from playing 007–014. A sorter piece pulls one chosen item off a mixed line onto its own belt, so the supply port can feed specific hoppers. The tube no longer fires in the foundry or on menu clicks. The camera no longer pans while shooting. Mousing over things names them, and the build bar describes each piece.

## Design references
- docs/design.md: "The Foundry" (walk-around building; rearranging a line is fast), "Pillars" 2 (the layout shapes every shot)
- docs/prototype.md: "Player flow" beats 5–9 (building lines, the supply line after claiming)
- docs/specs/009-claiming.md: the supply port's mixed raws
- docs/specs/014-look-and-feel.md: the camera lead being removed here
- Interview decisions (Shaun, 2026-10-18):
  - **Sorter:** free and in the build bar from the start. E opens a picker to set its item. The item leaves by the right side, and F flips it to the left. A blocked exit stalls the sorter.
  - **Firing:** blocked anywhere in the foundry, and on any menu or UI click elsewhere.
  - **Camera:** the lead toward the aim is removed.
  - **Names:** on mouse-over for everything in the world. The build bar shows a short description.
  - **Gear:** stays at the bench as it is.

## Acceptance criteria

**Sorter (sim, data)**
- [ ] A new 1×1 logistics piece, `sorter`. It's free, unlocked from the start, and sits in the build bar after the conduit. Like a conduit, it has a facing (its front) and takes items only from its back. It holds one item, which takes CONDUIT_TICKS to cross.
- [ ] A sorter has a `filter` item (null when new) and a `mirrored` flag.
  - An item matching the filter leaves by the sorter's right side (left when mirrored).
  - Every other item leaves by the front.
  - With no filter, everything goes out the front.
- [ ] A blocked exit stalls the sorter: the item waits, and the line behind it backs up. A missing piece on the exit counts as blocked.
- [ ] A conduit or machine on the side exit accepts the sorted item as it would from any feeder. Conduits follow 013's rule: they take only from their `inFrom` side. A conduit placed on a sorter's side exit auto-joins it as a corner, because the sorter's side counts as a feeder facing that tile.
- [ ] Commands:
  - `place` gains an optional `mirrored`.
  - A new `setFilter: { id, itemId | null }` sets a sorter in reach.
  - E on a sorter does nothing in the sim; render opens the picker, as for hoppers.
- [ ] Picking up a sorter returns its held item to the inventory, as a conduit does. The summary includes `filter` and `mirrored`.

**Sorter (render, art)**
- [ ] A sorter sprite per view: a conduit-like body with a gate and a small slot showing the filter item's icon. Pending review.
- [ ] Build mode shows its input arrow on the back, and output arrows on the front and on the sorted side (gold for the sorted side). F flips the ghost.
- [ ] E within reach opens a picker listing every item. "Clear" sets it back to pass-through. The chosen item's icon shows on the sorter.

**No firing in the foundry or on menus**
- [ ] While the player is in the foundry, fire does nothing in the sim: no shot, no ammo spent, and no dry fire.
- [ ] Anywhere, a mouse press that lands on a menu, the build bar or the HUD never fires. This applies to the pylon, stash, bench, hopper and sorter menus.

**Camera**
- [ ] The camera lead toward the aim is removed. The camera stays centred on the player while firing. Shake is unchanged.

**Names and descriptions**
- [ ] Hovering anything in the world shows its name in one line of the pixel font just above it:
  - foundry pieces and fixtures
  - gathering nodes
  - enemies
  - ground items
  - the pylon, the tube stone and the ley crystal
  
  For foundry pieces, the name sits above the existing hover readout.
- [ ] Hovering a build bar cell shows a small panel with the piece's name and a one- or two-line description from data. Every buildable piece has a description.

**Hook**
- [ ] `getState()` foundry pieces include the sorter's `filter`, `mirrored`, `item` and `progress`. `step()` accepts `setFilter`.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The new sprites are pending review.

## Data changes
- `src/data/pieces.ts`:
  - `sorter` (logistics kind `sorter`), added to `BUILD_BAR` after the conduit
  - a `description` on every piece
- `src/data/foundryAssets.ts`: sorter sprites and the emblem.
- `src/data/descriptions.ts` (or fields on existing defs): world names for nodes, enemies, items and fixtures. These come from existing `name` fields where they exist.

## Out of scope
- Splitters, mergers and round-robin.
- Filters on hoppers or conduits.
- A gear panel. Gear stays at the bench as it is.
- Tooltips on menus other than the build bar.

## Test plan
- **Vitest:**
  - A sorter routes the filter item right, or left when mirrored, and everything else forward.
  - No filter passes everything forward.
  - A blocked side exit stalls it and backs up the line.
  - It takes only from its back.
  - `setFilter` is ignored out of reach.
  - Pick-up returns the held item.
  - A conduit auto-joins a sorter's side exit.
  - The supply port feeds a sorter chain that splits wood and stone onto their own belts into crates.
  - Fire in the foundry does nothing and spends nothing.
  - Determinism.
- **Data:** every build-bar piece has a description, and the sorter sprites are in the atlas.
- **Playwright:**
  - Place a sorter with the mouse, flip it with F, and set its item through the E picker. Items split into two crates.
  - Clicking a menu in the field doesn't fire.
  - Hovering a build bar cell shows its description.
  - Hovering a Husk shows "Husk".
- **Screenshots:**
  - a sorter splitting the supply line
  - the picker
  - the build bar description
  - world names on a node, an enemy and a piece

## Open questions
- None. The descriptions are a first draft written in the build, for Shaun to edit.
