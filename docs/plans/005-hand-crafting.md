# Plan: 005 Hand crafting (docs/specs/005-hand-crafting.md, approved)

Approved by Shaun, 2026-10-18.

## Context
Spec 005 adds gathering and hand crafting. The player harvests four kinds of node with E, crafts parts and then ammo from a pausing C menu, and switches the one slot between arrows, bombs and ley bolts with 1–3. Bombs lob, burst and burn. Ley bolts pierce. This is a vertical slice: sim, data, render and art land together on `claude/005-hand-crafting`, which already holds the approved spec.

## Tests first (written failing before code)

**`tests/sim/harvest.test.ts`** (new; uses `openRoom()` plus a new `simIn(room)` helper that builds a `SimState` on a test room with nodes)
- E with the feet box within 12 px of a node's box starts a harvest. With two nodes in reach, it picks the nearest. Out of reach, nothing happens. A depleted node can't be harvested.
- Progress counts the E tick as 1. On tick 30 the node loses a use and one item lands as a ground item outside every node box. Picking it up records a pickup event.
- Each of these cancels a harvest, loses its progress and uses nothing: a move input, a roll, fire, load (R), an ammo select, a swipe hit, and `cancelHarvest()` (opening the menu).
- Starting a harvest stops loading. Loaded rounds stay, and partial progress is lost.
- After 3 harvests the node is depleted. It regrows to 3 uses after exactly 1800 ticks, not 1799.
- Nodes, full or depleted, block the player and Husks: feet-box collision, sliding along them. Arrows, bolts and bombs pass over nodes.

**`tests/sim/crafting.test.ts`** (new)
- Every recipe in `RECIPES` takes its inputs and adds its output. Spot checks: `shaft` 1 wood → 2, `arrow` → 4, `bomb` → 2.
- With any input short: no change, a craft-failed event, and the crafted set unchanged.
- A successful craft records a craft event and adds the output to `crafted` once (it stays sorted and unique).
- `crafted` survives a KO reset.

**`tests/sim/tube.test.ts`** (extend)
- Selecting another ammo returns the loaded rounds to the inventory as that ammo's item, stops loading and records a select event. Selecting the current ammo is a no-op with no event.
- Loading draws the selected ammo's item.
- Fire intervals come from each ammo's `fireTicks`: 15 for arrows, 20 for ley bolts, 40 for bombs. The existing tests switch from `FIRE_TICKS` to `AMMO.arrow.fireTicks`.

**`tests/sim/arrows.test.ts` / `combat.test.ts`** (extend)
- A ley bolt flies at 300 px/s, stops after 320 px, and stops at walls and ruin blocks.
- A ley bolt passes through two Husks in line, hitting each once for 14 with knockback, flash and aggro. It never hits the same Husk twice, even when that Husk is knocked back along its flight.
- Arrows are unchanged: they still don't pierce.

**`tests/sim/bombs.test.ts`** (new)
- A bomb lands on the cursor, or 192 px along the aim when the cursor is farther.
- Flight takes ceil(distance / (200/60)) ticks, at least 1.
- It flies over a ruin block and over Husks. Its height peaks at 32 mid-flight and is 0 at landing.
- The burst hits Husks with feet ≤32 px from the landing point, not 32.1. It deals 15, sets the flash, applies no knockback, aggros them and records a burst event.
- The burn deals 3 at 30, 60, 90 and 120 ticks after the burst, then stops. A second burst restarts it, so there's no stacking. Burn damage can kill a Husk, which then drops loot.
- The player standing in a burst takes no damage.

**`tests/sim/health.test.ts`** (extend, KO): nodes are back at full with no regrow, bombs, arrows and bolts are cleared, the selection is back to `arrow`, and `crafted` is kept.

**`tests/sim/sim.test.ts`** (extend)
- A scripted session replays tick for tick under the same seed. It harvests, crafts between ticks, selects each ammo, throws a bomb at the pack, pierces with a bolt and gets KO'd.
- `summarize()` has the new fields.

**`tests/data/data.test.ts` / `rooms.test.ts`** (extend)
- Every item has a kind.
- Recipe inputs and outputs, node items and room node ids exist and are kebab-case.
- Every `AMMO` entry's item is an `ammo` item.
- `SLOT_AMMOS` covers `arrow`, `bomb` and `ley-bolt` in key order.
- Every recipe appears in exactly one menu group.
- `ruin-hall` nodes sit on floor tiles, don't overlap spawn, other nodes or ruin blocks, and lie in the spawn half, outside the Husks' start aggro.
- Every new sprite and animation frame is in the atlas.

**`tests/e2e/crafting.spec.ts`** (new; each test fails on console errors)
- **Gathering:** via `__GAME__`, walk to each node type, press E and wait 30 ticks, then pick up the item. The inventory gains wood, stone, fiber and ley crystal.
- **Crafting:** craft the full arrow, bomb and ley bolt chains with `__GAME__.craft()`, starting from a gathered inventory plus Husk resin from a kill.
- **Menu (real time, no `step()`):**
  - Press C, wait 500 ms, and the tick is unchanged.
  - Click the `shaft` row at its layout position (from `CRAFT_MENU_LAYOUT` and the canvas bounds) and the counts change.
  - Press Esc and ticks advance again.
- **Ammo:** select 2, load and fire a bomb at a Husk until it's burning, and it dies from burn ticks. Select 3 and a bolt hits two lined-up Husks.

## Sim (src/sim)

New tick order in `stepSim`: clear events → player (moves, blocked by nodes too) → enemies → nodes regrow → **harvest** (start, advance or cancel from the command) → arrows and bolts (with pierce) → **bombs** (fly, burst) → **burns** → `removeDead` → **tube** (select, then fire, then load) → pickups → KO.

Between ticks, render and the test hook call `craft(state, recipeId)` and `cancelHarvest(state)`. Both are deterministic sim actions; their events join that tick's event list.

| File | Change |
| --- | --- |
| `input.ts` | `Command` gains `interact: boolean` (E edge) and `selectAmmo: string \| null` (edge). |
| `collision.ts` | `moveBox` and `boxHitsSolid` take optional `obstacles: readonly Rect[]` and stop flush against them, as they do for tiles. Callers without obstacles are unchanged. |
| `nodes.ts` (new) | `NodeState` (id, nodeId, x, y, uses, regrow), `createNodes(room)`, `nodeRects(state)`, `stepNodes` (regrow). |
| `harvest.ts` (new) | `HarvestState \| null` on the sim. `stepHarvest(state, cmd)`, `cancelHarvest(state)`, and the drop at a scatter point centred on the node-box point nearest the player. |
| `drops.ts` | `scatterPoint` also rejects points inside obstacle rects, so drops never land inside a node. |
| `crafting.ts` (new) | `craft(state, recipeId)` → inputs out, output in, `crafted` updated, event recorded. |
| `movement.ts`, `huskAi.ts`, `enemies.ts` | Pass `nodeRects` to `moveBox` (player, Husk movement, `separate`/`shove`). |
| `arrows.ts` | `ArrowState` gains `hitIds: number[]`. Range comes from the straight-ammo def. |
| `combat.ts` | `arrowHits` with pierce hits every Husk in the hurtbox not yet in `hitIds` and returns "not spent". Non-pierce behaviour is unchanged. |
| `bombs.ts` (new) | `BombState` (id, from, target, x, y, tick, flightTicks, height), `throwBomb`, `stepBombs` → burst → `damageEnemy(..., knock: false)` and burn start. |
| `burn.ts` (new) | `stepBurns`: `EnemyState.burnTicks` counts down from 120 and deals 3 on every 30th tick. |
| `enemies.ts` | `burnTicks` field. `damageEnemy` gains an optional `knock = true`. |
| `health.ts` | `damagePlayer` also calls `cancelHarvest`. |
| `tube.ts` | `TubeState.ammoId` (starts `STARTING_AMMO`). `selectAmmo` (unload to the inventory, `stopLoading`, event). `slotItem(state)`. Fire branches on the ammo kind (`straight` → `createArrow`, `lob` → `throwBomb`) and uses its `fireTicks`. |
| `events.ts` | Adds `harvests`, `crafts`, `craftFails`, `bursts` and `selects`. |
| `state.ts` | `SimState` gains `nodes`, `harvest`, `bombs`, `nextBombId` and `crafted: string[]`. `resetRoom` rebuilds nodes, clears bombs and the harvest, and recreates the tube, which resets the selection. It never touches `crafted`. |
| `summary.ts` (+ `summaryParts.ts` if over ~300 lines) | Adds nodes, harvest, `tube.ammo` from state, bombs, an `ammoId` and `hitIds` on each arrow entry (bolts are listed there), enemy `burnTicks`, `crafted`, and the new events. |

## Data (src/data)
- **`items.ts`:** `kind: 'raw' | 'part' | 'ammo'` on every item. New items: `ley-crystal`, `shaft`, `arrowhead`, `rope`, `casing`, `fuse`, `ley-shard`, `bomb`, `ley-bolt`.
- **`recipes.ts` (new):** `RecipeDef { id, inputs: Record<itemId, n>, output: { itemId, count } }` with the spec's 9 recipes, and `CRAFT_GROUPS` (arrow, bomb and ley-bolt groups in menu order).
- **`nodes.ts` (new):** `NodeDef` (`itemId`, uses 3, `harvestTicks` 30, yield 1, `regrowTicks` 1800, feet box, full and depleted sprites) for `tree`, `rubble`, `reeds` and `ley-vein`. `HARVEST_REACH = 12`.
- **`rooms.ts`:** `Room.nodes?: { nodeId, tx, ty }[]`. `ruin-hall` gets 3 trees, 3 rubble, 3 reeds and 2 ley veins in the lower (spawn) half, ley veins near the crystal decoration. The exact tiles are picked from floor tiles and checked by the data test.
- **`ammo.ts`:** a discriminated `AmmoDef`.
  - Common fields: `id`, `itemId`, `fireTicks`, `damageType`.
  - `straight`: speed, range, damage, pierce, sprite and shadow. `arrow` (unchanged) and `ley-bolt` (300, 320, 14, pierce).
  - `lob`: speed 200, `maxRange` 192, `arcPeak` 32, `burstRadius` 32, `burstDamage` 15, `burn` { damage 3, every 30, times 4 }, sprite and shadow. That's `bomb`.
  - `DamageType` gains `'fire'`.
- **`tube.ts`:** `SLOT_AMMO` becomes `STARTING_AMMO`, and `SLOT_AMMOS = ['arrow', 'bomb', 'ley-bolt']` gives the key order. `FIRE_TICKS` is removed.
- **`assets.ts`** (stays import-free):
  - New `SPRITES` keys.
  - Node sprite keys.
  - `FIRE_BURST` and `BURN_FLAME` anims.
  - `CRAFT_MENU_LAYOUT` (panel position, row height, column offsets, grey alpha).
  - `AMMO_STRIP_LAYOUT`.
  - `HARVEST_BAR`.
  - `DEPTHS.menu` above the HUD.

## Render (src/render)
- **`controls.ts`:** latches E, 1, 2, 3, C and Esc like Space and R. `nextCommand` fills `interact` and `selectAmmo` (key → `SLOT_AMMOS[i]`). `takeMenuToggle()` and `takeMenuClose()` hand C and Esc to the scene. While the menu is open, `discardPending()` drops the game presses.
- **`GameScene.ts`:**
  - `menuOpen` state. On open it calls `cancelHarvest(sim)`, and while open it skips `advanceClock` entirely, so there's no catch-up on close.
  - `craft(recipeId)` calls the sim's `craft` and queues the events, used by both the menu and the test hook.
  - New views are wired in.
- **`testHook.ts`:** `step` treats `interact` and `selectAmmo` as first-tick edges, like `dodge` and `load`. New `craft(recipeId): SimSummary`. No other test-only hooks.
- **`NodeView.ts` (new):** sprites pooled by node id, full or depleted frame, depth by feet. A harvest progress bar (Graphics, palette colour) over the harvested node.
- **`BombView.ts` (new):** the bomb sprite at `y - height` and its shadow on the ground point, depth by the ground y.
- **`ArrowView.ts`:** already draws `ammo.sprite`, so bolts work once the data exists. Narrowed to straight ammo.
- **`EffectsView.ts`:** a burst event plays `FIRE_BURST` sized to its radius.
- **`EnemyView.ts`:** a looping `BURN_FLAME` sprite on a Husk while `burnTicks > 0`.
- **`glyphLine.ts` (new):** `GlyphLine` moves out of `HudView.ts` so the menu can share it.
- **`HudView.ts`:**
  - The slot icon follows `tube.ammoId`, and the carried count uses its item.
  - The material column filters to `kind !== 'ammo'`.
- **`AmmoStripView.ts` (new):** three cells with icon, key digit and carried count. The selected cell is highlighted.
- **`CraftMenuView.ts` (new):** the panel and rows from `CRAFT_GROUPS`. Each row shows the output icon and owned count, then inputs as icon plus `have/need`. Unaffordable rows show at grey alpha. A row is interactive (`setInteractive`, pointerdown) and calls `scene.craft`. Counts refresh every frame while open.
- **Player:** keeps the idle pose while harvesting, since the existing idle logic applies when not moving.

## Art (`/sprite` flow, each approved by Shaun at 4×)
- **Item icons (16×16):** `item-ley-crystal`, `item-shaft`, `item-arrowhead`, `item-rope`, `item-casing`, `item-fuse`, `item-ley-shard`, `icon-bomb`, `icon-ley-bolt`.
- **Nodes (32 wide), each full and depleted:**
  - `node-tree`: a gnarled tree grown through ruin stone; depleted, a stump.
  - `node-rubble`: a rune-carved rubble pile; depleted, flattened.
  - `node-reeds`: a reed clump; depleted, cut stubble.
  - `node-ley-vein`: a cyan crystal cluster in stone; depleted, dim and empty.
- **Projectiles:** `bomb` and `bomb-shadow` (a round rune-etched casing with a fuse), `ley-bolt` and `ley-bolt-shadow` (a cyan shard bolt).
- **Effects:** `fire-burst` (4 frames, 64×64, ember and gold), `burn-flame` (3-frame loop, 12×12).
- **UI:**
  - `craft-panel` (a rune-carved stone panel) and `craft-row` / `craft-row-hover`.
  - `craft-arrow` (the "makes" mark between inputs and output).
  - `hud-ammo-cell` and `hud-ammo-select`.

## Build order (small commits)
1. Data (items kinds, recipes, nodes, ammo union, tube) plus the failing sim and data tests.
2. Collision obstacles and nodes (solid, regrow).
3. Harvest and drop scatter.
4. Crafting action and the crafted set.
5. Ammo select and the tube refactor.
6. Ley bolt pierce.
7. Bombs, bursts and burns.
8. KO, summary and test-hook additions.
9. Art via `/sprite` (approved), then `npm run art`.
10. Render views (nodes, bombs, effects, HUD strip).
11. Crafting menu and pause.
12. E2E tests.
13. `docs/decisions.md` entries: craft as a between-tick sim action, the obstacle-rect collision, bolts kept in `arrows`.

## Verification
- `npm run check` passes: typecheck, lint, and unit and data tests, including the stale-atlas guard.
- `npm run test:e2e` passes: `crafting.spec.ts` plus the existing enemies, firing, movement and smoke specs.
- The qa agent takes the spec's screenshots: nodes full and depleted, the harvest bar, the menu with affordable and greyed rows, the hotbar and strip for each selection, a bomb mid-arc, a burst, a burning Husk, a bolt passing through a Husk, and the material column with parts.
- `/review` runs the reviewer agent against the spec.
- Shaun playtests the Pages preview at `/branch/claude/005-hand-crafting/`.
