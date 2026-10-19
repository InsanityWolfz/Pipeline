# Plan 026: Labels in the crafting menu and categories in the build bar

Spec: docs/specs/026-menu-labels.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec; docs/design.md is not touched. Render and data only: no sim rule changes.

## Shape of the change
1. **Data.**
   - `src/data/pieces.ts`: `category: PieceCategory` (`'logistics' | 'arrows' | 'bombs' | 'ley'`) on every piece; `PIECE_CATEGORIES`, the four groups in bar order with their labels (Logistics, Arrows, Bombs, Ley); `BUILD_BAR` reordered so the grinder sits in Ley after the packer (conduit, sorter, hopper, crate | cutter, knapper, spinner, assembler | shaper, fuse-maker, packer | grinder, focuser).
   - `src/data/hudLayout.ts`: `CRAFT_MENU_LAYOUT` gets taller rows (`rowHeight` 28) with the item name `labelY` under each icon, the inputs `step` widened to 40 so the longest names (Ley crystal, Arrowhead) clear the next input, the header's `name` beside its icon, `rowWidth`, the `missing` colour (palette id) and `greyTextAlpha` (names and counts on a greyed row stay readable), and a `height` that fits every row. `BUILD_BAR_LAYOUT` gets `groupGap`, the `divider` (palette id, alpha, inset) and `label` (row height, gap above the cells).
   - `src/data/fonts.ts`: a `label` text style, the small text under the icons.
   - `src/data/art/hud.ts` + `assets.ts`: craft-menu row frames at the new size (`craft-recipe-row`, `-hover`, `-press`); the picker, pause and site menus keep the 184×20 rows.
2. **Render, pure layout** (Vitest-checkable).
   - `bottomHud.ts`: `groupedBottomRow(sizes, cell, gap, bottom)`: groups of cells, `gap` px between groups, the whole centred; `bottomRow` becomes its one-group case. `tubeSlotBox(units, building)`: while building the slot sits `gap` above the build bar's label row instead of the hotbar row, so it never covers a label.
   - `foundryLayout.ts`: `buildBarCells(shown)` lays out the unlocked pieces in their groups; `buildBarGroups(shown)` gives each shown group's label box (a group with nothing unlocked is left out), `buildBarDividers(shown)` the dividers between them, `buildBarBox(shown)` the whole bar with its labels.
   - `craftMenuLayout.ts`: `craftPanelAt()` centres the panel and its title card together, so the taller menu fits the view.
3. **Render, views.**
   - `CraftMenuView`: a name under every input and output icon (`itemDef(id).name`), centred under the icon or, when wider, starting at its left; the have/need count stays beside the icon; an input the player is short of shows its name and count in `missing`. Each header shows the ammo's name beside its icon. `RowHover` and `flashRow` take the frames to use.
   - `BuildView`: a cell per unlocked piece, a label over each group that has one and a thin divider in each gap, rebuilt as pieces unlock. The wheel steps through the shown pieces in bar order. The build tip sits above the label row.
   - `HudView`/`TubeSlotView`: pass `building` so the tube slot clears the label row.
   - `ui()`: `craftMenu` (each recipe row's labels with their boxes and whether missing, the headers' names, the panel box) and `buildBar` (shown, cells, group labels with boxes, dividers, selected).
4. **Tests (written first).**
   - Vitest `tests/data/data.test.ts`: every `BUILD_BAR` piece has a category; the groups run in `PIECE_CATEGORIES` order and hold exactly the spec's pieces.
   - Vitest `tests/render/bottomHud.test.ts`: the grouped bar (logistics only, logistics and the cutter, everything) is centred within 1 px and inside 640×360, a group with nothing unlocked has no label or divider, groups `groupGap` apart, a divider centred in each gap, each label over its group; the build-mode tube slot sits above the label row, clear of every label; the craft panel and title card fit the view and every row sits inside the panel.
   - Playwright `tests/e2e/menuLabels.spec.ts`: open the crafting menu (attuned) and check a label exists for every recipe item with `itemDef(id).name`, each inside its row and clear of every other label and count in its row; a missing input is flagged; the headers name their ammo. On a fresh start in the foundry, build mode shows only the Logistics group (four cells, one label, no divider) and the wheel cycles it; with everything unlocked (`?playtest`) it shows the four group labels in order, 13 cells, centred, and the wheel steps through them in the new order.
   - Screenshots (REVIEW_SHOTS=1, `docs/review/026/`): the crafting menu, and the build bar (a fresh start's Logistics group, and with everything unlocked).

## Not dictated by the spec
- **Locked pieces stay hidden** (Shaun, 2026-10-19), as since 006: only unlocked pieces show, in their groups, and a group with none unlocked shows no label or divider. (The first build showed locked pieces greyed in place, from the spec's "greyed as today"; Shaun chose hidden.)
- On a greyed (unaffordable) row the icons keep 005's grey; names and counts stay at `greyTextAlpha` so the labels can be read.
- The `missing` colour is `rust-light`.
- The tube slot rises above the label row in build mode (025 keeps it above the bar).
- Group labels use the `display` face (Cinzel, like names); item names use the new small `label` style.

## Risks
- Measured text widths differ a little between machines; the e2e checks the drawn boxes, the layout leaves a few px spare.
