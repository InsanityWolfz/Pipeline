# Plan: 006 Foundry building (docs/specs/006-foundry-building.md, approved)

Approved by Shaun, 2026-10-18.

## Context
Spec 006 adds the foundry. It's a second room behind a doorway, where the player builds lines on the tile grid in build mode. The pieces are hoppers, conduits, the nine machines and crates. Raw materials or parts go in a hopper, and machines run the 005 recipes and hand items on. Ammo collects in a crate that the player empties with E. Shaun approved the spec in chat on 2026-10-18.

This is the first time the sim has more than one room. It's a vertical slice: sim, data, render and art land together on `claude/sweet-planck-6lb10l`, which already holds the facing fix and the approved spec.

## Tests first (written failing before code)

**`tests/sim/doorways.test.ts`** (new)
- Walking left into the ruin-hall doorway puts the player in `foundry`, centred on the tile inside its doorway, with velocity 0. It records `roomChanges: [{ from, to }]`. Walking back returns the player to the ruin hall.
- A roll into the doorway changes room the same way.
- Door tiles are walkable for the player only. Husks, arrows and bombs treat them as wall.
- While the player is in the foundry, ruin-hall Husks don't aggro. An aggro'd Husk loses the player, runs its off-screen grace and walks home. A wind-up in progress doesn't land.
- Nodes keep regrowing and ground items stay put while the player is away.
- Arrows and bombs keep the room they were fired in. A bolt fired in the foundry never hits a ruin-hall Husk at the same coordinates.
- Pickups and harvests only reach things in the player's room.
- A KO in either room sends the player to the ruin-hall spawn.

**`tests/sim/placement.test.ts`** (new)
- A machine is locked until its recipe's output is in `crafted`. Conduits, hoppers and crates are always unlocked.
- These placements fail, record `placeFails` and change nothing:
  - placing a locked piece
  - placing on a wall, door or out-of-bounds tile
  - placing over another piece
  - placing a solid piece over the player's feet box
  - placing while the player is outside the foundry
- A conduit can go under the player.
- A 3×1 piece lies across its facing, with its tile as the middle. Facing up or down covers (tx−1..tx+1, ty), and facing left or right covers (tx, ty−1..ty+1). Its front is the tile ahead of the middle.
- `rotateCw` cycles up → right → down → left.
- Picking up a piece returns every item it held to the inventory:
  - a conduit's item
  - a machine's buffers and output, plus the inputs of a craft in progress
  - a hopper's count
  - a crate's contents
- Placing and picking up record events.
- Machines, hoppers and crates block the player with sliding collision. Conduits can be walked over. Arrows pass over every piece.

**`tests/sim/flow.test.ts`** (new)
- **Conduit:** an item takes 15 ticks to cross, then moves on. A conduit holds 1 item and refuses items from its own front.
- **Machine inputs:** a machine takes only its recipe's inputs, from a conduit, a hopper or another machine whose front is the machine, on any side but the machine's front. Each input buffer caps at 4.
- **Crafting:** a machine crafts after `craftTicks`. It starts only when output + recipe count ≤ 4, so an assembler making 4 arrows waits for an empty output.
- **Hand-off:** a machine pushes one item per tick into a conduit, a machine or a crate. A cutter facing straight into a hopper-fed assembler hands over its shafts directly.
- **Stalls:** a wrong item waits at the end of its conduit and the conduits behind it back up.
- **Hopper:** it holds one type. E deposits all of that type the player holds. A deposit command for an empty hopper takes any held item: raw, part or ammo. It pushes every 15 ticks into a conduit or a machine, and forgets its type when it's empty.
- **Crate:** it takes any item up to 99 in total. E empties it into the inventory and records `crateTakes`.
- **Status:** each machine reports one of four statuses:
  - `working` while crafting
  - `blocked` when its output can't fit another craft
  - `starved` when some inputs are buffered but not all, listing the missing ones
  - `idle` when nothing is buffered
- **Full lines produce ammo:**
  - Arrow: three hoppers, three conduit runs, cutter, knapper and spinner feeding the 3×1 assembler's back, then a crate.
  - Bomb: as the arrow line, through the packer.
  - Ley bolt: hopper, grinder, focuser, crate, all handing off directly.
  - Mid-chain: a hopper of hand-crafted shafts feeds the assembler directly.
- The foundry ticks while the player is in the ruin hall.

**`tests/sim/build.test.ts`** (new)
- `toggleBuild` only works in the foundry. Leaving through the doorway turns build mode off.
- In build mode, fire, load, ammo select and harvest are ignored. Move and roll still work, and the world keeps ticking.

**`tests/sim/health.test.ts`** (extend, KO)
- A KO keeps every piece, facing and item in the foundry.
- A KO resets ruin-hall Husks, nodes, ground items and projectiles, and clears build mode.

**`tests/sim/sim.test.ts`** (extend)
- A scripted session replays tick for tick under one seed: walk to the foundry, place a ley-bolt line, deposit, run, empty the crate, walk back and get KO'd.
- `summarize()` has the new fields.

**Existing tests:** `arena()` in `tests/sim/fight.ts` keeps working. The flat lists stay; each entity gains a `roomId`, and the helpers set it.

**`tests/data/data.test.ts` / `rooms.test.ts`** (extend)
- Every machine's recipe exists, and its craft time is above 0.
- Footprints are `1x1` or `3x1`. Only `assembler` and `packer` are `3x1`.
- Every doorway sits on its room's border with a floor tile inside it, and links to a doorway that links back.
- `foundry` is walls around open floor, with no enemies, nodes or blocks.
- The build bar lists every piece exactly once.
- Every new sprite and animation frame is in the atlas.

**`tests/e2e/foundry.spec.ts`** (new; each test fails on console errors). The 005 page helpers move to `tests/e2e/helpers.ts` and are shared with `crafting.spec.ts`.
- **Doorway:** walk through the doorway and back. The room in `getState()` changes, and the camera bounds change too.
- **Build mode by mouse and keys:**
  - Press B, then click a bar cell. Its layout comes from `BUILD_BAR_LAYOUT` and the canvas bounds.
  - Wait for the camera to settle on the player, then left-click two tiles right of the player's tile. The conduit lands there.
  - R then click places one facing right. Right-click picks it up.
  - Drag across three tiles to lay three conduits.
  - Fire and R-load are ignored while building.
- **Line:** harvest a ley vein, then craft `ley-shard` and `ley-bolt` once each to unlock their machines. Place hopper → grinder → focuser → conduit → crate.
  - E on the empty hopper opens the picker. Clicking ley crystal deposits it.
  - Step until the crate holds bolts. E takes them.
  - Leave build mode, select 3, load and fire a bolt.

**Screenshots (qa agent):**
- the doorway in each room and the fade mid-way
- a running arrow line
- a 3×1 machine in each facing, fed by three conduits
- two machines handing off directly
- the ghost when it can be placed and when it can't
- the build bar
- items on conduits
- each status marker
- the hover readout
- the hopper picker

## Sim (src/sim)

**Rooms.** The sim keeps flat lists, and every entity carries a room. `EnemyState`, `NodeState`, `GroundItem`, `ArrowState` and `BombState` gain `roomId`. `state.roomId` becomes the player's room. Systems match by room:
- Collision uses the entity's room and that room's obstacles.
- Arrow and burst hits only reach Husks in the same room.
- Pickups, harvest reach and Husk aggro and swipes need the player in the same room.

Tagging is a smaller change than nesting rooms, and existing tests keep `s.enemies` and the other lists.

New tick order in `stepSim`:
1. Clear events.
2. Mask the command if building.
3. Player moves (doors walkable, solid pieces as obstacles).
4. **Doorways.**
5. Enemies (per room).
6. Nodes regrow.
7. Harvest.
8. Arrows.
9. Burns.
10. Bombs.
11. `removeDead`.
12. Tube.
13. **Build toggle, place and pick up.**
14. **Foundry use** (E on a hopper or crate, and deposits).
15. **Foundry flow.**
16. Pickups.
17. KO.

| File | Change |
| --- | --- |
| `input.ts` | `Command` gains edges: `toggleBuild: boolean`, `place: { pieceId, tx, ty, facing } \| null`, `pickUp: { tx, ty } \| null` and `deposit: { id, itemId } \| null`. |
| `collision.ts` | `isSolid` and `moveBox` take `{ doors?: boolean }`, so door tiles are walkable only when it's set. |
| `movement.ts` | The player moves with `doors: true`. |
| `doorways.ts` (new) | `doorAt` and `arrivalTile` (the floor tile inward of a door). `stepDoorways` handles the feet box overlapping a door tile: switch room, set the arrival position and zero velocity, end build mode, record the event. |
| `huskAi.ts`, `enemies.ts` | Per-enemy room and obstacles. `separate` groups by room. On-screen and `landSwipe` need `e.roomId === state.roomId`. |
| `arrows.ts`, `combat.ts`, `bombs.ts`, `tube.ts` | Shots take the player's room. Walls come from `roomOf(a.roomId)`, and hits filter by room. |
| `drops.ts`, `harvest.ts`, `nodes.ts` | Ground items take their source's room. Pickups, reach and `createNodes` work by room. |
| `pieces.ts` (new) | A `PieceState` union with `id`, `pieceId`, `tx`, `ty` and `facing`. The variants:<br>• `conduit` (`item`, `progress`)<br>• `machine` (`buffer`, `output`, `crafting`, `progress`, `status`, `missing`)<br>• `hopper` (`item`, `count`, `timer`)<br>• `crate` (`contents`)<br>Helpers: `footprint`, `frontTile`, `pieceAt`, `solidRects`. |
| `placement.ts` (new) | `unlockedPieces(state)`, `canPlace` (returns a reason), `place` and `pickUp` (refunds to the inventory). |
| `flow.ts` (new) | `stepFoundry` runs in two phases:<br>1. Advance: conduit progress, machine crafts finishing and starting, hopper timers.<br>2. Transfer, in piece-id order: conduits, machines and hoppers push into their front through `offer(target, item, fromTile)`, which refuses a source standing on the target's front tile. Items that arrive start at progress 0, so nothing moves two hops in one tick.<br>Status is set at the end. |
| `foundryUse.ts` (new) | `usableInReach(state)`: the nearest hopper or crate within 12 px of the feet box. E on a crate empties it; E on a typed hopper deposits that type. `deposit(state, id, itemId)` fills an empty hopper. An empty hopper on E does nothing; render opens the picker. |
| `build.ts` (new) | `state.building`. `stepBuild` handles the toggle (foundry only) and runs place and pick-up. `maskCommand` drops fire, load, select and harvest while building. |
| `direction.ts` | Adds `rotateCw(f)`. |
| `state.ts` | Adds `foundry: { pieces, nextPieceId }` and `building`. `resetRoom` becomes `resetWorld`: the player goes to the spawn room, Husks and nodes rebuild from every room's data, ground items and shots clear, build mode goes off, and the foundry and `crafted` stay. |
| `events.ts` | Adds `roomChanges`, `places`, `placeFails` (with a reason), `pickUps`, `deposits` and `crateTakes`. |
| `summary.ts` / `summaryParts.ts` | Adds `room`, `rooms`, a `room` on each entity, `foundry.pieces` (`pieceSummary` per kind), `unlocked`, `building` and the new events. |

## Data (src/data)
- **`rooms.ts`:**
  - Adds `TILE.door = 'D'` and `Room.doorways?: { tx, ty, to, toDoor }[]`.
  - The ruin-hall door is on the left wall at (0, 12), away from the Husks at the top right.
  - New `foundry` room, 24×16 tiles, with its door on the right wall at (23, 8).
  - `SPAWN_ROOM` (was `DEFAULT_ROOM`) and `FOUNDRY_ROOM`.
- **`pieces.ts` (new):** a `PieceDef` union.
  - Machines: `recipeId`, `footprint: '1x1' | '3x1'` and `craftTicks`, for the nine in the spec's table.
  - `conduit`, `hopper` and `crate`.
  - `BUILD_BAR` order.
  - `SOLID_KINDS`.
- **`foundry.ts` (new):** `CONDUIT_TICKS 15`, `INPUT_CAP 4`, `OUTPUT_CAP 4`, `HOPPER_TICKS 15`, `CRATE_CAP 99` and `USE_REACH 12`.
- **`hudLayout.ts`:** `BUILD_BAR_LAYOUT`, `PICKER_LAYOUT` and `READOUT_LAYOUT`. It has no Phaser import, so e2e tests can click by them.
- **`foundryAssets.ts` (new, import-free):** piece sprite and animation keys, `STATUS_MARKERS` and the doorway sprite. This keeps `assets.ts` under 300 lines.

## Render (src/render)
- **`controls.ts`:**
  - Latches B and the wheel.
  - In build mode, R rotates the ghost facing (render-side, sent with `place`) instead of loading. Left-click queues `place`, and a drag queues one per new tile for conduits. Right-click queues `pickUp`.
  - Clicks on the bar or the picker go to those views, not the world.
  - Esc closes the picker first, then leaves build mode, then closes the menu.
  - `nextCommand` pops one queued build action per tick.
- **`GameScene.ts`:**
  - `shownRoomId`. On a `roomChanges` event the camera fades out for 150 ms. At the midpoint the scene swaps the `RoomView`, sets the camera bounds and centres the camera, then fades in for 150 ms. While the shown room differs from the player's room, the player sprite is hidden.
  - Every view gets its list filtered to the shown room.
  - It opens the picker when E finds an empty hopper in reach (`usableInReach`), and closes it when the hopper goes out of reach.
- **`room.ts`:** becomes `RoomView`, which draws and destroys one room's tiles and draws doorways with their sprite.
- **`FoundryView.ts` (new):**
  - Pieces are pooled by id and depth-sorted by feet.
  - Machines are a shared housing per footprint and view, with an idle or working animation, plus the machine's emblem.
  - Conduits use a flow animation. A conduit's item icon is lerped across its tile by progress.
  - Hoppers and crates show an icon and a count drawn with `GlyphLine`.
  - Status markers sit above machines.
- **`BuildView.ts` (new):** the bottom bar of unlocked pieces with the selection highlighted. The ghost sits on the cursor tile, tinted cyan when it can be placed and red when it can't (from the sim's `canPlace`), with its facing shown.
- **`HoverReadout.ts` (new):** a machine under the cursor shows its buffers and output, in any mode.
- **`HopperPicker.ts` (new):** reuses `craft-panel` and `craft-row`. Each held item is a row, and clicking a row queues `deposit`.
- **`testHook.ts`:** `step` treats `toggleBuild`, `place`, `pickUp` and `deposit` as first-tick edges. No new hook methods.

## Art (`/sprite` flow, each approved by Shaun at 4×)
- **Doorway:** `doorway-side`, a rune arch in the side wall, flipped for the right wall.
- **Machine housings** in rune-carved stone with ley-cyan seams. Views are down, up and side (left is side flipped):
  - `machine-1x1-*`: idle 1 frame, working 2 frames.
  - `machine-3x1-*`: 96×32 for down and up, 32×96 for side, with the front port marked.
- **Emblems:** a 16×16 emblem for each of the nine machines. Proposal: a shared housing plus an emblem per machine instead of 81 unique frames. Shaun can ask for unique bodies at review.
- **Logistics:**
  - `conduit-*`: a crystal channel in down, up and side views, with a 2-frame flow.
  - `hopper-*`: a stone hopper with its spout in each view.
  - `crate`.
- **Markers:** `status-cog` (2 frames), `status-stop` and `status-bubble` (a frame behind the missing item's icon).
- **UI:** `build-cell`, `build-cell-select` and `readout-panel`. The picker reuses the craft panel.

## Build order (small commits)
1. Data plus the failing sim and data tests.
2. Room tags and doors, collision with doors, and the doorway step. The existing tests stay green.
3. Pieces, placement, unlocks and solid collision.
4. Flow: conduits, machines, hoppers, crates and status.
5. Foundry use, deposits and build mode masking.
6. KO, the summary and the test-hook fields.
7. Art via `/sprite` (approved), then `npm run art`.
8. `RoomView`, the room fade and the view filters.
9. `FoundryView`, build mode controls, `BuildView`, the hover readout and the picker.
10. Shared e2e helpers, then `foundry.spec.ts`.
11. `docs/decisions.md` entries:
    - rooms as tags on flat lists
    - door tiles walkable only for the player
    - the two-phase flow tick
    - a craft starts only if its whole output fits
    - rotate is render-side and carried on `place`
    - shared housings plus emblems

## Verification
- `npm run check` passes: typecheck, lint, unit and data tests, and the stale-atlas guard.
- `npm run test:e2e` passes: `foundry.spec.ts` and every existing spec.
- The qa agent takes the screenshots listed above.
- `/review` runs the reviewer against the spec.
- Shaun playtests the Pages preview: place a line, read where it's stuck, and come home to a full crate.
