# 005: Hand crafting
status: approved

## Goal
The player harvests wood, stone, fiber and ley crystal from nodes in the ruin hall, opens a crafting menu, and hand-crafts the parts of each beginner ammo chain and then the ammo itself: arrows, bombs and ley bolts. Keys 1–3 choose which ammo the tube's one slot loads and fires. Bombs arc to the cursor and burst into fire; ley bolts fly slower and pierce.

## Design references
- docs/design.md: "Pillars" 2 (manual first, then automated), "Combat" (the tube; hotbar = ammo lines, one slot to start; most ammo fires at the cursor; damage types: fire burns over time, physical deals big direct hits), "The Foundry" (ammo is built physically: an arrow takes three chains into an assembler; "Unlocks": crafting something by hand once unlocks the machine that makes it; monsters drop raw materials enough to hand-craft ammo in a pinch), "Opening" beats 2 and 4
- docs/prototype.md: "Player flow" beats 2 and 5, "Content list" (beginner ammo table: arrows, bombs, ley bolts and their chains; raw materials incl. husk resin; "Crafting menu for hand-crafting, instant in the prototype")
- docs/process.md: "Prototype backlog" item 005, "Art pipeline"
- docs/art.md: style, scale and palette
- Interview decisions (Shaun, 2026-10-18): harvest nodes with E; nodes give a few harvests then regrow; craft parts then ammo; the menu pauses the world; keys 1–3 pick the slot's ammo and switching returns loaded rounds; bombs burst and burn but don't spread; ley bolts are physical and pierce without limit; player ammo never hurts the player; all recipes available from the start; the sim records which items have been hand-crafted; the start kit stays 30 arrows; C toggles the menu and clicking crafts; the grinder makes one part, ley shards, used by both bombs and ley bolts; Claude proposes the tuning below for Shaun to adjust.

## Acceptance criteria

**Items (data)**
- [ ] New items with icons: `ley-crystal` (raw); parts `shaft`, `arrowhead`, `rope`, `casing`, `fuse`, `ley-shard`; ammo `bomb`, `ley-bolt`. Existing: `arrow`, `wood`, `stone`, `fiber`, `husk-resin`.
- [ ] Each item has a kind: `raw`, `part` or `ammo`.

**Gathering nodes (sim)**
- [ ] Node types are data: `tree` (gives wood), `rubble` (stone), `reeds` (fiber), `ley-vein` (ley crystal). Each has uses 3, harvest time 30 ticks, 1 item per harvest, regrow 1800 ticks (30 s), a feet box and sprites for full and depleted.
- [ ] Node placements are part of the room data. `ruin-hall` gets 3 trees, 3 rubble, 3 reeds and 2 ley veins, in the spawn half of the room, away from the Husk pack (tiles chosen in /plan). The 001 ley crystal decoration stays as decoration.
- [ ] Nodes are solid to the player and Husks (feet-box collision, sliding), full or depleted. Projectiles pass over them; only walls and ruin blocks stop projectiles, as before.
- [ ] **Harvest:** pressing E (an edge, like R) with the player's feet box within 12 px of a non-depleted node's feet box starts a harvest of the nearest such node. Nothing happens if none is in reach.
- [ ] A harvest completes after the node's harvest time, unless it's cancelled by moving, rolling, firing, loading, switching ammo, opening the menu or taking a hit. A cancelled harvest loses its progress and uses nothing.
- [ ] Starting a harvest stops loading, as firing does.
- [ ] On completion the node loses one use and its item drops as a ground item at a seeded scatter spot next to the node (004's drop rules), picked up by walking over it. A pickup event is recorded as in 004.
- [ ] At 0 uses the node is depleted: it can't be harvested and its regrow timer starts. When the timer ends it's back to full uses. The timer only runs while the sim ticks (play time only).
- [ ] Husks ignore nodes apart from colliding with them.

**Crafting (sim)**
- [ ] Recipes are data: id, inputs (item id → count), output item id and count. Every recipe is available from the start. Starting recipes (tuning):

  | Recipe | Inputs | Output |
  | --- | --- | --- |
  | `shaft` | 1 wood | 2 shaft |
  | `arrowhead` | 1 stone | 2 arrowhead |
  | `rope` | 1 fiber | 2 rope |
  | `arrow` | 1 shaft, 1 arrowhead, 1 rope | 4 arrow |
  | `casing` | 1 stone | 1 casing |
  | `fuse` | 1 husk resin | 1 fuse |
  | `ley-shard` | 1 ley crystal | 2 ley-shard |
  | `bomb` | 1 casing, 1 fuse, 1 ley-shard | 2 bomb |
  | `ley-bolt` | 1 ley-shard | 2 ley-bolt |

- [ ] Crafting a recipe takes its inputs from the inventory and adds its output, instantly. If any input is short it does nothing and records a craft-failed event; otherwise a craft event (recipe id) is recorded.
- [ ] Crafting is a sim action, deterministic and replayable, drivable through `window.__GAME__` (the exact route, a command field or a call, is chosen in /plan).
- [ ] The sim keeps the set of item ids the player has hand-crafted at least once. Nothing uses it yet (006 unlocks machines from it). It survives the KO reset.
- [ ] There's no inventory cap.

**Ammo select and loading (sim)**
- [ ] The one hotbar slot has a selected ammo: `arrow`, `bomb` or `ley-bolt`, set by a select command (keys 1, 2, 3). It starts as `arrow`.
- [ ] Selecting a different ammo moves the tube's loaded rounds back into the inventory as that ammo's item, stops loading (partial progress lost) and sets the selection. Selecting the current ammo does nothing.
- [ ] Loading (R), capacity, dry fire and the roll and hit rules from 003 and 004 work the same for every ammo, using the selected ammo's item.
- [ ] Each ammo has its own fire interval (data): arrow 15 ticks (unchanged), ley bolt 20, bomb 40.

**Ley bolts (sim)**
- [ ] A ley bolt flies straight at the cursor at 300 px/s for up to 320 px, physical damage 14, and stops at walls and ruin blocks like an arrow.
- [ ] It pierces: it hits every Husk whose hurtbox contains its ground point, each Husk at most once per bolt, and keeps flying. Each hit applies the arrow's knockback and hit flash rules (004) and aggros the Husk.

**Bombs (sim)**
- [ ] A bomb is thrown from the muzzle toward the cursor and lands at the cursor point, or at 192 px along the aim if the cursor is farther. It flies at 200 px/s along the ground (flight ticks = distance / speed, at least 1) and ignores walls, ruin blocks, nodes and Husks while in flight. Its height follows an arc for render, peaking at 32 px (reported in `getState()`).
- [ ] On landing it bursts: every Husk whose feet are within 32 px of the landing point takes 15 fire damage, gets a hit flash (no knockback) and aggros. A burst event (position, radius) is recorded.
- [ ] Each Husk hit by a burst starts burning: 3 fire damage every 30 ticks, 4 times (the first 30 ticks after the burst). A new burst on a burning Husk restarts the burn; burns never stack. Burns don't spread.
- [ ] A Husk killed by a burst or a burn dies and drops as in 004.
- [ ] Bombs and their bursts never hurt the player.

**KO reset and determinism**
- [ ] The KO reset also puts every node back to full uses with no regrow timer, clears bombs, bolts and burns, and sets the selected ammo back to `arrow`. The crafted-items set is kept.
- [ ] The same seed and command sequence (including crafts and ammo selects) give the same harvests, crafts, shots, bursts, burns and drops, tick for tick.
- [ ] `getState()` adds: the nodes (id, type, position, uses left, regrow ticks left); the current harvest (node id, progress) or none; the selected ammo; bombs in flight (id, position, target, height); ley bolts in flight (id, position, Husks already hit); each Husk's burn (ticks left); the crafted-items set; and this tick's harvest, craft, craft-failed, burst and select events.

**Crafting menu (render)**
- [ ] C toggles the crafting menu; Esc also closes it. While it's open the sim runs no ticks, so the world is paused, and game input (move, fire, load, roll, harvest, 1–3) is ignored.
- [ ] The menu lists every recipe grouped by ammo (arrows, bombs, ley bolts), each row showing its inputs with the owned and needed counts and its output with the owned count. Rows the player can't afford are greyed out.
- [ ] Clicking an affordable row crafts it once, and the counts update straight away. Clicking a greyed row does nothing.
- [ ] The menu is drawn from palette colours and sprites, fixed on screen above the HUD, and fits the theme rule (rune-carved stone, ley cyan accents).

**World and HUD (render)**
- [ ] Nodes are drawn with full and depleted sprites, depth-sorted by their feet. While harvesting, a small progress bar shows over the node. When a node regrows it switches back to its full sprite.
- [ ] The player shows the idle pose while harvesting (no new player animation).
- [ ] Ley bolts are drawn as their projectile over a ground shadow, like arrows.
- [ ] Bombs are drawn at their arc height over a ground shadow that stays on the ground path.
- [ ] A burst plays a fire burst effect at its real radius. A burning Husk shows a small flame effect while it burns.
- [ ] The hotbar slot shows the selected ammo's icon, loaded and carried counts. Beside it, a small strip shows the three ammo with their key number and carried count, the selected one highlighted.
- [ ] The HUD material column lists raw materials and parts the player holds (count above 0), not ammo.

**Art**
- [ ] New sprites following docs/art.md: icons for ley crystal and the six parts; bomb and ley bolt icons; tree, rubble, reeds and ley vein nodes, each full and depleted; bomb and ley bolt projectiles with shadows; the fire burst and burn flame effects; the crafting menu panel and row frames; the ammo strip. All fit the theme rule.
- [ ] All asset keys are registered in `src/data/assets.ts`.
- [ ] Shaun approves every new sprite by eye at 4×.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- Items (`src/data/items.ts`): a `kind` on every item (`raw`, `part`, `ammo`); new `ley-crystal`, `shaft`, `arrowhead`, `rope`, `casing`, `fuse`, `ley-shard`, `bomb`, `ley-bolt`.
- Recipes (new, e.g. `src/data/recipes.ts`): the nine recipes above, plus the menu's grouping by ammo.
- Nodes (new, e.g. `src/data/nodes.ts`): `tree`, `rubble`, `reeds`, `ley-vein` with item, uses 3, harvest 30 ticks, yield 1, regrow 1800 ticks, feet box, sprites; harvest reach 12 px.
- Rooms (`src/data/rooms.ts`): a `nodes` list on `Room` (node id, tile); `ruin-hall` gets 3 trees, 3 rubble, 3 reeds, 2 ley veins.
- Ammo (`src/data/ammo.ts`): a fire interval on every ammo (arrow 15); `ley-bolt` (300 px/s, 320 px, 14 physical, pierce, interval 20); `bomb` (200 px/s, max range 192 px, arc peak 32 px, burst radius 32 px, burst 15 fire, burn 3 fire every 30 ticks ×4, interval 40). `DamageType` gains `fire`.
- Tube (`src/data/tube.ts`): `SLOT_AMMO` becomes the starting selection; the selectable ammo list in key order (`arrow`, `bomb`, `ley-bolt`). `FIRE_TICKS` moves into the ammo data.
- `src/data/assets.ts`: keys and layouts for the new sprites, the menu and the ammo strip.

## Out of scope
- Machines, placement and the unlocks themselves (006). 005 only records what was crafted.
- The tube link and reservoir (007), spreads (008), more hotbar slots.
- Recipe gating and the tutorial order (012). All recipes are open now.
- Fire spreading, other damage types and their behaviors, burn stacking.
- Self damage, friendly fire, bombs hitting nodes or walls.
- Crafting time, batch crafting, an inventory cap, an inventory screen beyond the menu.
- Husk resin from anywhere but Husks; new enemies (009).
- Saving the crafted set, or anything, between sessions.
- Sound, screen shake, damage numbers.

## Test plan
- **Vitest (`tests/sim`):**
  - Harvest: E in reach starts on the nearest node; out of reach does nothing; completes at 30 ticks and drops one item as a ground item; each cancel cause (move, roll, fire, load, select, hit) loses progress; starting a harvest stops loading.
  - Nodes: 3 uses then depleted; depleted can't be harvested; regrows after 1800 ticks; solid to the player and Husks; projectiles pass over.
  - Crafting: each recipe takes inputs and gives outputs; short inputs do nothing and record craft-failed; the crafted set grows and survives a KO.
  - Ammo select: switching returns loaded rounds to the inventory and stops loading; same ammo is a no-op; loading uses the selected item; per-ammo fire intervals.
  - Ley bolts: speed, range, wall stop; pierce hits every Husk in line once each; knockback, flash and aggro.
  - Bombs: lands at the cursor, clamped to 192 px; flight ticks; flies over ruin blocks; burst hits Husks within 32 px and not outside; 15 damage, no knockback, aggro; burn ticks 3 ×4; a re-burst restarts the burn; burn kills drop items; the player is never hurt.
  - KO: nodes, bombs, bolts, burns and selection reset; crafted set kept.
  - Determinism: a session of harvests, crafts, selects and shots replays tick for tick.
- **Vitest (data test):** every recipe input and output, node item and room node reference exists and is kebab-case; every ammo's item is an `ammo` item; every new sprite key is in the atlas.
- **Playwright (`tests/e2e/crafting.spec.ts`):** via `__GAME__`, harvest each node type and pick up the items; craft the full arrow, bomb and ley bolt chains; open the menu, check the sim doesn't advance, click a recipe and check the counts; select each ammo with 1–3, load and fire it; kill a Husk with a bomb burn and with a piercing bolt through two Husks; no console errors.
- **Screenshots (qa agent):** each node full and depleted; the harvest progress bar; the crafting menu with affordable and greyed rows; the hotbar and ammo strip with each selection; a bomb mid-arc with its shadow; a burst; a burning Husk; a ley bolt passing through a Husk; the material column showing parts.
- **Shaun's review:** every new sprite at 4×, then the Pages preview playtest (is gathering and crafting quick enough? do bombs and ley bolts feel different from arrows?).

## Open questions
None. Every number above is a starting value for Shaun to adjust when approving.
