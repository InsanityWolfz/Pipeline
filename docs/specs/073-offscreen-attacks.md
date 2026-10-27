# 073: Enemies only attack on screen
status: draft

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
- 071's review found the camera eases up to 96 px above the player while a boss fights (`BOSS_LOOK.max`, src/data/arenaAssets.ts). Bosses are exempt (below), so the sim box stays. The one gap is an arena add standing below the player in a boss fight: see decision 073.3.

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
- [ ] **No attack starts off screen.** Every enemy except an exempt boss starts a wind-up only while it is on screen (above). This covers every kind in the survey, the kiln-tender's heal beam included (073.1).
- [ ] **Held, it acts as if its cooldown weren't ready.** An enemy whose attack would start but is off screen does what it already does while its cooldown runs: the Sniper keeps to cover or its distance, the sentinel and kiln-tender keep their band, the hawk circles, the Charger and hound stand off, the Burrower keeps tunnelling. Its cooldown stays ready, so it can start on the first tick it is back on screen. No new movement (073.2).
- [ ] **Ranges are kept.** No reach, trigger range, wake range or band changes. A Sniper or sentinel at the screen's side edge (up to 320 px across) still fires.
- [ ] **The leash grace stays.** A chasing enemy off screen keeps chasing for its `leashGraceTicks`, starts nothing in that time, then heads home and heals as now. A small camera wobble doesn't reset a fight.
- [ ] **A wind-up started on screen completes** if the enemy leaves the screen during it, including the Sniper's tracking and the dash, dive or charge that follows (073.4).
- [ ] **Shots in flight keep flying** when their shooter goes off screen: Wisp orbs, Sniper bolts, sentinel strike circles already called, hound trails and fire pools already laid.
- [ ] **Bosses are exempt inside their arenas.** The Pylon Warden, Bulwark, Forgewright and Conductor attack as now while the player is inside their arena. Their adds and the enemies posted in their arenas are not exempt (073.5).
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
  - The exemption: a boss fighting inside its arena still starts an attack from outside the box (the Conductor's storm call or the Bulwark's lob); a Bulwark add (Charger) in the same arena off screen does not.
  - An invariant sweep: packs of every region over several seeds with a scripted bot (tests/sim/packBot.ts); no non-exempt wind-up ever starts with its enemy off screen.
- **Playwright (e2e):** in the sandbox, a Sniper just off screen (about 240 px above the player, a clear line, cooldown ready) stays out of `windup` and fires no bolt while off screen, polling `getState()`; the player steps up until it is on screen, and it winds up and fires.
- No review shots: nothing new is drawn.

## Decisions in this draft
For Shaun's OK; each is the least surprising choice.
- **073.1 Every wind-up counts, the kiln-tender's heal beam too.** One rule, no list to keep: an off-screen tender can't heal its pack either.
- **073.2 Held enemies don't move in.** One that can't start off screen acts as if its cooldown weren't ready. So a sentinel or tender whose band puts it above or below you holds its fire and, past the grace, walks home and heals; a Charger in range above you stands off. Stepping toward it brings it on screen. Making held enemies walk onto the screen would be new behaviour, left out.
- **073.3 "On screen" is the sim's box, also in boss fights.** The boss camera lift (up to 96 px) shows more above the player and less below. An add up to 96 px inside the box's bottom edge could start unseen during a boss fight; only the Bulwark has adds, and of those only its Charger reaches that far. Kept as a known gap rather than teaching the sim the render's camera.
- **073.4 A wind-up you saw start completes.** Like a shot in flight (answer 3): you saw it coming, so it lands even if the enemy slips off screen.
- **073.5 Only the boss is exempt.** The Bulwark's adds, the Warden's Wisps and Husks, and anything posted in an arena follow the rule like anywhere else.
- **073.6 The Sniper keeps its long sight.** Ranges are kept: it still wakes from 320 px and stays engaged off screen within 320 px (it can't leash there, as now), taking cover and lining up, but holds its shot until it is on screen. The alternative is to leash it after the grace like everything else, which would undo its 320 px wake.

## Open questions
None.
