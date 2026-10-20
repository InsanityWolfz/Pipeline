# 026: Labels in the crafting menu and categories in the build bar
status: done

Approved by Shaun in chat, 2026-10-18 ("approve 21-27").

## Goal
The crafting menu names every item, so it no longer reads like hieroglyphics. The build bar is grouped into labelled categories, one per ammo chain plus logistics.

## Design references
- docs/design.md: "The Foundry" (ammo chains: arrows, bombs, ley bolts)
- docs/specs/005-hand-crafting.md: the crafting menu
- docs/specs/015-after-overnight.md: build-bar descriptions
- docs/specs/020-vector-pass.md: bundled fonts and the menu style
- Shaun's playtest notes, 2026-10-18: "put some labels on the resources in the crafting menu so it doesn't look like hieroglyphics and maybe add some categories to the build screen as well"
- Interview answer (Shaun, 2026-10-18): categories by ammo chain.

## Acceptance criteria

**Crafting menu (render, data)**
- [ ] Every input and output icon in a recipe row has its item name in small text directly beneath it. Names come from `itemDef(id).name`.
- [ ] The have/need counts stay next to each icon. Short of an input, its name and count show in the "missing" colour.
- [ ] Each recipe group's header shows the ammo's name beside its icon.
- [ ] No label is truncated or overlaps another row at the 640×360 view. Rows grow taller if needed, and the menu scrolls or reflows if it would overflow.

**Build bar categories (render, data)**
- [ ] The build bar shows four groups, left to right, each with a small label above it:

  | Group | Pieces |
  | --- | --- |
  | Logistics | conduit, sorter, hopper, crate |
  | Arrows | cutter, knapper, spinner, assembler |
  | Bombs | shaper, fuse-maker, packer |
  | Ley | grinder, focuser |

- [ ] Groups are separated by a visible gap and a thin divider.
- [ ] Locked pieces stay hidden, as before (spec 006); only unlocked pieces show, each in its group. A group with nothing unlocked shows no label or divider. (Corrected by Shaun, 2026-10-19: "stay hidden". The draft wrongly said locked pieces were greyed today.)
- [ ] The group a piece belongs to is data, a `category` on `PieceDef`. A test checks that every piece in `BUILD_BAR` has a category.
- [ ] Number-key or scroll selection, if present, still steps through pieces in the new order.
- [ ] The bar stays centred and inside the view.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Screenshots: the crafting menu, and the build bar.

## Data changes
- `src/data/pieces.ts`: `category: 'logistics' | 'arrows' | 'bombs' | 'ley'` on every piece; `BUILD_BAR` ordered by group.
- `src/data/hudLayout.ts`: the label row height, the group gap, and the craft-menu row height for labels.

## Out of scope
- Tabs or collapsible groups.
- Search.
- Labels in the hopper and sorter pickers (they already show names).

## Test plan
- **Vitest (data):** every `BUILD_BAR` piece has a category; the groups appear in order.
- **Playwright:** open the crafting menu and check that a text label exists for each recipe item. Open the build bar and check four group labels.
- **Screenshots:** both menus, for review.

## Open questions
None.
