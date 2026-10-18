# Plan: 007 Tube link (docs/specs/007-tube-link.md, approved)

Approved by Shaun in chat, 2026-10-18.

## Context
Spec 007 links the tube to the foundry. The first time the player enters the foundry, the tube attunes. A new `tube-socket` piece at the end of a line feeds one reservoir (cap 30). Shots fire carried ammo first, then the reservoir, and the hotbar glows cyan while it fires reservoir ammo. Hand-loading (R, `load`, `loaded`/`loading`) is removed. Shaun's playtest request is also in: a `?playtest` URL flag starts with 99 of each ammo and raw, 20 of each part, and every machine unlocked.

It's a vertical slice (sim, data, render, art together) on `claude/cool-thompson-dxlx4b`, which already holds the approved spec. The plan is also saved as `docs/plans/007-tube-link.md` in the first build commit.

## Tests first (written failing before code)

**`tests/sim/tube.test.ts`** (rewrite the loading cases)
- Holding fire with arrows carried fires one per `fireTicks` and takes each straight from the inventory. No load step is needed.
- Bombs and ley bolts fire from the inventory at their own intervals.
- With none carried and an empty reservoir, fire is a dry fire. It's also a dry fire when the reservoir holds a different ammo.
- `selectAmmo` changes the ammo and moves nothing between the inventory and the tube.
- Rolling still blocks firing.

**`tests/sim/link.test.ts`** (new)
- The tube starts unattuned. The first step that puts the player in `foundry` (through the doorway) sets `attuned`, records `attunes: [{}]` once and starts the pulse (`attunePulse = ATTUNE_TICKS`, counting down). Leaving and re-entering records nothing.
- A KO keeps `attuned` and the reservoir.
- Reservoir firing:
  - With 0 arrows carried and 5 in the reservoir, fire takes from the reservoir and sets `fromReservoir`.
  - With arrows carried and in the reservoir, the inventory goes first and `fromReservoir` is false.
  - The reservoir forgets its ammo at 0.
- `slotCount(state)` returns the inventory count while any is carried. With none carried, it returns `{ count: reservoir, fromReservoir: true }` when the reservoir holds the selected ammo, and 0 otherwise.

**`tests/sim/placement.test.ts`** (add)
- `tube-socket` is locked until attuned, then appears in `unlockedPieces` (build bar order, after crate).
- A second socket fails with reason `limit`. Picking up the first frees the slot.
- Picking up a socket gives no items, and the reservoir keeps its count.
- A socket is solid to the player.

**`tests/sim/flow.test.ts`** (add)
- A socket takes ammo from a conduit or a machine on any side: the reservoir count goes up, a `refills` event is recorded and the pulse starts.
- It refuses:
  - a part or a raw
  - a different ammo while the reservoir holds one
  - anything once the reservoir is at 30
  
  A refused item stalls the conduit behind it.
- A hopper never pushes into a socket. Hoppers already only feed conduits and machines, so that stays.
- Full line: ley crystal hopper → grinder → focuser → socket. Stepping fills the reservoir, and the player fires the bolts out of it after the carried ones run out.

**`tests/sim/sim.test.ts`** (add)
- `createSim(seed, { start: PLAYTEST_START })` starts with the boosted inventory and the crafted set, so all nine machines are unlocked. A KO resets the inventory to the boosted set.
- `createSim(seed)` is unchanged: 30 arrows and nothing crafted.
- The same seed, options and commands give the same state, including the link.

**`tests/sim/data.test.ts`** (or the existing data test; add)
- `tube-socket` is in `PIECES` and `BUILD_BAR`.
- Every `PLAYTEST_START.inventory` id is an item.
- `PLAYTEST_START.crafted` covers every recipe output.
- The new sprite keys are in the atlas.

**Existing tests to update:** `tests/sim/fight.ts` (`loadFull` goes, and fights fire straight from the inventory), `tests/sim/combat.test.ts`, `arrows.test.ts`, `health.test.ts`, `harvest.test.ts` and `build.test.ts` wherever they load. On the e2e side, `tests/e2e/helpers.ts`, `firing.spec.ts`, `enemies.spec.ts`, `crafting.spec.ts` and `foundry.spec.ts` drop `load`, `loaded` and `loading`.

**`tests/e2e/tubeLink.spec.ts`** (new)
- Walking into the foundry attunes once (`events.attunes`, `attuned: true`).
- Build an arrow line with `__GAME__.craft`'d unlocks, or use `?playtest`, ending in a socket. Step until the reservoir fills, fire out the carried arrows, then fire again and see `fromReservoir` and the reservoir count fall.
- `/?playtest` starts with 99 arrows, all nine machines in `unlocked`, and `tube-socket` after attuning.
- No console errors.

## Data
- **`src/data/tube.ts`:** remove `TUBE_CAPACITY` and `LOAD_TICKS`. Add `RESERVOIR_CAP = 30`, `ATTUNE_TICKS = 60` (the ~1 s pulse) and `REFILL_PULSE_TICKS = 8`.
- **`src/data/pieces.ts`:** `LogisticsDef.kind` gains `'socket'`, plus `'tube-socket': { kind: 'socket', name: 'Tube socket', footprint: '1x1' }` and a `limit?: number` field (1 for the socket). `BUILD_BAR` puts it after `crate`.
- **`src/data/playtest.ts`** (new): `PLAYTEST_START = { inventory, crafted }`. `crafted` is derived from `RECIPES` outputs, the inventory is the spec's counts, and both are typed `StartDef`.
- **`src/data/player.ts`:** `DEFAULT_START: StartDef = { inventory: STARTING_INVENTORY, crafted: [] }`.
- **`src/data/foundryAssets.ts`:** `SOCKET_SPRITES` (idle + refill frame), `LOGISTICS_ICONS['tube-socket']` and `TUBE_ATTUNE` overlay frames per view.
- **`src/data/assets.ts` / `hudLayout.ts`:** `hudSlotGlow` key. In `HUD_SLOT_LAYOUT`, drop `loaded`, `loadBar` and `loadBarColor`, and keep a single count.

## Sim
- **`src/sim/link.ts`** (new, ~90 lines). `LinkState { attuned, attunePulse, reservoir: { ammoId: string | null; count } }`. It also holds:
  - `stepLink(state)`, which runs after `stepDoorways`: it attunes on a room change into `FOUNDRY_ROOM` and counts the pulse down.
  - `acceptIntoReservoir(link, item): boolean`, used by flow.
  - `takeFromReservoir(link, ammoId): boolean`.
  - `slotCount(state)`, for the HUD.
- **`src/sim/state.ts`:**
  - `SimState` gains `link: LinkState` and `start: StartDef`.
  - `createSim(seed, opts: { roomId?, start? } = {})` replaces the positional `roomId`. Update the few callers.
  - `resetWorld` uses `state.start.inventory` and leaves `link` alone. `createSim` seeds `crafted` from `start.crafted`.
- **`src/sim/tube.ts`:**
  - Drop `loaded`, `loading`, `loadProgress`, `canLoad`, `advanceLoading` and `stopLoading`, and add `fromReservoir`.
  - `fire()` takes from the inventory via `take()` (`src/sim/inventory.ts`), else `takeFromReservoir`, else dry fire.
  - `selectAmmo` only switches.
  - Callers of `stopLoading` (`harvest.ts`, `build.ts` comments, `step.ts` comment) are updated.
- **`src/sim/input.ts`, `build.ts` (`maskCommand`), `render/testHook.ts`:** remove `load`.
- **`src/sim/pieces.ts`:** `SocketState { kind: 'socket'; pulse: number }`, built in `createPiece`.
- **`src/sim/flow.ts`:**
  - `stepFoundry(foundry, link)`.
  - `offer()` handles `socket` with crate-like any-side intake via `acceptIntoReservoir`, and sets `pulse` and pushes a refill.
  - `advance()` counts the pulse down.
  - Refill events go through a small `onRefill` callback or a returned count, so `flow.ts` stays free of `SimState`. `step.ts` pushes `events.refills`.
- **`src/sim/placement.ts`:**
  - `unlockedPieces` is gated: sockets need `link.attuned`.
  - `canPlace` returns `'limit'` when the count of that piece ≥ `limit`. Add `'limit'` to `PlaceFail`.
  - `pieceContents` gives nothing for a socket.
- **`src/sim/events.ts`:** `attunes: {}[]` and `refills: { id: number; ammoId: string }[]`, cleared each tick.
- **`src/sim/summary.ts` / `summaryParts.ts`:**
  - `tube` becomes `{ ammo, fireCooldown, dryFire, firing, fromReservoir }`.
  - New `link: { attuned, attunePulse, reservoir: { ammo, count, cap } }`.
  - `pieceSummary` handles socket `pulse`.
- **`src/sim/step.ts`:** `stepLink` after `stepDoorways`, and `stepFoundry(state.foundry, state.link)`.

## Render
- **`src/main.ts` + `src/render/playtest.ts`** (new): `parsePlaytest(search)` returns true when `playtest` is present. `createSim(seed, { start: playtest ? PLAYTEST_START : DEFAULT_START })`. It works in production preview builds too.
- **`src/render/controls.ts`:** R only rotates in build mode, and outside it R does nothing. Remove `loadPending`.
- **`src/render/HudView.ts`:**
  - Drop the loaded readout and the load bar.
  - Show `slotCount(sim)`.
  - Show the `hudSlotGlow` overlay when `fromReservoir`. The dry-fire tint stays.
  - `update()` takes the `SimState` slice it needs. `GameScene` passes it.
- **`src/render/PlayerView.ts`:** while `link.attunePulse > 0`, draw the `TUBE_ATTUNE` overlay over the tube (same grip, frame by pulse phase).
- **`src/render/FoundryView.ts` + `foundryLayout.ts`:**
  - Draw sockets: the idle frame, or the refill frame while `pulse > 0`.
  - Input arrows on all four sides, as crates have, with no output arrow. Generalize the `kind !== 'crate'` check to "has an output".
- **`src/render/HoverReadout.ts`:** on a socket, show the reservoir ammo icon and `count/30`.
- **`BuildView`:** picks up the socket automatically through `unlockedPieces` and `LOGISTICS_ICONS`.

## Art (via /sprite, Shaun approves at 4×)
- `tube-socket` (rune stone pedestal with a cyan ring) plus `tube-socket-refill`
- `emblem-tube-socket`
- `tube-attune-down` / `-up` / `-side` (2 frames of cyan pulse over the tube)
- `hud-slot-glow` (cyan rim over `hud-slot`)

Run `npm run art` after.

## Commit order
1. Plan doc, then remove hand-loading. Tests are updated or failing first, then tube, input, hook, controls and HUD count.
2. Playtest start options: data, `createSim` options and `main.ts` flag.
3. Link state and attunement: events, summary and the attune overlay (placeholder until art).
4. Socket piece: data, placement limit and unlock, flow intake, refill events, views and readout.
5. Reservoir firing and the hotbar glow.
6. Sprites drawn and approved, then e2e `tubeLink.spec.ts`.

## Verification
- `npm run check` (typecheck, lint, all unit tests) and `npm run test:e2e`.
- qa agent screenshots: the attune pulse, the socket on a line in and out of build mode, the hover readout, the hotbar with an inventory count, and the cyan hotbar with a reservoir count.
- `/review`, then Shaun playtests the Pages preview at `/branch/claude/cool-thompson-dxlx4b/?playtest`.
