# 047: Inventory and hotbars
status: approved

Approved on draft by Shaun in chat, 2026-10-20 ("Approve 45-47 on draft"): the build follows the proposals in the open questions.

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 6, 11, 12, 15) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md). Shaun: "we can just copy Factorio's inventory and hopper management screens."

## Goal
The intake's volley and carried items each get their own hotbar. The inventory becomes a scrolling grid of stacks, and hopper screens show only what's in the hopper. The crafting menu gets a tab per ammo type, with tagged rounds such as frost arrows crafted there like anything else.

## Design references
- docs/design.md: "The Foundry", "Combat".
- Specs: 022 (click one, Shift+click half, Ctrl+click all), 023 (the punch), 024 and 028 (the volley), 025 (the bottom HUD), 026 (menu labels), 029 (tags and stages; option A counts entrances), 031 (the inventory panel), 038 (the crafting menu's columns), 040 (hover summaries), 042 (key bindings).

## Acceptance criteria
**Two hotbars (note 11)**
- [x] Left click fires the intake's volley. With the intake empty, it punches (023).
- [x] A carried bar of 5 slots (keys 1–5) selects a carried item. Right click uses the selected item: throws a bomb or landmine, or fires a carried round.
- [x] Carried items never fire on left click, and the volley never fires on right click.
- [x] Drag a stack from the inventory onto a slot to put it there. A usable item kind picked up for the first time fills the first empty slot by itself.
- [x] The bottom HUD (025) shows the intake's bar and the carried bar apart.

**Grid inventory (note 12)**
- [x] The inventory is a grid of slots. Each slot holds one stack, with stack sizes in data. It scrolls when it holds more than fits, and has a sort button.
- [x] Click moves one, Shift+click half and Ctrl+click the whole stack, into an open hopper or crate, or back. The menu doesn't print these controls.
- [x] The at-risk and banked marking (031) carries over.

**Hopper screens (note 12)**
- [x] A hopper's screen shows the hopper's own slots on top and the grid inventory underneath. It shows only what's in the hopper, never the matching items the player carries.
- [x] The same clicks move items both ways.

**Crafting menu (notes 6, 15)**
- [x] The crafting menu (C) has a tab per ammo type (Arrows, Bombs, Ley, Landmines). Each tab holds that ammo's whole chain, parts included; a part two families use shows in both.
- [x] Tagged rounds (frost arrows and the rest) are crafted in their family's tab like any recipe, anywhere. They aren't called "stages" anywhere the player sees. Their inputs count carried rounds plus the entrances (029 option A).
- [x] The bench's Stages panel is removed.

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

## Raised after the build
Built on `claude/047-inventory-hotbars` (plan: docs/plans/047-inventory-hotbars.md). 047.1–047.4 are built as proposed: stacks of 50 (resources), 100 (parts, rounds, and schematics as parts), 20 (every bomb and landmine round) and 1 (unidentified gear); 40 slots shown as 8×5 with no limit (the grid scrolls by rows); the carried bar keeps its kinds through a KO, an emptied slot shows empty and fills again when that kind comes back; keys 1–5 are the carried bar, and the intake has no select key. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **047.5 Saves (Shaun's rule, 2026-10-20: "do not account for corrupting old saves or preserving their playability. If a feature breaks a save then the person just starts over.").** SAVE_VERSION is 4 with no migration. A version 3 save reads as too old through 042's path: no crash, Continue unavailable, a New game starts fresh (tested). The older migrations stay; removing them is a separate cleanup.
- **047.6 How stacks work.** The sim keeps the inventory's counts by kind; the grid shows each kind as stacks (full ones, then the remainder), in the order kinds were first carried. A kind's stacks always merge, so there's no splitting one kind into two part-stacks inside the inventory, and a used-up kind leaves the grid (the rest close up). Sort orders kinds by 031's groups (Raw, Parts, Ammo, Gear, Cores), then by item. Proposal: keep.
- **047.7 Crates.** E on a crate now opens its screen (its stacks over the grid, the same clicks) instead of emptying it at once; Ctrl+click takes a whole stack. Stacks can go into a crate too, up to its cap of 99. Proposal: keep, as Factorio's chests. The alternative is E emptying it as before, with the screen only through some other key.
- **047.8 Both buttons at once.** Left and right click are independent: holding both fires the volley and the carried item together, and the volley no longer delays a carried shot (before 047 they shared one button and the first carried round waited out the last volley's pace). A punch still waits out a carried shot's interval. Proposal: keep.
- **047.9 Teaching right click.** Nothing on screen said right click uses the carried bar (the controls stay off the menus), and a new player fights the first Husks with crafted arrows before the tube attunes, when left click only punched. Answered by Shaun, 2026-10-20: left fires carried until attuned; a one-time "Right click: carried items" hint at attune. Built: before the tube attunes (no intake yet), left click uses the carried bar's selected item as right click does (a round fired, a bomb or landmine thrown); with nothing usable selected and carried it punches, and holding both buttons uses the item once per interval. Once attuned, left click is the volley (or the punch) and right click the carried item, as before. The rule is the sim's `nextPress` (a new `carried` press), so the intake bar shows the selected carried round and its count before attuning, not "Melee". As the attune (019) ends, the banner (032's, shared with 033's schematics) shows one line, "Right click: carried items" (src/data/hints.ts; the key is the bound "Use carried item" key's label). The sim raises it as the attune's pulse runs out, which happens once per save (the pulse is saved), so no flag was needed; the new event list still changes the save's shape, so SAVE_VERSION is 5 with no migration (Shaun's rule) and the fixture is regenerated. Tests: tests/sim/hotbars.test.ts and link.test.ts; e2e tests/e2e/carriedBeforeAttune.spec.ts (a new game's first Husk fight fires arrows on left click; the hint shows once as the attune ends).
- **047.10 Tagged rounds in the crafting menu.** They show once the shrine is claimed and their family's own ammo is known (as the bench's rows did), one row per tag on the plain round (Frost arrow, Frost bomb, Cluster bomb, Frost, Homing and Split ley bolts, Frost landmine). Rounds with two tags (Frost cluster bomb) still come only from machines. Crafting one counts carried rounds plus the entrances and takes carried ones first, as before. Proposal: keep.
- **047.11 What each tab shows.** A tab shows once its own ammo can be made (Landmines after ley-iron is found, 038), and opens on Arrows. Proposal: keep.
- **047.12 Schematics in the grid.** They share one slot, as they shared the 031 row ("Unknown schematic" while every one is unbanked, 033), and that slot can't be clicked into a hopper or crate. Proposal: keep.
- **047.13 The 031 panel's "home N".** The grid doesn't show what's in the stash (the stash menu still lists it). The identified gear (worn pieces with their armor, and the spares) is a footer line under the grid. Proposal: keep.
- **047.14 The carried bar.** A kind sits on the bar once: dragging it onto another slot swaps the two. Only rounds (bombs and landmines included) go on the bar. There's no way to take a kind off except dropping another on its slot. With the selected slot empty, right click does nothing (no fallback to another slot). Proposal: keep.
- **047.15 A hopper's own row.** It shows one row of 8; a hopper filled by hand past 8 stacks shows the rest folded into the last slot. Proposal: keep.
- **047.16 Key bindings.** Settings' "Ammo slot 1–4" became "Carried slot 1–5", and right click is the rebindable "Use carried item". A player's stored rebinding of the old ammo keys goes back to the defaults. Right click can only belong to Use. Proposal: keep.
- **047.17 Overpressure.** Its ramp counts while left or right click is held and firing; its HUD rate reads the arrow's (the ramp is the same for every round). Proposal: keep.
- **047.18 Two goals renamed.** "Apply a frost rune to arrows at the bench" now reads "Craft frost arrows (C)", and "Try a ley stage at the bench: homing or split" now reads "Craft homing or split ley bolts (C)". Tagged rounds are crafted in C and never called stages. Proposal: keep (wording is Shaun's to edit).

### Results
- `npm run check`: passes (1617 unit tests).
- `npx playwright test` (full run, once): 128 passed, 1 failed, 117 skipped (review shots). The failure was `sorter.spec.ts`'s "a press that starts on the hotbar never fires": it still pressed left click to fire carried arrows. Moved to right click; that file re-run passes (2 passed).
- New e2e: `hotbars.spec.ts` (a key picks the landmines' slot and right click throws one while left click punches; the volley on left click and a carried landmine on right click, never crossing; a grid stack dragged onto a carried slot, Sort, and the wheel scrolling the grid). Crafting frost arrows from the Arrows tab is in `ammoStages.spec.ts`; filling a hopper from the grid is in `hopperAmounts.spec.ts`.
- Review shots (docs/review/047): `01-both-hotbars.png`, `02-grid-inventory.png` (some of it at risk), `03-hopper-screen.png`, and the four crafting tabs `04-craft-arrow.png` to `07-craft-landmine.png`.
- Older shots that 047 changes were retaken. The carried bar and the intake bar are in nearly every in-world shot, and the grid, the hopper screen and the crafting tabs replaced 031's panel, 022's picker and 026/038's columns: 021/01, 03a, 03b; 022/01 (renamed 01-hopper-screen); 025/01–04; 026/01–04; 029/01, 03, 05, 06; 031/01–09; 036/01, 03–07; 038/01–06; 039/01–03, 05–08; 040/01–07; 045/01–07. After review, the 025, 029 and 038 shots were retaken again: their specs now wait out the door's fade and the schematic banners (`quietScreen`), and the 038 field no longer kills the Bulwark, whose first kill brought up the end card over the mines. 038/01–02 still show the level-up line from those kills, as they did before 047. The three bench Stages shots were removed with the panel: 029/02, 036/02 and 039/04. Contact sheets don't change with 047 and were restored.
- `npm run measure`: unchanged from 046. Ammo line and still 5/5 met. Ring 1 2.2–2.9 s, ring 2 2.8–4.2 s and ring 3 10.2–17.6 s, all met. The Bulwark's decent build is still 13/20 with 3 KOs (MISSED, as in 043.2/045/046), and the naive bot is KO'd 5/5. The bots fire through the intake's entrances (left click), so the split doesn't reach them.

