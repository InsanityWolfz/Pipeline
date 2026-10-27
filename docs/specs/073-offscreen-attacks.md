# 073: Enemies only attack on screen
status: approved

Approved by Shaun in chat, 2026-10-27 ("approve 073 and I OK its decisions"), with 073.5 changed: anything inside a boss arena follows the boss rules. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. The plan: docs/plans/073-offscreen-attacks.md.

Drafted from Shaun's call on 071 and his interview answers, 2026-10-27 (docs/brainstorm/2026-10-27-offscreen-attacks.md). It replaces 071 (off-screen threat arrows, InsanityWolfz/Pipeline#85), which was closed unmerged.

## Goal
Nothing hits you from somewhere you couldn't see. An enemy starts an attack only while it is on screen; ranges, wake rules and the 1 s leash grace stay as they are.

## Design references
- docs/design.md, "Combat": "Every enemy still telegraphs attacks you read and dodge".
- Shaun on 071, 2026-10-27: "if something can target you out of range of you seeing it then its range is too long, anything off the screen should de aggro".
- Specs 017 (anything on screen wakes; the leash), 045 (Wisps wake on screen), 035 (the Sniper's 320 px sight), 059 (arena enemies wait inside), 061 and 065 (the long-reach Emberworks and Stormcrown enemies), 071 (the dropped arrows and its review's camera note).
- docs/brainstorm/2026-10-26-playtest-calls.md: enemies going home and healing once you leave the screen stays.

## What "on screen" means
The sim's existing rule, `inAggroBox` in src/sim/aiCommon.ts: the enemy's feet inside the 640 × 360 view (`VIEW_WIDTH` × `VIEW_HEIGHT`) centred on the player's feet, in the room on screen. It is the same test that wakes enemies and counts their leash grace, so one rule decides both.
- Away from a boss fight the camera is locked on the player (042), and where it clamps at a room's edge it shows more than this box, never less. So the sim's box never calls an unseen enemy "on screen".
- 071's review found the camera eases up to 96 px above the player while a boss fights (`BOSS_LOOK.max`, src/data/arenaAssets.ts). Anything inside a boss arena is exempt (below), so the sim box stays and the lift leaves no gap (073.3).

## Survey: every enemy's wake, leash and reach
View half-sizes: 320 px across, 180 px up and down. "Off screen today" says whether the enemy can start its attack outside that box under today's rules.

| Enemy | Wakes | Leash | Starts its attack when | Off screen today |
| --- | --- | --- | --- | --- |
| Husk | on screen | 60 ticks off screen | player within 28 px (swipe reach 40) | no |
| Slag whelp (061) | on screen | 60 | within 20 px (reach 24) | no |
| Wisp (009, 045) | on screen | 60 | within 160 px (`aggroRange`); its orb flies 240 px | no: 160 < 180, so it is always on screen as it starts. Its orb can fly on off screen (in flight, kept). |
| Pylon Warden (009) | within 200 px, once the player is inside the shrine (059) | 120 | within 56 px (slam radius 64) | no; a boss in its arena, exempt |
| Charger (035) | on screen | 60 | within 200 px along clear ground (lane 220) | **yes**: 180–200 px above or below, or in the grace |
| Burrower (035) | on screen | 60 | its ripple within 12 px of the player, or after 180 ticks tunnelling (it locks where it is) | **yes**: a long tunnel can lock off screen, or in the grace |
| Shardback (035) | on screen | 60 | within 30 px (bash reach 40) | no |
| Sniper (035) | on screen or within 320 px (`aggroRange`) | 60, but never counted off screen while within 320 px | cooldown ready and a clear shot, at any distance it is engaged (keeps 200 px; bolt flies 400) | **yes**: 180–320 px above or below, and past that in the grace |
| Cinder mote (061) | on screen | 60 | within 40 px (radius 40) | no |
| Bellows hound (061) | on screen | 60 | within 220 px along clear ground (lane 200) | **yes**: 180–220 px above or below, or in the grace |
| Slag golem (061) | on screen | 60 | within 48 px (circle 40 px, 32 px ahead) | no |
| Kiln-tender (061) | on screen | 60 | keeps 160–240 px from the player; beams a hurt packmate within 200 px (a heal, not a hit) | **yes**: 180–240 px above or below |
| Thunderhawk (065) | on screen, not past a shut barrier | 60 | within 260 px (`dive.distance`); it orbits at 120–200 px | **yes**: 180–260 px above or below, or in the grace |
| Static mite (065) | on screen | 60 | within 16 px (radius 20) | no |
| Storm sentinel (065) | on screen | 60 | within 300 px along a clear line (keeps 200–300 px); the circle lands on the player's feet | **yes**: anywhere in its band above or below the player |
| Gale ram (065) | on screen | 60 | within 80 px (cone reach 96) | no |
| Bulwark (034) | player inside its arena | by its arena | pound 72 px, stomp 160, lobs across the arena | exempt (boss) |
| Forgewright (060) | player inside its arena | by its arena | slam 80 px, ember spray to 360 px | exempt (boss) |
| Conductor (064) | player inside its arena | by its arena | lash 360 px; storm call anywhere in its hall | exempt (boss) |

So the rule changes play for seven kinds: the Charger, Burrower, Sniper, bellows hound, kiln-tender, thunderhawk and storm sentinel. For the other nine it pins down what already holds. Champions (032) follow their kind. The leash grace is `leashGraceTicks`: 60 ticks (1 s) for every `ScreenLeashed` enemy except the Warden's 120 (src/data/enemies.ts, src/data/enemyBase.ts and each region's enemy file).

## Acceptance criteria
- [ ] **No attack starts off screen.** Every enemy outside a boss arena starts a wind-up only while it is on screen (above). This covers every kind in the survey, the kiln-tender's heal beam included (073.1).
- [ ] **Held, it acts as if its cooldown weren't ready.** An enemy whose attack would start but is off screen does what it already does while its cooldown runs: the Sniper keeps to cover or its distance, the sentinel and kiln-tender keep their band, the hawk circles, the Charger and hound stand off, the Burrower keeps tunnelling. Its cooldown stays ready, so it can start on the first tick it is back on screen. No new movement (073.2).
- [ ] **Ranges are kept.** No reach, trigger range, wake range or band changes. A Sniper or sentinel at the screen's side edge (up to 320 px across) still fires.
- [ ] **The leash grace stays.** A chasing enemy off screen keeps chasing for its `leashGraceTicks`, starts nothing in that time, then heads home and heals as now. A small camera wobble doesn't reset a fight.
- [ ] **A wind-up started on screen completes** if the enemy leaves the screen during it, including the Sniper's tracking and the dash, dive or charge that follows (073.4).
- [ ] **Shots in flight keep flying** when their shooter goes off screen: Wisp orbs, Sniper bolts, sentinel strike circles already called, hound trails and fire pools already laid.
- [ ] **Anything inside a boss arena is exempt.** The Pylon Warden, Bulwark, Forgewright and Conductor, their adds and every enemy posted in their arenas attack as now while the player is inside that arena (073.5).
- [ ] The on-screen check is one shared sim helper next to `inAggroBox` (src/sim/aiCommon.ts), read by every enemy AI; the sim stays deterministic and SAVE_VERSION doesn't change (no new state).

## Data changes
None expected. Every range stays. If the build finds a flag is needed for the exemption, it is data on the def (e.g. the bosses' existing `boss`), not a hardcoded id list.

## Out of scope
- 071's off-screen threat arrows and its setting (dropped with 071).
- Changing any range, wake rule, band or leash grace.
- New movement so held enemies step onto the screen (073.2).
- Balance retuning; `npm run measure` is run and reported only.

## Test plan
- **Sim tests (Vitest), one per attacking kind,** staged in a test room with the enemy awake, its cooldown ready and its other start conditions met:
  - The long-reach seven (Charger, Burrower, Sniper, bellows hound, kiln-tender, thunderhawk, storm sentinel): placed just off screen within its reach (e.g. 200–240 px above the player), it starts no wind-up over its full cooldown and then leashes after its grace (the Sniper within 320 px stays engaged: 073.6); moved on screen, it starts on the next tick.
  - The short-reach nine (Husk, slag whelp, Wisp, Pylon Warden, Shardback, cinder mote, slag golem, static mite, gale ram): a data test that each start range lies inside the view's half-height, so none can start off screen; and one staged start on screen each, so the helper is wired in.
  - The grace: a Charger pushed just off screen mid-chase keeps chasing, starts nothing, and heads home at 60 ticks.
  - Mid-wind-up: a Sniper and a sentinel that leave the screen during a wind-up started on screen still fire; a Wisp orb and a Sniper bolt in flight keep flying and hit when their shooter is off screen.
  - The exemption: anything inside a boss arena with the player still starts an attack from outside the box: a boss (the Conductor's storm call or the Bulwark's lob), a Bulwark add (Charger) and an enemy posted there.
  - An invariant sweep: packs of every region over several seeds with a scripted bot (tests/sim/packBot.ts); outside a boss arena no wind-up ever starts with its enemy off screen.
- **Playwright (e2e):** in the sandbox, a Sniper just off screen (about 240 px above the player, a clear line, cooldown ready) stays out of `windup` and fires no bolt while off screen, polling `getState()`; the player steps up until it is on screen, and it winds up and fires.
- No review shots: nothing new is drawn.

## Decisions in this draft
For Shaun's OK; each is the least surprising choice.
- **073.1 Every wind-up counts, the kiln-tender's heal beam too.** One rule, no list to keep: an off-screen tender can't heal its pack either.
- **073.2 Held enemies don't move in.** One that can't start off screen acts as if its cooldown weren't ready. So a sentinel or tender whose band puts it above or below you holds its fire and, past the grace, walks home and heals; a Charger in range above you stands off. Stepping toward it brings it on screen. Making held enemies walk onto the screen would be new behaviour, left out.
- **073.3 "On screen" is the sim's box.** The boss camera lift (up to 96 px) no longer matters: inside a boss arena nothing follows this rule (073.5).
- **073.4 A wind-up you saw start completes.** Like a shot in flight (answer 3): you saw it coming, so it lands even if the enemy slips off screen.
- **073.5 Boss arenas are exempt, adds included (changed by Shaun, 2026-10-27).** "The boss adds are immune to the max range stuff. If an enemy is in the boss arena then the boss rules apply to its attack and aggro." Any enemy inside a boss arena (the Bulwark's adds, the Warden's Wisps and Husks, anything posted there) attacks and aggros by the arena's rules, as the boss does.
- **073.6 The Sniper keeps its long sight.** Ranges are kept: it still wakes from 320 px and stays engaged off screen within 320 px (it can't leash there, as now), taking cover and lining up, but holds its shot until it is on screen. The alternative is to leash it after the grace like everything else, which would undo its 320 px wake.

## Open questions
None.

## Raised after the build
Build-time choices the spec didn't decide; the least surprising reading is built. Items marked **Shaun** need his call.
- **073.7 Aggro inside a boss arena (Shaun).** 073.5's "the boss rules apply to its attack and aggro" is built for the attack: anything inside a boss arena with the player starts its attacks from anywhere in it. Its aggro is left as now (059's wait for the door, waking on sight, the 1 s leash), since the spec keeps every wake rule and leash and 073 changes no enemy's aggro anywhere. The arenas are up to 11 tiles tall (352 px), so a Wisp in the shrine's far corner can still sit unwoken, or leash after a second off screen, while the Warden fights. The alternative is for arena enemies to wake as the player comes through the door and never leash while they're inside, as the Bulwark does: a wake-rule change. Proposal: keep as built unless he wants that.
- **073.8 "Inside a boss arena".** The enemy's feet on an arena's floor (`ARENAS`: the shrine, the Sunken Forum, the Anvil Hall, the Crown Spire, in each room they stand in, the sandbox's too), and the player inside the same arena. It doesn't ask whether the boss lives, so the shrine's posted Wisps and Husks keep the exemption after the Warden falls. An enemy outside an arena's walls follows the screen's rule even with the player inside.
- **073.9 The region bosses' own AIs.** The Bulwark, Forgewright and Conductor fight only with the player inside their arena, where the rule always passes, so their AIs don't read it; the Warden's slam does, like every other kind. No behaviour differs.
- **073.10 Held enemies that move.** As 073.2: a held enemy does what it does while its cooldown runs, and some of those moves bring it on screen by themselves: the thunderhawk's orbit (160 px) circles it into view, the Burrower tunnels on toward the player, and the Sniper may walk to cover. Each then starts on the tick it is on screen. The Charger, hound, sentinel and kiln-tender hold where they are and leash after the grace.
- **073.11 Saves.** No new state: `SAVE_VERSION` stays at main's 22.

## Results (build)
- Plan: docs/plans/073-offscreen-attacks.md, followed as written.
- The rule: `mayStart` in src/sim/aiCommon.ts (in the player's room and inside the aggro box, or inside a boss arena with the player: `inArenaWithPlayer`, src/sim/arenaWait.ts), read beside the cooldown check in each of the 15 non-boss AIs and the Warden's. No data changes, no render changes.
- Criteria: all met.
  - No attack starts off screen; held as if its cooldown weren't ready: tests/sim/offscreenAttacks.test.ts (six of the long-reach seven staged 195–240 px below the player in reach start nothing on their first tick, their cooldown still 0, and start the tick after the player steps to bring them on screen; the four that hold start nothing through their grace and after it; the hawk and Sniper never start off screen over 600 ticks; the Burrower past its tunnelling time tunnels on and locks the tick after it comes on screen).
  - Ranges kept: no range, band or wake rule changed; the rule's test keeps a start at the screen's side edge (320 px across).
  - The leash grace: a Charger pushed off screen mid-chase chases on for 59 ticks, starting nothing, and heads home on the 60th. The Sniper within 320 px stays engaged off screen and holds its shot (073.6).
  - Wind-ups and shots in flight: tests/sim/offscreenWindups.test.ts (a Sniper's target stepping 250 px off mid-tracking still draws its bolt; a sentinel carried off screen mid-call still strikes; a Wisp orb and a Sniper bolt hit with their shooter 400 px off). The short-reach nine: each start range is under the view's half-height (data), and each starts on screen.
  - The arena exemption: tests/sim/offscreenArenas.test.ts (in the forum with the player inside, a Bulwark add Charger and a posted Sniper 192 px off start; the Bulwark lobs from off screen); the rule's test covers an enemy outside the walls and a player outside the arena.
  - The invariant sweep: tests/sim/offscreenSweep.test.ts, every region's pack fights (the meadow's rings 1 and 2, the Hollows, the Emberworks, the Stormcrown), seeds 1–3, the bot keeping 150 and 260 px: no wind-up starts off screen (with the rule switched off, the Sniper, hound and hawk are caught).
  - One sim test changed its staging: sniper.test.ts's rock-top shot moves the Sniper a tile nearer (184 px off screen to 152 px on screen); what it tests is unchanged.
- e2e: tests/e2e/offscreenAttacks.spec.ts, in the field: a Sniper 240 px below holds through 300 ticks (no wind-up off screen, no bolt), then winds up and fires once the player walks it on screen.
- Checks: `npm run check` green (2,653 unit tests). Locally on port 5337, one file at a time: offscreenAttacks (1), hollowsEnemies (4), emberworksEnemies (4), stormcrownEnemies (4), enemies (6); the enemies' shot specs with REVIEW_SHOTS=1 (old shots not kept): hollowsEnemiesShots (7) and emberworksEnemiesShots (8) passed; stormcrownEnemiesShots' mite-discharge shot fails, the same on main (unrelated to 073). The full suite runs in CI. No review shots: nothing new is drawn.
- `npm run measure` (packs, emberPacks, stormPacks, tiers, bulwark), branch against main: every number the same except the ring 3 steel-vs-stone stone mean, 15.6 s on main and 15.3 s here. Rings 1 and 2: 5/5 in band (1.6–3 s, 2.7–3.5 s). Ring 3: 4/5 in 8–18 s (12.1–18.6 s), 0 KO. Ring 4 Fire: 20/20 cleared in 6.4–9.5 s, 0/20 in 15–30 s, 0 KO. Ring 5 Lightning: 20/20 cleared, 17.2–29.1 s at stone and 9.9–19.7 s at steel, 0 KO. Bulwark decent build: won in 18.4 s on every seed, 0/20 meeting all three targets, the same as main; the naive bot KO'd on 5/5. Recorded, not tuned.
