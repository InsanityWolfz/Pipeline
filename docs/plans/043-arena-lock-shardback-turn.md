# Plan 043: Arena lock and slower Shardbacks

Spec: docs/specs/043-arena-lock-shardback-turn.md (approved; 043.1's 70°/s is approve-on-draft). Branch `claude/043-arena-lock`, stacked on `claude/measure-script` (PR #26). One vertical slice per item, tests first, a commit after each.

## Shape of the change

### 1. The arena locks (was 041.18)
- **Data** (`src/data/hollows.ts`, `arena.seal`): the seal's tiles are the forum's way in (the north wall's gap, tiles (10..14, 30)); `leaveTo` is the tile just outside it on the road, (12, 29); `reach` is how close the player's feet box must be to a seal tile for E, px (the altar's 20).
- **Sim** (new `src/sim/arenaLock.ts`, one system):
  - `arenaSealed(state, arena)`: derived, not stored: the arena's boss is alive in the overworld and engaged (fighting: not idle, not walking home). It seals the tick it engages and drops the moment it isn't (a reset, a KO that sends it home, its death).
  - `sealRects(state, roomId)`: the seal's tile rects while sealed, added to `roomBodies` (bodies.ts), so the player's and every enemy's feet stop at it. Shots are not stopped (the spec says feet).
  - `stepSeal(state)`, after enemies act: a body already overlapping the seal as it rises (the player's feet box reaches 4 px into the door row as it wakes the boss; `moveBox` lets a body out of anything it already overlaps) is pushed off it to its own side: into the arena if its feet are in the arena, else out.
  - `stepArenaLock(state, cmd)` in the E chain before the altars: E with the player's feet box within `reach` of a sealed tile leaves: the player stands at `leaveTo`'s centre, and the boss resets as a leash reset does, at once: back at its start (a fresh boss at its home point: full health, idle, facing as it was placed, no statuses), its adds gone (`resetFight`), its bombs gone. With the boss idle the seal drops. Records an `arenaLeaves` event.
- **getState()**: `arenas: [{ id, sealed, seal: [{tx, ty}] }]` in the Hollows summary; the `arenaLeaves` event.
- **Render** (`src/render/HollowsView.ts`, the curtain drawing moved to `src/render/leyCurtain.ts` so both use it): the seal drawn as the Hollows barrier is (the same `HOLLOWS_LOOK.barrier` numbers), lying across the door; it fades out over the barrier's `collapseMs` when it drops. `ui().hollows.seal` reports `'shut' | 'fading' | 'down'` and its alpha.

### 2. Shardbacks turn slower (was 041.19)
- **Data** (`src/data/hollowsEnemies.ts`): `SHARDBACK.shield.turnDegPerSec` 70.
- Tests that hard-coded 2°/tick read the rate from data.

### 3. Measure
- `npm run measure` (Bulwark over seeds 1–20, naive bot, pack clears), before and after; numbers into the spec under "Raised after the build" and the PR. No tuning loop.

## Tests (written first)
- **Vitest sim** `tests/sim/arenaLock.test.ts`:
  - open while the Bulwark idles; sealed the tick it engages; `getState().arenas[0].sealed` follows.
  - the seal blocks the player walking out, and an enemy walking in, while sealed; a player standing on the door row as it wakes is pushed inside.
  - E at the sealed door: the player stands at `leaveTo`, the Bulwark is at its start at full health and idle, its adds and bombs are gone, the seal is down, an `arenaLeaves` event; E away from the door does nothing; E at the door while it's open does nothing.
  - the seal drops on a leash reset path (the player teleported out and the Bulwark walks home) and on its death.
  - no healing source overlaps the arena: every spring pool and every pylon's safe zone (claimed or not) is clear of the arena's bounds.
  - determinism: a fight with a leave, run twice, gives the same summary.
- **Vitest sim** `tests/sim/shardback.test.ts`: the data value 70°/s; the turn-rate tests read the rate; a strafing test: a bot circles a Shardback (health topped up each tick), firing arrows at it from an arrow line, and lands at least one unblocked hit in each of three passes (a pass is a full turn round it).
- **Playwright** `tests/e2e/hollows.spec.ts` (or a new `arenaLock.spec.ts`): `?start=hollows`, walk into the forum, the seal in `getState()` and drawn (`ui().hollows.seal`); E at the door: the player outside, the Bulwark at full health and idle, the seal down.
- **Screenshots** `tests/e2e/arenaLockShots.spec.ts` (REVIEW_SHOTS=1, docs/review/043/): the sealed door, and the reset after leaving.

## Not dictated by the spec (raised after the build)
- The seal stops feet only, not shots (the spec says feet; the Hollows barrier stops shots too).
- The leave is instant (the Bulwark is put back, not walked home), as the spec's "is back at its start".
- No prompt over the sealed door and no seal sound: neither is in the spec.
- A summoned Bulwark resets the same way (034 already says a summoned one heals and waits when the player leaves).
