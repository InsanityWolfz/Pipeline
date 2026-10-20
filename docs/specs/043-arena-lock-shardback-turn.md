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

## Raised after the build (2026-10-20, for Shaun at playtest)
Built on `claude/043-arena-lock` (plan: docs/plans/043-arena-lock-shardback-turn.md).

**Measured with `npm run measure`** (before = `claude/measure-script`; after = this branch):

| Measurement | Target | Before | After (lock and 70°/s) | Lock only (Shardback at 120°/s) |
| --- | --- | --- | --- | --- |
| Bulwark, decent build, seeds 1–20 | ≥ 15/20 meet all three; ≤ 2 KOs | 17/20, 1 KO (met) | **13/20, 3 KOs (missed)** | 17/20, 1 KO (met) |
| Bulwark, naive bot, seeds 1–5 | KO'd every seed | 5/5 (met) | 5/5, 897 ticks each (met) | 5/5 (met) |
| Ring 1 pack, seeds 1–5 | ≤ 15 s | 2.2–2.9 s (met) | 2.2–2.9 s (met) | same |
| Ring 2 pack, seeds 1–5 | ≤ 15 s | 2.5–4.2 s (met) | 2.5–4.2 s (met) | same |
| Ring 3 pack, seeds 1–5 | 8–18 s, no KO | 10.1–16.3 s (met) | 10.2–17.6 s, no KO, 0 damage (met) | 10.1–16.3 s |

Bulwark after, per seed (s, outcome, share of max health taken): 1 KO 64.2 1.30; 2 KO 59.4 1.41; 3 won 61.9 1.17; 4 won 79.3 0.75; 5 KO 82.5 1.32; 6 won 54.9 0.83 (too fast); 7 won 77.9 1.05; 8 won 70.0 0.66; 9 won 69.3 0.61; 10 won 73.1 0.70; 11 won 64.1 0.26 (too little damage); 12 won 73.6 0.92; 13 won 72.2 0.92; 14 won 67.9 0.92; 15 won 81.2 0.70; 16 won 79.7 0.88; 17 won 82.2 0.22 (too little damage); 18 won 81.9 0.70; 19 won 61.4 0.48; 20 won 57.3 0.31 (too fast, too little damage).

- **The lock itself changes the scripted fight almost not at all** (only seed 18 moved, 79.9 → 83.6 s): the decent bot never used the doorway. The miss comes from the slower Shardback, which is one of the Bulwark's adds: the fight is chaotic, so any change to an add moves every seed. Per process rules 3 and 4 this is recorded, not tuned.
- **043.2 Question for Shaun: the Bulwark target now misses (13/20, 3 KOs against ≥ 15/20 and ≤ 2).** Options: (a) accept it and judge the fight at playtest (proposal: the misses are split between too hard (3 KOs) and too easy (seeds 6, 11, 17, 20), so no single lever fixes it); (b) keep the Bulwark's adds at the old 120°/s turn (a separate add def), which puts the fight back where it was; (c) a follow-up tuning spec.
- **The strafing test** (tests/sim/shardback.test.ts): a player 70 px out (outside its 40 px bash reach), walking round it at the firing pace, lands an unblocked arrow in each of three passes at 70°/s. At 120°/s the same strafe landed none in any pass, at any radius from 70 to 100 px.

**Decided while building (not in the spec; the conservative choice, flagged):**
- **043 overrides 034's "There is no lock-in"** (docs/specs/034-stonefall-hollows.md, under The Bulwark: "Running away is allowed. There is no lock-in."), as Shaun's fix asks. Running away is still allowed: E at the sealed door leaves, at the cost of the fight's progress. The leash reset after 300 ticks outside the arena stays for a player who ends up outside some other way (a KO already sends it home at once). 034 is left unedited.
- **043.3 The seal stops feet only, not shots.** The spec says "feet can't pass it"; the Hollows barrier it looks like also stops every projectile. Shots fly through the seal both ways. Proposal: keep it so (the lock is about walking out to heal).
- **043.4 Leaving is instant.** The spec says the Bulwark "is back at its start at full health"; it's put back at once rather than walking home as a leash reset does. Everything on it resets (health, facing, cooldowns, enrage, stomp counter, statuses), its adds sink and its bombs vanish.
- **043.5 No prompt over the sealed door, and no sound for the seal rising or dropping.** Neither is in the spec. The seal fades out as the barrier collapses when it drops. Proposal: an "E" key prompt over the door while sealed (as 041's playtest notes ask for prompts elsewhere), and the barrier's hum and collapse sounds; Shaun to say.
- **The seal is derived:** it stands exactly while the boss fights (not idle, not walking home). So a KO inside (the Bulwark heads home at once) and its death also drop it. A summoned Bulwark seals the forum too, and E resets it the same way (034 already said a summoned one heals and waits when the player leaves).
- **A body in the doorway as the seal rises** (the player's feet box still reaches into the door row as it wakes the Bulwark) is pushed off it to its own side, into the arena for the player.
- **The leave tile** is (12, 29), on the road just north of the door; E works with the player's feet box within 20 px of a seal tile (the altar's reach).
- **No healing source reaches the arena** already: the Hollows spring's pool (7, 26) and the Cistern Terrace's safe zone are both clear of the forum's bounds; a test now holds it for every spring and every pylon, claimed or not.
