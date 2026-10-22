# 058 plan: the guided tutorial

Spec: docs/specs/058-guided-tutorial.md (approved, proposals 058.1–058.7 as written).

**Status: blocked on 058.5's layout, before any build.** The spec asks for the rimestone ghost line to cross the ley bolt ghost line once, with one underground pair. With the tiles the spec and the data fix, that can't be done: any rimestone line from its port to the frost rune crosses the ley bolt line an even number of times (0 or 2). The proof and two layouts that do work are below, for Shaun to pick. The rest of the plan doesn't depend on the choice.

## Why one crossing can't work

Fixed by the spec and the data:
- The frost rune goes where the removed conduit was, (12,2), facing up: arrows from the assembler behind it (12,3), out its front to the conduit (12,1) and the centre entrance (12,0). A machine takes input from any side but its front, so rimestone can only come in from its left (11,2) or its right (13,2).
- The left entrance (11,0) is fed only from the floor tile below it, (11,1). (11,1)'s other neighbours are the wall (10,1) and the example conduit (12,1), so the ley bolt line has to end (10,2) → (11,2) → (11,1). That takes the frost rune's left side, so rimestone comes in from (13,2).
- The ley bolt line starts at the ley crystal port (1,10) on the west wall and ends at the north wall, touching the example line (columns 11–13, rows 1–5). Together with the example line it cuts the room in two: the north-west corner, and everything else.
- The rimestone port (1,12) is south of the ley crystal port, so it's in "everything else". So is (13,2), east of the example line.

Both ends of the rimestone line are on the same side, so a path between them crosses the ley bolt line 0 or 2 times. Tunnels can't help here: an underground pair can't pass under walls (`tunnelReach` stops at the first non-floor tile), so the row-1 shortcut under the wall at (9,1)–(10,1) is out.

## 058.5: the options

### (a) Recommended: two underground pairs, under the ley bolt line and back
This is closest to Shaun's picture ("an underground belt over the ley crystal port [belt]"). The rimestone line goes under the ley bolt line next to the ley crystal port, up the west side inside the corner the ley line closes off, and then under it again to get out. The player builds two pairs, so they practise it twice.

Ley bolt line (step 14), in build order (facing; `in` is a conduit's input side when it isn't straight):
1. conduit (2,10) right (the port feeds its back)
2. conduit (3,10) right
3. conduit (4,10) up, in left
4. conduits (4,9), (4,8), (4,7), (4,6) up
5. grinder (4,5) up
6. focuser (4,4) up
7. conduit (4,3) up
8. conduit (4,2) right, in down
9. conduits (5,2) … (10,2) right
10. conduit (11,2) up, in left
11. conduit (11,1) up, into the left entrance (11,0)

That's 17 conduits, a grinder and a focuser. They stay off the example line, the stash (22,11), the bench (22,9), the waystone (22,4) and the door (23,8).

Frost rune (step 19), in order:
1. remove the conduit (12,2) (058.6)
2. frost rune (12,2) up
3. conduit (2,12) up, in left (the rimestone port)
4. underground entrance (2,11) up
5. underground exit (2,9) up (under the ley conduit (2,10))
6. conduit (2,8) up
7. conduit (2,7) right, in down
8. underground entrance (3,7) right
9. underground exit (5,7) right (under the ley conduit (4,7))
10. conduits (6,7) … (13,7) right
11. conduit (14,7) up, in left
12. conduits (14,6) … (14,3) up
13. conduit (14,2) left, in down
14. conduit (13,2) left, into the frost rune's right side

That's 18 conduits and two pairs. The conduits next to the west wall's ports, (2,8) and (2,7), have their input side set from the ghost, so a port beside them never feeds them.

### (b) One pair, under a bend where the ley bolt line doubles back
One pair stays, but the ley bolt line has to fold back on itself so that one tunnel passes under two runs side by side. Strictly that is still two crossings, under one pair.
- Ley: (2,10) right, (3,10) right, (4,10) right, (5,10) up in left, (5,9) left in down, (4,9) left, (3,9) up in right, then up column 3 (grinder (3,6), focuser (3,5)) to (3,2), right along row 2 to (10,2), (11,2) up, (11,1) up.
- Rimestone: (2,12) right in left, (3,12) right, (4,12) up in left, underground entrance (4,11) up, exit (4,8) up (under (4,10) and (4,9)), then east along row 7 to column 14, up to row 2, left into (13,2).
- Downside: the ley line's U-bend looks deliberate and odd for a "brain dead" first line.

(A third way, with no crossing, would drop step 19's underground lesson, so it isn't offered.)

## The rest of the slice (not blocked)

### Tests first (Vitest, tests/sim)
- `tutorialChain.test.ts`: OBJECTIVES' texts in the spec's order (058.1's wording); none of the removed texts; no frontier line (`objectiveLine` null once all are done).
- The refill step (12) shows only if the line has run dry when the player reaches the foundry after fast-travelling; otherwise it's skipped and step 13 is current.
- "Leave the foundry" is done the first tick outside the foundry; step 16 is current at once.
- The talent cut-in: the first point makes "Press T to spend a talent point" current; spending one finishes it, and the interrupted goal comes back. During steps 14 and 19 it waits until that step is done (058.4).
- `buildLock.test.ts`: from the first foundry visit until step 19 is done, `place` and `pickUp` are refused (new `PlaceFail` reasons `tutorial` and `ghost`), except the next ghost piece on its tile and facing during steps 14 and 19, and the remove target during step 19 (058.6). Hoppers, crates, the stash, the bench and the intake still work. The lock lifts the tick step 19 is done.
- Old saves: a save with `entrance-2` already restored builds freely and keeps its goals; earlier ones get the new steps.
- During the tutorial (until step 13 is done) only the left cap's diagram takes the warden core.
- Each guided step's ghosts form a working line: a sim run that places them in order makes ley bolts reach the left entrance, and frost arrows reach the centre entrance (data test on the ghost layout).

### Sim (src/sim)
- `objectives.ts`: new checks `equipped`, `travelled`, `talentSpent`, `outside`, and the guided builds' `entranceFed`/`machineMade`; the cut-in goal (`cutIn: 'talent'`); `waitsFor` for the refill step changes to "dry on arrival". No frontier line.
- New `guided.ts` (one system): the current guided step, the next ghost piece, whether a place/pickUp is allowed; `tutorialLocked(state)`.
- `placement.ts` / `build.ts`: ask `guided.ts` before placing or picking up; a guided conduit takes the ghost's input side.
- `research.ts`: while the tutorial runs, the warden-core node restores only at the left cap.
- `state.ts` / `save.ts`: the new progress fields (talent spent, travelled, equipped, build lock lifted); `SAVE_VERSION` 11 → 12 with no migration (process "Saves"). The "save past entrance-2 builds freely" rule then applies only to saves the build can read (the spec notes this).
- `summary.ts`: the guided step's next piece and its ghosts in `getState()` for the e2e bot.

### Data (src/data)
- `objectives.ts`: the new chain and texts.
- New `guidedBuilds.ts`: steps 14 and 19's ghost pieces (piece, tile, facing, input side, order), the remove target (12,2), the lock's span, the hints ("Build on the glowing outline", "Not yet", "Unlocks as the tutorial goes on", "Right click to remove"), and the sub-line wording (058.2).
- `hudLayout.ts`: the goal panel's foundry position under the foundry minimap. `targets.ts`: the waypoint arrow's clearance over an E/C/B prompt.
- The pylon menu text "Send inventory to stash"; the unlock banner's text ("Unlocked <name>", joined) and timing next to the area banners.

### Render (src/render)
- Ghost pieces in the foundry (a translucent glowing outline per remaining ghost, the next one brighter), the build-bar arrow on the next piece, locked cells greyed with their hover line, the refused-placement hint.
- The bench screen's two arrows (the identified piece, then its equip control).
- The step-19 remove arrow with "Right click to remove".
- The goal panel and waypoint arrows hidden for good after step 25; the minimap stays.
- The unlock banner from crafting unlock events.

### Playwright
- Rewrite `tests/e2e/tutorial.spec.ts`: the bot plays from New game to the end, building both guided lines on their ghosts.
- The bench arrows, the build-bar arrow, the unlock banner (in the tutorial spec or a small 058 spec).
- `tutorialShots.spec.ts` (REVIEW_SHOTS=1) into docs/review/058: the spec's seven shots.
- Older e2e that walk the old chain (foundryTutorial, foundryFlow, guidance, playtestFixes2, research, tunnels and others) get their staging updated, with their images left as on main.
