# 073 plan: enemies only attack on screen

Spec: docs/specs/073-offscreen-attacks.md. Plan pre-approved by Shaun in chat, 2026-10-27.

One rule in the sim, read by every enemy AI. No data changes (every range stays), no render changes (nothing new is
drawn), no new state, so SAVE_VERSION stays.

## The rule
- `mayStart(state, e)` in src/sim/aiCommon.ts, next to `inAggroBox`: true while the enemy is in the player's room and
  either on screen (`inAggroBox`) or inside a boss arena with the player (073.5).
- `inArenaWithPlayer(state, e)` in src/sim/arenaWait.ts, next to `arenaWaits`: the enemy's feet on the floor of an
  arena in `ARENAS` (src/data/arenas.ts: the shrine, forum, Anvil Hall, Crown Spire) in a room it stands in, and the
  player inside that same arena. Bosses, adds and posted enemies alike: no id list, no new flag.
- Each AI adds `mayStart` to the condition that starts its wind-up, beside its cooldown check, so a held enemy takes
  the branch it takes while its cooldown runs (073.2). Its cooldown stays ready. Nothing else in the AI changes: wake,
  leash, ranges, bands and wind-ups already under way are untouched (073.4).
- The three region bosses (Bulwark, Forgewright, Conductor) fight only with the player inside their arena, so their
  AIs stay as they are; the Warden's slam reads the rule like every other kind (and passes in its shrine).

## Tests first (tests/sim/offscreenAttacks.test.ts, tests/sim/offscreenHeld.test.ts)
- The rule: `mayStart` on screen, off screen, in another room; inside each arena with the player in (true from
  outside the box), with the player outside it (false off screen).
- The long-reach seven (Charger, Burrower, Sniper, bellows hound, kiln-tender, thunderhawk, storm sentinel), awake,
  cooldown ready, other start conditions met, placed about 200-240 px above the player: no wind-up over a full
  cooldown, cooldown still 0; then leashed after `leashGraceTicks` (the Sniper within 320 px stays engaged and
  holds: 073.6); the player moved so it's on screen, it winds up on the next tick.
- The short-reach nine (Husk, slag whelp, Wisp, Warden, Shardback, cinder mote, slag golem, static mite, gale ram):
  a data test that each start range is inside the view's half-height; one staged start on screen each.
- The grace: a Charger pushed off screen mid-chase keeps chasing, starts nothing, heads home at 60 ticks.
- Mid-wind-up: a Sniper and a sentinel that leave the screen during a wind-up started on screen still fire; a Wisp
  orb and a Sniper bolt in flight keep flying and hit with their shooter off screen.
- The exemption: in the sandbox's forum with the player inside, a Charger and a Sniper posted there off screen still
  start; the same enemies outside the arena don't.
- The invariant sweep: packs of each region (tests/sim/packBot.ts, tests/sim/stormPackBot.ts, tests/sim/tierPacks.ts)
  over several seeds; every tick, any enemy that enters `windup` outside a boss arena is on screen.
- Existing tests that stage an attack from off screen are moved on screen (the rule they test is unchanged).

## Code (small commits)
1. aiCommon + arenaWait: the rule. Commit with its tests.
2. The long-reach seven wired. Commit.
3. The short-reach nine and the Warden wired; the sweep. Commit.

## e2e (tests/e2e/offscreenAttacks.spec.ts)
In the sandbox: a Sniper about 240 px above the player on a clear line, cooldown ready, polled through `getState()`:
no `windup` and no bolt while off screen; the player steps up until it's on screen; it winds up and fires.

## Measure
`npm run measure` before and after for the Hollows, Emberworks and Stormcrown pack fights; numbers reported in the
spec's Results, never asserted.

## Not in this plan
Off-screen arrows (071), any range or leash change, new movement for held enemies, balance retuning.
