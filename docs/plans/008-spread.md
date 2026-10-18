# Plan: 008 Spread (docs/specs/008-spread.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/008-spread`, stacked on 007.

## Tests first
- **`tests/sim/stager.test.ts`** (new):
  - **Placement:** placing a stager takes one warden core. With none carried it fails with `cost`. Picking it up refunds the core. It's solid.
  - **Flow:** a stager holds 1 item, takes from any side but its front, and pushes the item on after `STAGER_TICKS`. A hopper can feed it.
  - **Angle:** `setAngle` cycles 0 → +15 → +30 → −30 → −15 → 0 and records `angles`. E beside a stager does the same.
  - **Streams:** `socketStreams` lists only stagers whose front is the socket, ordered nearest 0° first. A conduit feeding the socket adds no stream.
  - **Firing:**
    - With S streams and R ≥ S rounds, one shot fires S projectiles at each stream's angle and costs S rounds.
    - With fewer rounds than streams, it fires R projectiles at the nearest-0° angles.
    - With no streams, it fires 1 projectile straight.
    - Carried ammo never spreads.
    - Bombs land at the aim distance along each angle.
    - `shotCount` is recorded.
  - **Line:** three ley bolt grinder → focuser → stager rows into one socket, then fire 3 bolts per shot.
- **`tests/data/data.test.ts`:** the stager is in the build bar with its cost, `warden-core` is an item, the playtest start holds 5 cores, `STAGER_ANGLES` contains 0, and the new sprites are in the atlas.
- **`tests/e2e/spread.spec.ts`:** with `?playtest`, build three stagers into a socket fed by ley bolt lines, fill the reservoir, empty the carried bolts, and see 3 bolts from one shot.

## Data
- **`src/data/pieces.ts`:**
  - `kind: 'stager'`, with an optional `cost` on `PieceBase`.
  - `gravity-stager` with `cost: { 'warden-core': 1 }`, placed after `tube-socket` in `BUILD_BAR`.
- **`src/data/foundry.ts`:** `STAGER_TICKS = 15` and `STAGER_ANGLES = [-30, -15, 0, 15, 30]`.
- **`src/data/items.ts`:** `warden-core` (part).
- **`src/data/playtest.ts`:** a count override of `warden-core: 5`.
- **Assets:**
  - `STAGER_SPRITE` (5 angle frames), the emblem, `MUZZLE_FLASH` and the item icon
  - a new `-` glyph in `hud-digits`
  - `SPREAD_FAN` layout (length, alpha)

## Sim
- **`pieces.ts`:** `StagerState { kind: 'stager'; item; progress; angle }`.
- **`flow.ts`:** stagers advance and transfer like conduits, using `STAGER_TICKS`. Hoppers can feed them.
- **`placement.ts`:**
  - A `'cost'` fail.
  - `place` takes the cost, and `pieceContents` adds the cost back on pick-up.
- **`spread.ts`** (new):
  - `socketStreams(foundry)` returns angles.
  - `cycleAngle(state, id)` advances a stager's angle.
  - `rotate(dx, dy, deg)`.
- **`input.ts`:** `setAngle: { id } | null`. `build.ts` applies it in the foundry. `foundryUse.ts` handles E on the nearest stager in reach.
- **`tube.ts`:**
  - A reservoir shot fires `max(1, S)` projectiles. The first round is already taken; it takes up to S−1 more from the reservoir.
  - `tube.shotCount` is set.
- **`events.ts`:** `angles`.
- **Summary:** the stager piece, socket `streams`, and `tube.shotCount`.
- **Hook:** `setAngle` joins the edge fields.

## Render
- **`FoundryView`:**
  - Draws the stager at its angle frame, with an alpha pulse while it holds an item.
  - In build mode, the socket shows faint cyan fan lines, one per stream angle (relative to up).
- **`HoverReadout`:** stager lines show the stager emblem and a signed angle.
- **`controls.ts`:** in build mode, a left click on a stager tile queues `setAngle`; that needs a `stagerAt` callback on `BuildInput`.
- **`EffectsView`:** a muzzle flash on each new arrow or bomb fired this tick, at its spawn point.

## Verification
- `npm run check` and `npm run test:e2e`.
- qa screenshots: a spread in flight, stager needles, build-mode fan lines.
- reviewer, then the draft PR.
