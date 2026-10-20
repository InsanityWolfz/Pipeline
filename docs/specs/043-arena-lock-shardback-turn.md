# 043: Arena lock and slower Shardbacks
status: approved

Moved out of 041 on 2026-10-20 as part of the process reset Shaun approved in chat ("approve the reset"): new playtest notes become new specs instead of growing a spec that is still open. These were 041.18 and 041.19, playtest notes 17–18 in docs/brainstorm/2026-10-20-playtest-notes.md. The text below is unchanged from 041.

## Goal
The Bulwark fight can't be cheesed by healing mid-fight, and a Shardback leaves a window for a flanking shot.

## Design references
- docs/specs/034-stonefall-hollows.md: the Sunken Forum, the Bulwark, the Hollows barrier, the shield rule.
- docs/specs/035-hollows-enemies.md: the Shardback.
- docs/specs/030-healing.md: pylon safe zones and Ley Springs.
- docs/specs/041-balance.md: the Bulwark fight targets (041.7) and the pack clears (041.8, 041.13).

## Acceptance criteria

### The arena locks (was 041.18)
Shaun's words: "**Exploit: healing during the Bulwark fight.** Players fought him where a pylon's safe zone (or a spring) heals them. Shaun's fix: when the fight starts, the arena locks. Pressing E on the locking door leaves, but the fight's progress resets (the Bulwark heals)."
- [ ] When the Bulwark engages, the forum's way in seals: a ley barrier across the door, in the Hollows barrier's look. Feet can't pass it, the player's or an enemy's.
- [ ] E at the sealed door leaves: the player stands just outside the door, and the fight resets as a leash reset does: the Bulwark is back at its start at full health, its adds and any wave or bombs of its are gone. The seal then drops.
- [ ] No healing source inside the arena: no spring pool and no claimable pylon's safe zone overlaps it (checked by a test).
- [ ] The Bulwark fight is re-measured with the lock (seeds 1–20) and the numbers recorded.

### Shardbacks turn slower (was 041.19)
Shaun's words: "**Shardbacks turn too fast** (120°/s today). They need a window, even just enough for one projectile to land."
- [ ] The Shardback's shield turns at 70°/s (proposal, see open questions).
- [ ] A test shows a player strafing round a Shardback lands at least one unblocked hit each pass.
- [ ] Pack clears are re-measured and recorded.

## Data changes
- `src/data/hollowsEnemies.ts`: `SHARDBACK.shield.turnDegPerSec` 70.
- `src/data/hollows.ts`: the forum door's seal tiles.

## Out of scope
- Any other Bulwark tuning, and the Pylon Warden (it stays as it is).
- Other enemies' turn speeds.

## Test plan
- Vitest (sim): the seal blocks feet while engaged and drops on reset; E at the seal leaves and resets the fight; no healing source overlaps the arena; the strafing test; determinism.
- Playwright: with `?start=hollows`, engage the Bulwark and see the seal in `getState()`; E at the door resets the fight.
- Screenshots: the sealed door.

## Open questions
- **043.1 (was 041.19) Shardback turn speed.** Proposal: 70°/s (approve-on-draft, as the rest of 041's proposals). Shaun may change it at playtest.
