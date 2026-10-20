# 047 plan: Inventory and hotbars

Spec: docs/specs/047-inventory-hotbars.md (approved on draft; the open questions' proposals are built).

## Approach
The sim keeps the inventory's counts by item (every system that spends or gives items stays as it is) and adds what the
grid and the bars need as plain state: the grid's order of kinds (`bag`), and the carried bar (`hotbar`: five item ids
or empty, and the selected slot). Stacks are derived from counts and the stack sizes in `src/data/items.ts`, so a kind's
stacks are always full but the last. Left click (`fire`) is the intake's volley or the punch; right click (`use`) uses the
carried bar's selected item. Hopper and crate screens move one, half or a whole stack, both ways.

Saves: SAVE_VERSION 3 → 4 with no migration (Shaun's rule, 2026-10-20): an older save reads as too old through 042's
path (no crash, Continue unavailable, a New game starts fresh).

## Slices, tests first
1. **Crafting tabs, tagged rounds as recipes.**
   - Tests: `CRAFT_TABS` lists Arrows, Bombs, Ley, Landmines, each with its whole chain and its tagged rounds, a shared
     part in each family using it; every id is a recipe or a tagged-round recipe. `craft` makes a tagged round anywhere,
     counting carried rounds plus the entrances and pulling from the entrances after the carried; it refuses an unknown
     row (shrine not claimed). The bench has no Stages panel, and no player-visible text says "stage".
   - Code: `src/data/craftTabs.ts` (replaces `craftColumns.ts`), `src/sim/crafting.ts` (tagged rows), remove the
     `applyStage` command and `StagePanel`; `CraftMenuView` gets tabs; objectives' bench wording.
2. **Two hotbars.**
   - Tests: left click never fires a carried round; dry intake punches; right click uses the selected item (arrow,
     bomb, landmine) and never the volley; a newly carried usable kind fills the first empty slot; `assignSlot` puts a
     stack on a slot (swapping a kind already on the bar); non-usable kinds refused; the bar keeps its kinds through a KO.
   - Code: `src/sim/hotbar.ts`, `src/sim/tube.ts`, `src/sim/input.ts`; `CarriedBarView`, `TubeSlotView` (intake bar),
     controls (keys 1–5, right click as the bindable `use`), `src/data/settings.ts`.
3. **Grid inventory.**
   - Tests: stack sizes from data (047.1); `gridStacks` splits counts into stacks in bag order, the safe items first;
     sort orders by the 031 groups then item order; the grid has 40 visible slots (8×5) and scrolls past them.
   - Code: `src/sim/bag.ts`, `src/data/hudPanels.ts` (grid layout), `InventoryGrid`/`InventoryScreen` views; drag a
     grid stack onto a carried slot.
4. **Hopper and crate screens.**
   - Tests: deposit and withdraw move one, half or the clicked stack; a hopper's screen lists only the hopper's own
     stacks; crates take and give by kind up to their cap.
   - Code: `src/sim/foundryUse.ts`; the screen (container slots on top, the grid underneath); E on a crate opens it.
5. **Saves.** SAVE_VERSION 4, the shape fixture regenerated, a version 3 save reads as too old.
6. **Verify.** `npm run check`; touched e2e while building; the full Playwright run once; review shots in
   docs/review/047; the older HUD, crafting and hopper shot specs; `npm run measure` once.
