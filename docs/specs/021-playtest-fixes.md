# 021: Playtest fixes: pickup reach, no fire shake, menu pointer, arrowhead
status: done

Approved by Shaun in chat, 2026-10-18 ("approve 21-27").

## Goal
Four small fixes from Shaun's playtest:
- Drops get picked up from about two tiles away, even with a tree or rock in between.
- Firing no longer shakes the screen.
- Menus show a mouse pointer that draws above their buttons.
- The arrowhead item is just the stone head, with no wood.

## Design references
- docs/design.md: "Combat" (deliberate, readable combat), "Tech and prototype scope" (clean vector art)
- docs/specs/014-look-and-feel.md: screen shake sizes (juice)
- docs/specs/018-believable-resources.md: harvest drops
- docs/specs/020-vector-pass.md: HUD, menus and item icons in vector
- Shaun's playtest notes, 2026-10-18:
  - "increase pickup radius and allow the radius to pick up things even if there's something in the way"
  - "show a mouse pointer when in menus like the crafting interface. looks like the crosshair is drawing behind the buttons"
  - "eliminate screen shake when shooting its too jarring"
  - "the arrowhead sprite has some wood on it and it should just be the stone arrowhead with no wood"
- Interview answer (Shaun, 2026-10-18): the pickup reach is about 2 tiles (64 px).

## Acceptance criteria

**Pickup reach (sim, data)**
- [ ] `PICKUP_RADIUS` becomes 64 px, measured from the edge of the feet box as today.
- [ ] Pickup ignores everything between the player and the item, including solid tiles, trees, rocks, nodes and walls. It still only takes items in the player's current room.
- [ ] A test covers the case from the playtest. Harvest a tree with the player south of it, and force the log to land north of the tree. The log is picked up without the player moving.
- [ ] Render: a picked-up item visibly slides into the player over a few frames instead of vanishing. This is cosmetic only. The sim has already moved the item into the inventory.

**No shake on firing (render)**
- [ ] Firing the tube triggers no camera shake, whatever the ammo and however many streams fire.
- [ ] Other shakes are unchanged: bomb explosions, taking a hit and enemy deaths.

**Menu pointer (render, data)**
- [ ] While any menu is open, the crosshair is hidden and a vector arrow pointer is drawn at the mouse instead. Menus here means crafting, pause, hopper, sorter, pylon, stash, bench and the wake panel.
- [ ] The pointer also shows while the mouse is over the build bar or another clickable HUD element.
- [ ] The pointer and the crosshair both draw above every menu and HUD layer, on a new `DEPTHS.cursor` that sits above all other depths. Nothing draws over the cursor.
- [ ] The OS cursor stays hidden.

**Arrowhead sprite (data/art)**
- [ ] The `arrowhead` icon is only the stone head. The wood stub line is removed.
- [ ] The `arrow` and `shaft` icons are unchanged.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Screenshots:
  - the crafting menu with the pointer over a button
  - the arrowhead icon
  - a log being picked up from behind a tree

## Data changes
- `src/data/player.ts`: `PICKUP_RADIUS = 64`.
- `src/data/assets.ts`: `DEPTHS.cursor`.
- `src/data/art/hud.ts`: a pointer sprite.
- `src/data/art/items.ts`: the arrowhead without its wood stub.

## Out of scope
- Any change to where drops scatter.
- Magnet pull of items in the sim.
- Shake tuning beyond removing the firing shake.

## Test plan
- **Vitest:** pickup at 63 and 65 px. Pickup through a solid tile and through a node box. The behind-the-tree harvest case. No pickup across rooms.
- **Playwright:**
  - With the crafting menu open, the pointer is visible and the crosshair hidden, and the pointer's depth is above the menu's.
  - Firing records no shake event; a bomb explosion still records one.
- **Screenshots:** the three listed above.

## Open questions
None.
