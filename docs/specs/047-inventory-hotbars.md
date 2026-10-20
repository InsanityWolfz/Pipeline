# 047: Inventory and hotbars
status: draft

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 6, 11, 12, 15) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md). Shaun: "we can just copy Factorio's inventory and hopper management screens."

## Goal
The intake's volley and carried items each get their own hotbar. The inventory becomes a scrolling grid of stacks, and hopper screens show only what's in the hopper. The crafting menu gets a tab per ammo type, with tagged rounds such as frost arrows crafted there like anything else.

## Design references
- docs/design.md: "The Foundry", "Combat".
- Specs: 022 (click one, Shift+click half, Ctrl+click all), 023 (the punch), 024 and 028 (the volley), 025 (the bottom HUD), 026 (menu labels), 029 (tags and stages; option A counts entrances), 031 (the inventory panel), 038 (the crafting menu's columns), 040 (hover summaries), 042 (key bindings).

## Acceptance criteria
**Two hotbars (note 11)**
- [ ] Left click fires the intake's volley. With the intake empty, it punches (023).
- [ ] A carried bar of 5 slots (keys 1–5) selects a carried item. Right click uses the selected item: throws a bomb or landmine, or fires a carried round.
- [ ] Carried items never fire on left click, and the volley never fires on right click.
- [ ] Drag a stack from the inventory onto a slot to put it there. A usable item kind picked up for the first time fills the first empty slot by itself.
- [ ] The bottom HUD (025) shows the intake's bar and the carried bar apart.

**Grid inventory (note 12)**
- [ ] The inventory is a grid of slots. Each slot holds one stack, with stack sizes in data. It scrolls when it holds more than fits, and has a sort button.
- [ ] Click moves one, Shift+click half and Ctrl+click the whole stack, into an open hopper or crate, or back. The menu doesn't print these controls.
- [ ] The at-risk and banked marking (031) carries over.

**Hopper screens (note 12)**
- [ ] A hopper's screen shows the hopper's own slots on top and the grid inventory underneath. It shows only what's in the hopper, never the matching items the player carries.
- [ ] The same clicks move items both ways.

**Crafting menu (notes 6, 15)**
- [ ] The crafting menu (C) has a tab per ammo type (Arrows, Bombs, Ley, Landmines). Each tab holds that ammo's whole chain, parts included; a part two families use shows in both.
- [ ] Tagged rounds (frost arrows and the rest) are crafted in their family's tab like any recipe, anywhere. They aren't called "stages" anywhere the player sees. Their inputs count carried rounds plus the entrances (029 option A).
- [ ] The bench's Stages panel is removed.

## Data changes
- `src/data/items.ts`: stack sizes.
- `src/data/hudLayout.ts`, `src/data/hudPanels.ts`: the two bars, the grid, the hopper screen.
- `src/data/recipes.ts`, `src/data/craftColumns.ts`, `src/data/stages.ts`: the tabs, tagged rounds as recipes.
- `src/data/settings.ts`: keys 1–5 and right click bindable (042).

## Out of scope
- The volley's shape (next batch).
- Crates' screens beyond using the same grid.
- Gear and the stash.

## Test plan
- Vitest: left and right click never cross; the dry punch; auto-fill and drag onto the carried bar; stacks, the grid's sort, and click, Shift and Ctrl moves both ways; the hopper shows only its contents; tagged-round crafting counts carried plus entrances; saves migrate (042: the inventory's shape changes, so `SAVE_VERSION` bumps with a migration).
- Playwright: fire the volley and use a carried landmine; craft frost arrows from the Arrows tab; fill a hopper from the grid.
- Screenshots: both hotbars, the grid inventory, a hopper screen, each crafting tab.

## Open questions
- **047.1 Stack sizes.** Proposal: resources 50, parts and rounds 100, bombs and landmines 20, gear 1.
- **047.2 How many inventory slots?** Proposal: 40, as an 8×5 grid on screen; no limit beyond that for now (the grid scrolls).
- **047.3 Does the carried bar keep its slots after a death?** Proposal: yes; a slot whose items were lost shows empty and refills when that kind is picked up again.
- **047.4 Where does the old key 1–3 ammo select go?** Proposal: it becomes the carried bar's 1–5; the intake has no select key, since it fires its volley.
