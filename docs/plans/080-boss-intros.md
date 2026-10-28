# 080 plan: boss intros and phases

Plan for docs/specs/080-boss-intros.md on `claude/080-boss-intros` (InsanityWolfz/Pipeline#97). **Stacked on 074–076**
(`origin/claude/076-enemy-polish`, which holds 074 and 075) and on **073** (`origin/claude/073-offscreen-attacks`),
both merged into this branch first: the spec's sim rules sit on 073's arena rule (`inArenaWithPlayer`) and 076's boss
rigs. 077 and 078 are not merged. A plan file because the spec touches the sim, data, the rigs, five render views,
the test hook, Settings and many tests, and passes 300 lines by far. Pre-approved by Shaun (2026-10-27).

## Findings that shape the plan
- **The whole SimState is the save**, events included (`snapshot` keeps an empty `events`), so the new `bossIntros`
  event changes the save's shape: `SAVE_VERSION` goes up. Main is 22 and 072 (InsanityWolfz/Pipeline#86) claims 23;
  073–079 and 081 stay 22. **080 takes 24.**
- **No new enemy field is needed.** An intro's length is `shortTicks` when the arena's boss is in `bossDefeats` (only
  the altar re-summons a beaten boss), else `fullTicks` (`introLength`, sim). Render reads the same helper.
- **The wake tick is kept whole.** `stepIntros` runs just before `stepEnemies`. Ticks 1–165 of a full intro hold
  `mode: 'intro'`, `modeTicks` 1…165; on the next tick `stepIntros` wakes each enemy in it (`wakeBoss`: 055's `aggro`
  plus each boss's own wake set-up, the Bulwark's lob and the Forgewright's spray cooldowns, now one shared function
  the AIs call too), and its think runs that same tick. So the fight from the intro's end is today's fight from its
  wake, tick for tick. A sim test proves it against a baseline recorded from this branch before the sim change
  (`bossWake.json`: each boss's scripted fight, its attack events' offsets and a state hash per 30 ticks from the wake).
- **Who is in an intro:** the arena's boss (`idle`, posted on the arena's floor, the player inside in its room and not
  dying) and every enemy posted on that floor (`arenaOfPost`, 059) that is `idle` or `return`. Arenas are 055's
  `ARENAS`: the shrine (overworld only), the forum, the hall and the spire (overworld and sandbox).
- **An intro is cut** (each enemy in it back to `idle`, `modeTicks` 0: it never moved) when the player leaves the
  arena (E at the door resets the boss first, 055; its posted pack is cut the next tick), changes room, or is dying
  (a KO). The world reset at the wake rebuilds the rest. A boss in `return` met again never enters an intro.
- **Inactive and untargetable:** `stepEnemies` skips an enemy in `intro` as it skips a rising add (no think, move,
  turn, cooldown, flash, bellows, rods or cold). `immune` (054) gains `mode === 'intro'`; every hit path already asks
  `immune` or `targetable` (arrows, homing, punches, blasts, mines and Bomblets through blasts, arcs, burns, the cinder
  mote's burst and the mite's discharge), and the bellows and rods take hits only through `immune` checks.
- **The player is safe** through one guard at the top of `damagePlayer` (`introShield`): an enemy in `intro` posted in
  the arena the player stands in. Every player hit (swipes, slams, orbs, bombs, pools, strikes) goes through it.
- **073 and 067:** 073.5's arena rule makes arena enemies wake inside regardless of screen; during an intro they
  don't think, so `mayStart` is never asked. 067's Warden rules (the shrine's gate open from the start, the foundry
  after its kill) are untouched: the Warden now wakes as the player enters the shrine (080.9).
- **Render reads `mode === 'intro'` and `modeTicks`;** every beat is placed by intro ticks (pure `introBeat`), so a
  paused game holds and tests sample at fixed ticks. Phaser's own clocks only run the card's tween-free curve, the
  shake (Phaser's `camera.shake`) and particles.
- **Pose names can't hold a hyphen:** anim keys are `<rig>-<pose>-<view>` and `poseOfAnim` splits on `-`. The spec's
  `intro-stir` and friends are named `stir`, `rise`, `beat` and `ready` (with `dormant`), 080.15.
- **Frames:** 5 new poses × 3 views per boss, `rise` 3 frames and `ready` 2: 8 frames a view, 24 a boss, 96 in all,
  plus the Bulwark's roar going from 2 to 3 frames (+3): 954 → 1,053, inside the +12% cap (1,068).
- **Phase looks are overlays**, never baked into every pose: a colour layer (an additive copy of the boss sprite's
  current frame, tinted), small part sprites (`VectorSprite`s in `src/data/art/bossPhaseParts.ts`) placed on the
  current frame's posed geometry with 076's `posedPoint`, glows and particles. A frame → pose lookup is built once
  from `ENEMY_ANIMS` and the rigs.
- **Files near 300 lines** (EnemyView 302, testHook 307, GameScene 303) don't grow: the intro and phases get their own
  views (`BossIntroView`, `BossPhaseView`), wired from a small `bossShow.ts`; the test hook's new fields go through
  `gameUi.ts` and a types file.

## Tests first (each fails before its code)
1. `tests/sim/bossIntro.test.ts`: per boss, the intro starts on the entry tick, lasts 165 ticks, ends in `chase`;
   nothing it owns ticks (cooldowns, heat, blink, behind counter, wave and adds timers, position, angle, facing);
   arrows pass through, a punch, a Burst and a mine miss, bellows and rods take nothing; the event.
2. `tests/sim/bossIntroRules.test.ts`: the Warden's pack enters and leaves with it; the player takes no damage
   (a leftover flood pool under them, a strike, an orb); the altar's 1 s intro; restarts after a door, a KO and wake,
   a leash home; none for a boss in `return`; the outside-wake edge case; leaving and a KO during an intro; 073's arena
   rule (arena enemies held through the intro, then attacking from anywhere in the arena) and 067's (the Warden at the
   open shrine, its kill opening the foundry as before).
3. `tests/sim/bossWake.test.ts` + `bossWake.json` (recorded before the sim change): the fight after the intro matches
   the fight from today's wake, offsets and hashes; the same `getState()` for the same seed and commands.
4. `tests/render/bossIntro.test.ts`: `introBeat` at fixed ticks (full and short), the card's alpha and scale, the bar's
   fill, the pan's easing and per-frame cap, the shake gate (Flashes off, reduced motion, short), the card's layout
   against the bar, the bottom HUD and each boss's box.
5. `tests/render/bossPhase.test.ts`: `bossPhase` for every flag combination, low health with no flag calm.
6. `tests/data/bossArt.test.ts`: every boss has the intro poses in every view, the roar's three frames, the parts
   registered, the frame cap (+12% over 954).
7. Playwright: `bossIntro.spec.ts`, `bossPhases.spec.ts`, `bossMotion.spec.ts` (REVIEW_SHOTS, real time),
   `bossIntroShots.spec.ts` (REVIEW_SHOTS).

## Build order (small commits, `npm run check` green at each)
1. **Plan** (this file) and the spec's pre-approval line.
2. **Baseline:** `bossWake.json` recorded from today's sim (073 merged), with its test.
3. **Sim tests (failing), then the sim:** `src/data/bossIntro.ts`, `EnemyMode` `intro`, `src/sim/bossIntro.ts`
   (`stepIntros`, `introLength`, `introShield`, `introDue`), `src/sim/bossWake.ts` (`wakeBoss`), the `stepEnemies`
   skip, `immune`, the `damagePlayer` guard, the `bossIntros` event, `SAVE_VERSION` 24 and the shape fixture.
4. **Existing tests:** `runIntro` (tests/sim/introKit.ts) in the arena helpers (`forum`, `hall`, `spire`) and the
   tests and bots that wake a boss otherwise (one line each); the measure bots; e2e pages (`forgePage`,
   `conductorPage`, `hollowsSandbox`) step the intro out through a shared `runIntro` in tests/e2e. No rule bends.
5. **Data:** `INTRO_LOOK` (`src/data/art/bossIntro.ts`), `BOSS_PHASE_LOOK` (`src/data/art/bossPhases.ts`),
   `INTRO_SHAKE` (juice), the Settings label, the light source.
6. **Rigs:** the intro poses in three views for the Warden, Bulwark, Forgewright and Conductor; the Bulwark's
   three-frame roar and enraged hunch; the phase parts. Registered in `enemyAnims.ts` and `assets.ts`. Checked on the
   contact sheet at 4×.
7. **Render, pure:** `bossIntro.ts` (beats, card curve, bar fill, pan, shake gate), `bossPhase.ts`; `enemyArt`
   shows `dormant`, the intro strips by intro ticks and the roar by progress.
8. **Render, views:** `BossIntroView` (card on the UI camera, beat sound, particles under `PARTICLE_BUDGET`, the
   shake through `JuiceView.introShake`), `SceneCameras.introLook` (the pan, handing back to the lift), `BossBar`'s
   fill, `BossPhaseView` (colour layers, parts, glows, transitions), the ignition lights; `ui().bossIntro`,
   `ui().bossPhase`, `ui().introShakes`, `ui().cameraShakes`.
9. **e2e, motion strips and review shots;** look at every strip and revise anything frantic.
10. **Docs:** art.md's "Boss intros and phases"; the spec's Results and raised items.

## Risks
- Many existing tests wake a boss; each gets `runIntro`. The CI's full suite catches the e2e ones I miss locally.
- The measure bots' fight lengths grow by 2.75 s; the targets are reported, not tuned (process rule 4).
