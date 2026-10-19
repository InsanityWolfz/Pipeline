# Plan 026: Labels in the crafting menu and categories in the build bar

Spec: docs/specs/026-menu-labels.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec; docs/design.md is not touched. Render and data only: no sim rule changes.

## Shape of the change
1. **Data.**
   - `src/data/pieces.ts`: `category: PieceCategory` (`'logistics' | 'arrows' | 'bombs' | 'ley'`) on every piece; `PIECE_CATEGORIES`, the four groups in bar order with their labels (Logistics, Arrows, Bombs, Ley); `BUILD_BAR` reordered so the grinder sits in Ley after the packer (conduit, sorter, hopper, crate | cutter, knapper, spinner, assembler | shaper, fuse-maker, packer | grinder, focuser).
   - `src/data/hudLayout.ts`: `CRAFT_MENU_LAYOUT` gets taller rows (`rowHeight` 28) with the item name `labelY` under each icon, the inputs `step` widened to 40 so the longest names (Ley crystal, Arrowhead) clear the next input, the header's `name` beside its icon, `rowWidth`, the `missing` colour (palette id) and `greyTextAlpha` (names and counts on a greyed row stay readable), and a `height` that fits every row. `BUILD_BAR_LAYOUT` gets `groupGap`, the `divider` (palette id, alpha, inset), `label` (row height, gap above the cells) and `lockedAlpha`.
   - `src/data/fonts.ts`: a `label` text style, the small text under the icons.
   - `src/data/art/hud.ts` + `assets.ts`: craft-menu row frames at the new size (`craft-recipe-row`, `-hover`, `-press`); the picker, pause and site menus keep the 184×20 rows.
2. **Render, pure layout** (Vitest-checkable).
   - `bottomHud.ts`: `groupedBottomRow(sizes, cell, gap, bottom)`: groups of cells, `gap` px between groups, the whole centred; `bottomRow` becomes its one-group case. `tubeSlotBox(units, building)`: while building the slot sits `gap` above the build bar's label row instead of the hotbar row, so it never covers a label.
   - `foundryLayout.ts`: `buildBarCells()` lays out every piece in `BUILD_BAR` (locked ones keep their place); `buildBarGroups()` gives each group's label box and the divider between groups; `buildBarBox()` the whole bar with its labels.
   - `craftMenuLayout.ts`: `craftPanelAt()` centres the panel and its title card together, so the taller menu fits the view.
3. **Render, views.**
   - `CraftMenuView`: a name under every input and output icon (`itemDef(id).name`), centred under the icon or, when wider, starting at its left; the have/need count stays beside the icon; an input the player is short of shows its name and count in `missing`. Each header shows the ammo's name beside its icon. `RowHover` and `flashRow` take the frames to use.
   - `BuildView`: all 13 cells always, greyed (`lockedAlpha`) while locked; a label over each group and a thin divider in each gap. The wheel steps through the unlocked pieces in bar order; clicking a locked cell selects nothing (and places nothing). The build tip sits above the label row.
   - `HudView`/`TubeSlotView`: pass `building` so the tube slot clears the label row.
   - `ui()`: `craftMenu` (each recipe row's labels with their boxes and whether missing, the headers' names, the panel box) and `buildBar` (shown, cells with locked, group labels with boxes, dividers, selected).
4. **Tests (written first).**
   - Vitest `tests/data/data.test.ts`: every `BUILD_BAR` piece has a category; the groups run in `PIECE_CATEGORIES` order and hold exactly the spec's pieces.
   - Vitest `tests/render/bottomHud.test.ts`: the grouped bar is centred within 1 px and inside 640×360, groups `groupGap` apart, a divider centred in each gap, each label over its group; the build-mode tube slot sits above the label row, clear of every label; the craft panel and title card fit the view and every row sits inside the panel.
   - Playwright `tests/e2e/menuLabels.spec.ts`: open the crafting menu (attuned) and check a label exists for every recipe item with `itemDef(id).name`, each inside its row and clear of every other label and count in its row; a missing input is flagged; the headers name their ammo. Enter build mode in the foundry and check the four group labels in order, 13 cells with machines locked, centred, the wheel stepping in the new order and skipping locked pieces.
   - Screenshots (REVIEW_SHOTS=1, `docs/review/026/`): the crafting menu, and the build bar (with locked pieces, and with everything unlocked).

## Not dictated by the spec
- **Locked pieces now show.** The spec says locked pieces "keep their place in their group, greyed as today", but today (006) the bar shows only unlocked pieces. Following its words, every piece shows, locked ones greyed; a locked cell can't be selected and the wheel skips it. Its hover tip still names it.
- On a greyed (unaffordable) row the icons keep 005's grey; names and counts stay at `greyTextAlpha` so the labels can be read.
- The `missing` colour is `rust-light`.
- The tube slot rises above the label row in build mode (025 keeps it above the bar).
- Group labels use the `display` face (Cinzel, like names); item names use the new small `label` style.

## Risks
- Measured text widths differ a little between machines; the e2e checks the drawn boxes, the layout leaves a few px spare.
