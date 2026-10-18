# Plan 019: Foundry intake pipe

Spec: docs/specs/019-intake-pipe.md. Written for the unattended run (stacked on 018, `claude/019-intake-pipe`). It stays inside the spec.

## Shape of the change
The `tube-socket` piece goes. The intake is a fixed part of the foundry room, not a piece:
- Its mouth is three wall tiles, `INTAKE.mouth` in `src/data/foundry.ts`: tiles 11–13 of the north wall (row 0), the centre of the 24-tile wall.
- The floor tiles south of them (row 1) stay buildable. A wall tile can't hold a piece, so the intake can't be placed over, picked up, moved or rotated.
- The brazier prop at (12,0) is removed: the pipe now stands there.

Flow:
- `offer()` treats a mouth tile as a target that takes items only from the tile directly south of it, and only once the tube is attuned.
- It fills the one reservoir with today's rules.
- The `refills` event names the mouth tile (index 0–2) instead of a piece id.

Streams: every stager whose front tile is a mouth tile, sorted as today (`intakeStreams`), so 3 at most.

## Tests first
1. **`tests/sim/intake.test.ts`:**
   - each mouth tile takes only from the tile south of it, not from the side or a hopper
   - refuses before attuning
   - fills the shared reservoir, refuses when full, and the line backs up
   - three stagers make three streams, sorted
   - a piece can't be placed on a mouth tile
   - `tube-socket` is gone from the pieces, bar and unlocks
   - the summary reports the mouth tiles and streams
2. **Existing 007/008 tests** (link, spread, flow, tube, objectives, playtest) are rewritten to build into the intake instead of placing a socket.
3. **e2e:**
   - tubeLink, spread and tutorial build into the middle mouth tile
   - a 3-way spread from three stagers facing the mouth
   - a full reservoir backs the line up

## Steps
1. **Data:**
   - `INTAKE` (mouth tiles, gauge ring count, pulse timing) in `foundry.ts`
   - remove `tube-socket` from `pieces.ts`, `BUILD_BAR` and `foundryAssets`
   - the objective becomes "Build an ammo line into the intake (B)", checked as "a piece feeds the intake"
   - the stager's description names the intake
   - delete the socket's pixel sprites
2. **Sim:**
   - the intake in `flow.ts`
   - `intakeStreams` in `spread.ts`, used by the tube and objectives
   - remove the socket piece type, unlock and limit
   - `summary.intake` = { mouth, streams }
3. **Render:**
   - a new `IntakeView` draws the pipe in vector (`src/data/art/intake.ts`):
     - a wide flared mouth across the 3 tiles at floor level with an inlet port per tile, rising up the wall face and curving into it
     - the same cyan body, dark rings, brass collars and top highlight as the carried tube
     - dormant grey-cyan; on attuning, its rings light one by one with the tube's attune timer
     - a gauge column of rings lit in proportion to the reservoir
     - a ring of light running up the pipe for each `refills` event
   - build mode: an input arrow under each mouth tile, and a spread fan from each mouth tile a stager faces
   - hover over the mouth: "Foundry intake" with the reservoir readout
   - the socket's glow moves to the intake
4. **Docs:** art.md (the intake), build notes, progress.
