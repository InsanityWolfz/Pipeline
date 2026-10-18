# 006: Foundry building
status: approved

## Goal
A doorway in the ruin hall leads to the foundry, an empty walled room. There the player enters build mode and places machines, ley conduits, input hoppers and output crates on the tile grid, each with a facing. Raw materials the player drops into a hopper ride conduits through machines that run the same recipes as hand crafting, and finished ammo collects in a crate the player empties with E. Machines unlock by hand-crafting their output once. All three beginner chains can be built, and one full line working end to end proves it.

## Design references
- docs/design.md: "Pillars" 2 (manual first, then automated) and 7–8 (no nagging; the world only runs while the game is open), "The Foundry" (walk-around building on a grid in the same world, no separate factory screen, position and facing matter; ammo is built physically: an arrow takes three chains into an assembler; "Unlocks": crafting something by hand once unlocks the machine that makes it; "No ratio math": machines show where the bottleneck is; "Play time only"; "Rearranging a line is fast"), "World" (theme rule; fantasy machines; ley conduits carry materials), "Death and tension" (the factory is always kept)
- docs/prototype.md: "Player flow" beats 4 and 6, "Content list" (beginner ammo chains; foundry placement; foundry pieces: machines for the ammo chains), "Crude animations needed" (machine idle and working loops, ammo moving between machines)
- docs/process.md: "Prototype backlog" item 006
- docs/specs/005-hand-crafting.md: recipes, the crafted-items set, E interaction
- Interview decisions (Shaun, 2026-10-18): the foundry is a new room reached by a doorway; items move on placeable conduits; materials go in through an input hopper; ammo comes out into an output crate; all three chains get machines; placing is free; machines unlock by hand-crafting their output once; combiners (assembler, packer) are 3×1, everything else 1×1; B toggles build mode, R rotates, left-click places, right-click picks up, the world keeps running; build anywhere on the foundry floor under the cursor; each hopper holds one item type, chosen with a small picker; an item a machine can't use stalls its conduit; the doorway uses a short fade, the player still spawns in the ruin hall; the foundry ticks wherever the player is; a KO keeps the whole foundry; machines show working, starved and blocked markers, with buffers on hover. Follow-up (Shaun, 2026-10-18): machines can hand items straight to the next machine; the three-input combiners are 3×1 so each input can have its own conduit; conduits are walkable and other pieces solid; hoppers take any item the player holds (so leftover hand-crafted parts can start a line mid-chain) and can push straight into a machine. Claude proposes the tuning below for Shaun to adjust.

## Acceptance criteria

**Rooms and the doorway (sim, data)**
- [ ] A new room `foundry`: about 24×16 tiles, walls around open floor, no enemies, nodes or ruin blocks. Rooms are data, as before.
- [ ] Each room can have doorways (data): a tile in its wall that links to a doorway tile in another room. `ruin-hall` gets one doorway to `foundry` and `foundry` one back (tiles chosen in /plan, away from the Husk pack).
- [ ] When the player's feet box overlaps a doorway tile, the player moves to the linked room, standing one tile inside its doorway, with velocity cleared. A room change event is recorded. Rolling into a doorway works the same.
- [ ] The sim holds every room's state at once and ticks all of them each step: Husks, nodes, ground items and projectiles keep their room. The player, their projectiles and the camera are in one room at a time. Husks never change rooms.
- [ ] The player still spawns in `ruin-hall`. The KO reset sends the player back to the ruin hall spawn as before.

**Pieces (data)**
- [ ] Buildable pieces are data: id, footprint (1×1 or 3×1), sprites, and for machines the recipe id they run and a craft time.
- [ ] Machines, each running its 005 recipe:

  | Machine | Recipe | Size | Craft time (ticks) |
  | --- | --- | --- | --- |
  | `cutter` | `shaft` | 1×1 | 60 |
  | `knapper` | `arrowhead` | 1×1 | 60 |
  | `spinner` | `rope` | 1×1 | 60 |
  | `assembler` | `arrow` | 3×1 | 90 |
  | `shaper` | `casing` | 1×1 | 60 |
  | `fuse-maker` | `fuse` | 1×1 | 60 |
  | `grinder` | `ley-shard` | 1×1 | 60 |
  | `packer` | `bomb` | 3×1 | 90 |
  | `focuser` | `ley-bolt` | 1×1 | 60 |

- [ ] Logistics pieces, all 1×1: `conduit`, `hopper`, `crate`.

**Unlocks (sim)**
- [ ] A machine is unlocked when its recipe's output item is in the crafted-items set (005). Conduits, hoppers and crates are always unlocked. Locked pieces can't be placed.

**Placement (sim)**
- [ ] A place command (piece id, tile, facing) puts the piece on the `foundry` grid if it's unlocked and every tile of its footprint is floor that holds no other piece and, for a solid piece, doesn't overlap the player's feet box. Otherwise nothing changes and a place-failed event is recorded. A 3×1 piece lies three tiles wide across its facing (a row when facing up or down, a column when facing left or right), and its tile is the middle one. Placing is free.
- [ ] Facing is one of up, down, left, right. A rotate in build mode turns the facing clockwise.
- [ ] Machines, hoppers and crates are solid to the player (feet-box collision, sliding, as nodes in 005). Conduits can be walked over. Projectiles pass over every piece.
- [ ] A pick-up command (tile) removes the piece covering that tile. Every item it held (buffers, conduit item, hopper or crate contents) goes into the player's inventory. A place or pick-up event is recorded.
- [ ] Place, rotate and pick-up are sim commands, deterministic and replayable, drivable through `window.__GAME__` (route chosen in /plan). They only work while the player is in the foundry.

**Item flow (sim)**
- [ ] Each piece has a front: the side its facing points to. A 1×1 piece's front is the tile ahead of it. A 3×1 machine's front is the tile ahead of its middle tile; its back and both ends are input sides, so three conduits can feed it, one per tile on the back.
- [ ] **Conduit:** holds at most 1 item. An item in a conduit needs 15 ticks to cross it, then moves into its front if that accepts it, and waits there otherwise. Conduits accept items from any side but their front.
- [ ] **Machine:** accepts an item from a conduit or another machine whose front is the machine, on any side but its own front, if the item is one of its recipe's inputs and its buffer for that item holds fewer than 4. When every input is buffered, it takes them and crafts for its craft time, then holds the output (up to 4). It pushes one output item at a time into its front if that's a conduit, a machine or a crate that accepts it, so a machine facing straight into the next machine needs no conduit between them. It doesn't start a craft while its output is full.
- [ ] **Stall:** an item at the end of a conduit that its front doesn't accept (wrong item, full buffer, or nothing there) waits, and the conduits behind it back up.
- [ ] **Hopper:** holds one item type, any count. A deposit (E within 12 px of an empty hopper's feet box, with the item picked from any item the player holds: raw, part or ammo) moves all of that item from the inventory into it. A deposit into a hopper that already holds that type adds all of it the player holds. A withdraw moves everything in a hopper in reach back into the inventory, and the hopper forgets its type. *(Playtest change, Shaun 2026-10-18: E no longer deposits straight away; it opens the hopper menu below.)* It pushes one item every 15 ticks into its front if that's a conduit or a machine that accepts it. An empty hopper with no items forgets its type.
- [ ] **Crate:** accepts items from a conduit or machine whose front is the crate, from any side, any item, up to 99 in total. E within 12 px of its feet box moves everything in it into the inventory and records a pickup event.
- [ ] Machines report a status each tick: `working` (crafting), `starved` (missing at least one input; lists which), `blocked` (output full), or `idle` (nothing buffered).
- [ ] The foundry ticks every step whichever room the player is in. Nothing ticks while the sim doesn't (crafting menu open), so it runs on play time only.

**KO, determinism and the hook**
- [ ] The KO reset keeps the foundry entirely: pieces, facings, and every item in conduits, buffers, hoppers and crates.
- [ ] The same seed and command sequence (including room changes, placements, deposits and pickups) give the same foundry state, tick for tick.
- [ ] `getState()` adds: the player's room; each room's id; the foundry pieces (id, piece, tile, facing, and per type: conduit item and progress, machine buffers, output, craft progress and status, hopper item and count, crate contents); unlocked pieces; build mode on or off; and this tick's room change, place, place-failed, pick-up, deposit and crate pickup events.

**Build mode (render, input)**
- [ ] B toggles build mode, only in the foundry; Esc also leaves it. Leaving the foundry leaves it. In build mode the player can walk and roll but not fire, load, harvest or switch ammo (1–3), and the world keeps running.
- [ ] A bar along the bottom of the screen shows every unlocked piece with its icon, the selected one highlighted. Clicking a piece or scrolling the wheel selects it.
- [ ] A ghost of the selected piece snaps to the tile under the cursor with its facing shown, tinted ley cyan where it can be placed and red where it can't. R rotates it. Left-click places it, right-click picks up the piece under the cursor.
- [ ] Holding left-click and dragging places conduits along the tiles the cursor crosses, all with the current facing.
- [ ] E next to a hopper opens the hopper menu. On an empty hopper it lists every item the player holds; clicking one deposits it. On a filled hopper its first row takes everything out, and a second row, if the player holds that item, puts more in. Esc or moving away closes it. The world keeps running. *(Playtest change, Shaun 2026-10-18; it was a picker for empty hoppers only.)*
- [ ] In build mode every piece but conduits shows arrows, and so does the ghost: cyan pointing out of its output side, gold pointing in on every side that takes items. Hoppers have only an output, crates only inputs, on all four sides. *(Playtest addition, Shaun 2026-10-18.)*

**Foundry views (render)**
- [ ] Every piece is drawn with its facing, depth-sorted by its feet. Machines play an idle loop and a working loop. Conduits show their flow direction.
- [ ] Items move visibly: an item in a conduit is drawn as its icon sliding across the tile; hoppers and crates show their item and count.
- [ ] Each machine shows a small status marker: an animated cog while working, the missing item's icon when starved, a stop rune when blocked, nothing when idle. Hovering a machine (any mode) shows its input buffers and output counts.
- [ ] Walking through a doorway fades the screen out and in over about 0.3 s; the camera switches to the new room and clamps to it.
- [ ] Everything fits the theme rule: rune-carved stone machines, crystal ley conduits, cyan ley accents.

**Art**
- [ ] New sprites following docs/art.md: the foundry floor and walls (can reuse the ruin hall's), a doorway in each room; the nine machines in four facings (side frames flipped for left), each with idle and working frames; conduit straight pieces in four facings; hopper and crate; status markers; the build bar and its cells; the ghost tint; the hopper picker panel. All registered in `src/data/assets.ts`.
- [ ] Shaun approves every new sprite by eye at 4×.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- Rooms (`src/data/rooms.ts`): a `doorways` list on `Room` (tile, target room id, target doorway); new `foundry` room; a doorway tile symbol if needed.
- Pieces (new, e.g. `src/data/pieces.ts`): the nine machines with recipe id, footprint, craft time, 3×1 footprint rule; `conduit`, `hopper`, `crate`; the build bar order.
- Foundry tuning (new, e.g. `src/data/foundry.ts`): conduit crossing 15 ticks, machine buffer 4 per input, output 4, hopper push every 15 ticks, crate capacity 99, deposit reach 12 px.
- `src/data/assets.ts`: keys and layouts for the new sprites, the build bar, markers and the picker.

## Out of scope
- The tube link and reservoir (007): ammo only reaches the tube through the crate and the inventory.
- Gravity stagers and spreads (008), supply lines and pylons (009).
- Machine parts or any build cost, schematics, foundry wings, upgrades.
- Splitters, mergers, underground conduits, sorting or filtering.
- Blueprints, copy-paste, undo, multi-select, area pick-up.
- Building outside the foundry; enemies entering the foundry or changing rooms.
- Recipe gating and tutorial order beyond the unlock rule (012). Uncovering or attuning the foundry (007/012).
- Saving the foundry between sessions.
- Sound, throughput numbers or rate readouts.

## Test plan
- **Vitest (`tests/sim`):**
  - Rooms: walking into a doorway moves the player to the linked room one tile inside, velocity cleared, event recorded; rolling in works; both rooms tick while the player is in either; Husks stay in their room; KO returns the player to the ruin hall spawn.
  - Unlocks: a machine is locked until its output is crafted by hand; logistics pieces always unlocked.
  - Placement: valid placement; rejects locked, off-floor, wall, overlapping and (for solid pieces) under-the-player tiles with place-failed; 3×1 footprints in all four facings; rotate cycles clockwise; pick-up returns every held item; machines, hoppers and crates are solid and conduits aren't; only in the foundry.
  - Flow: conduit crossing time and one-item capacity; conduits don't accept from their front; machine accepts only its inputs, buffers up to 4, crafts after its time, holds up to 4 output and stops when full; a machine facing another machine hands its output over directly, and a machine facing one that can't use the item is blocked; wrong items stall and back up the line; hopper pushes every 15 ticks into a conduit or straight into a machine, takes any item type (raw, part or ammo), keeps one type, forgets it when empty; crate caps at 99; E on a crate empties it into the inventory.
  - Status: working, starved (with missing inputs), blocked and idle.
  - Lines: a full arrow line (three hoppers, cutter, knapper, spinner, assembler, crate), a bomb line and a ley bolt line each produce their ammo from raw materials; a hopper of hand-crafted shafts feeding an assembler directly starts a line mid-chain.
  - KO keeps the foundry; determinism of a build-and-run session tick for tick.
- **Vitest (data test):** every machine's recipe exists; footprints are 1×1 or 3×1; every doorway links to a doorway in an existing room; every new sprite key is in the atlas.
- **Playwright (`tests/e2e/foundry.spec.ts`):** walk through the doorway and back; in build mode place, rotate and pick up pieces with the mouse; drag a conduit run; deposit into a hopper through the picker; build a ley bolt line, step until the crate holds bolts, empty it with E, load and fire one; firing and loading are ignored in build mode; no console errors.
- **Screenshots (qa agent):** the doorway in each room; the foundry with a full arrow line running; a 3×1 machine in each facing fed by three conduits; two machines handing off directly; the ghost valid and invalid; the build bar; items on conduits; each status marker; the hover readout; the hopper picker; the fade mid-transition.
- **Shaun's review:** every new sprite at 4×, then the Pages preview playtest (is placing quick? can you read where a line is stuck? does the first full line feel like "it does itself"?).

## Open questions
- Every number above is a starting value for Shaun to adjust when approving.
