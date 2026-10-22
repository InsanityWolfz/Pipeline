# 058 plan: the guided tutorial

Spec: docs/specs/058-guided-tutorial.md (approved; proposals 058.1–058.7 as written, 058.5 as Shaun decided it on 2026-10-22: the ley bolt line goes into the right entrance).

## Why the first layout was dropped

Into the left entrance (11,0), the ley bolt line had to end (10,2) → (11,2) → (11,1); with the example line (columns 11–13, rows 1–5) it fenced off the room's north-west corner, so a rimestone line from its port (1,12) to the frost rune crossed it 0 or 2 times, never once. Shaun chose the right entrance instead (058.5). Into (13,0), fed from (13,1), the ley bolt line runs east south of the example line and up its east side, and the rimestone line, going north from its port, crosses it once.

## 058.5: the ghost layouts

Room facts used: the foundry is 24×16; row 1 is floor on columns 3–8 and 11–20, row 2 on 2–21, rows 3–12 on 1–22. The west wall's ports (column 1) feed the tile east of them: ley-iron (1,3), wood (1,4), stone (1,6), fiber (1,8), ley crystal (1,10), resin (1,11), rimestone (1,12). A conduit's `in` is the side it takes from when it isn't its back. Machines take from any side but their front and hand out their front. Fixed points kept clear: the example line (11–13, 1–5), the stash (22,11), the bench (22,9), the waystone (22,4), the door (23,8) and column 2 beside the other ports (only (2,10) and (2,12), the two lines' own first tiles, are used).

### Step 14: ley bolts into the right entrance

In build order (23 conduits, a grinder and a focuser: 25 pieces):
1. conduit (2,10) right (the ley crystal port feeds its back)
2. conduit (3,10) right
3. grinder (4,10) right
4. focuser (5,10) right
5. conduits (6,10) … (14,10) right (9)
6. conduit (15,10) up, in left
7. conduits (15,9) … (15,2) up (8)
8. conduit (15,1) left, in down
9. conduit (14,1) left
10. conduit (13,1) up, in right: into the right entrance (13,0)

Row 10 is four rows below the example line's hoppers, and column 15 one column east of it, so the line never touches it. Row 1 east of the intake is floor to column 20.

### Step 19: the frost rune and the rimestone line

In order (a removal, the frost rune, 17 conduits and one underground pair: 21 steps):
1. remove the conduit (12,2) (058.6: right click, into the inventory)
2. frost rune (12,2) up: arrows from the assembler behind it, frost arrows out its front into (12,1) and the centre entrance
3. conduit (2,12) right (the rimestone port feeds its back)
4. conduit (3,12) up, in left
5. underground entrance (3,11) up
6. underground exit (3,9) up: under the ley line's conduit (3,10), right beside the ley crystal port (Shaun's "underground belt over the ley crystal port belt"); reach 1 tile, within TUNNEL_REACH
7. conduits (3,8) … (3,3) up (6)
8. conduit (3,2) right, in down
9. conduits (4,2) … (10,2) right (7)
10. conduit (11,2) right: into the frost rune's left side

Column 3 is a tile away from the west wall's ports, so no port feeds it. (11,2) sits over the assembler's west tile, which hands out only its middle front, (12,2). Crossing count: the rimestone line meets the ley line once, at (3,10), under the pair.

A data test checks both layouts: every ghost tile is floor, none overlaps another ghost, the example line, a fixture or the tile in front of a port other than its own line's start; and a sim run that places them in order makes ley bolts reach the right entrance and frost arrows reach the centre one.

## Tests first (Vitest, tests/sim)
- `tutorialChain.test.ts`: OBJECTIVES' texts in the spec's order (058.1's wording); none of the removed texts; the line is null (no frontier line) once the chain is done.
- The refill step shows only if the line has run dry when the player arrives by fast travel; otherwise it's skipped.
- "Leave the foundry" is done the first tick outside the foundry once it's current (never before); step 16 is current at once.
- The talent cut-in: the first point makes "Press T to spend a talent point" current; spending one finishes it and the interrupted goal comes back. While step 14 or 19 is current it waits (058.4).
- `guided.test.ts`: in a guided game, from the first foundry visit until step 19 is done, `place` and `pickUp` are refused (new `PlaceFail` reasons `tutorial` and `ghost`), except the next ghost piece on its tile and facing during steps 14 and 19, and the remove target during step 19. Hoppers, crates, the stash, the bench and the intake still work. The lock lifts the tick step 19 is done. Non-guided starts (`?playtest`, the sim's default, the sandbox) never lock.
- During the tutorial the Warden core's diagram shows only on the right cap.
- The ghost layouts (above).

## Sim (src/sim)
- `objectives.ts`: new checks `equipped`, `travelled`, `talentSpent`, `outside` (with `inOrder`: counts only once every goal before it is done), `entranceFed` with an optional ammo; the cut-in goal (`cutIn: true`); the refill goal skipped when the fast-travel goal completes with the line not dry. No frontier line: `objectiveLine` returns null text once the chain is done.
- New `guided.ts` (one system): the current guided step, the next ghost (derived from the foundry, no saved state), whether a place or pick-up is allowed, `tutorialLocked(state)`; a guided conduit takes the ghost's `in` side.
- `placement.ts`: asks `guided.ts` before placing or picking up.
- `research.ts`: in a guided game, the Warden core's entrance node shows only on the right cap.
- `claims.ts`: travelling home from a pylon sets `travelled`.
- `state.ts` / `data/save.ts`: `travelled`; the objectives' flags change order, so `SAVE_VERSION` 11 → 12 with no migration (process "Saves"). The old-save criterion then applies to no readable save (the spec allows this).
- `summary.ts`: the guided step's next ghost and the remaining ghosts in `getState()` for the e2e bot.
- `data/player.ts`: `guided: true` on the real game's start only.

## Data (src/data)
- `objectives.ts`: the new chain and texts.
- New `guidedBuilds.ts`: steps 14 and 19's ghosts (piece, tile, facing, `in`, order), the remove target, the hints ("Build on the glowing outline", "Not yet", "Unlocks as the tutorial goes on", "Right click to remove"), and the sub-line wording (058.2).
- `hudLayout.ts` / `foundryAssets.ts`: the goal panel's foundry position under the foundry minimap; `targets.ts`: the waypoint arrow's clearance over an E/C/B prompt.
- The pylon menu text "Send inventory to stash"; the unlock banner's text ("Unlocked <name>", joined) and timing next to the area banners.

## Render (src/render)
- Ghost pieces in the foundry (a glowing outline per remaining ghost, the next one brighter); the build-bar arrow on the next piece; locked cells greyed with their hover line; the refused-placement hint.
- The bench screen's two arrows (the identified piece, then its equip control).
- The step-19 remove arrow with "Right click to remove".
- The goal panel and waypoint arrows gone for good after step 25; the minimap stays.
- The unlock banner from new known recipes.

## Playwright
- Rewrite `tests/e2e/tutorial.spec.ts`: the bot plays from New game to the end, building both guided lines on their ghosts.
- The bench arrows, the build-bar arrow, the unlock banner (a small 058 spec).
- `guidedTutorialShots.spec.ts` (REVIEW_SHOTS=1) into docs/review/058: the spec's shots.
- Older e2e that walk the old chain get their staging updated, their images left as on main.
