# 067 plan: the foundry after the first boss

Plan for docs/specs/067-foundry-after-shrine.md on `claude/067-foundry-after-shrine` (InsanityWolfz/Pipeline#81). Pre-approved by Shaun with the spec (2026-10-26).

Four vertical slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code follows them.

## Findings that shape the plan

- **Recipes.** `requires: 'attuned'` sits on casing, fuse, ley dust, bomb, ley bolt and every steel, glass and storm bomb or bolt recipe (`src/data/recipes.ts`). `knownRecipe` (`src/sim/tutorial.ts`) already lets them through once the foundry gate opens (051, B.3), so today they show after the ruin field. With the gate now waiting on the claim, `requires` goes and the five Region 1 rows get `shownAfter` their raws: casing stone, fuse husk resin, ley dust and ley bolt ley crystal, the bomb all three. `REVEALING_ITEMS` and `found` pick these up with no new code. `knownRecipe` then reads only `found`; `CraftStores`, `taggedKnown` and the craft menu's empty stores drop `gates`.
- **Test starts know the raws.** `DEFAULT_START` (the sim's default and `?start=field`) has gates open and only arrows, so it knew the bomb rows through the open gate. It gains a `found` list (stone, husk resin, ley crystal) on `StartDef`, read by `createSim`, so tests and `?start=field&attuned` keep crafting bombs as before. The playtest and sandbox kits carry the raws, so `foundIn` covers them.
- **Gates** (`stepGates`):
  - `foundry` opens on `state.claims.includes('shrine')` instead of the field pack's death.
  - `shrine` (the arena door's `unlock`, `src/data/arenas.ts`) is open from the start: `createGates` sets it true whatever `open` says. Its dome (`OverworldView`) is then never drawn: it is built hidden when the gate is open, so no fade plays at boot.
  - `populated` no longer follows `firstLineFull`. A new saved flag `fieldCleared` is set the tick the field pack's last Husk dies (a `deaths` event of the `field` group with none left alive), and sets `populated`. Keyed to a kill, not to an empty list, so tests that clear `enemies` by hand, and the sandbox, never send packs out. `DeathEvent` gains `group`.
- **The sealed door.** The foundry's stairs are a doorway with `gate: 'foundry'` (`overworldGen.ts`), solid while shut (`tutorialRects`), drawn with rubble (`TutorialView`, `door-rubble`). New: `stepSealedDoors(state, cmd)` after `stepDoorways` pushes `events.sealedDoors` when the player's feet are within a few px of a shut gated door and E is pressed or the move points into it. E is not consumed (as a sealed arena door, it has no prompt; 045's rule is for things E acts on). Render: a new `SealedDoorView` shows the gate's line from data (`SEALED_DOOR_TEXT.foundry`, "Claim the shrine first") over the door for a short time, re-armed while the event repeats. The rubble frame is redrawn as a ley shimmer (`door-shimmer`, a cyan curtain in the doorway) that pulses in render and fades as the gate opens.
- **The chain** (`src/data/objectives.ts`). New checks: `fieldCleared`; the Warden's `bossDefeated` (`pylon-warden`, already recorded by `onBossDeath`); `built` (a guided build's ghosts all matched). "Travel to the foundry (E at the pylon)" is `inRoom` foundry, `inOrder` (walking or fast travel), pointing at the claimed pylon. `travelled` (state and check), the `refilled` check with its `lineRanDry` and `refilled` state, `skipUnlessDryAfter`, `foundryDry` and the target's `unfilled` go with the refill goal.
- **Waking.** `wakeRoom` keeps reading the foundry gate, so a KO wakes the player by the stone until the claim.
- **The example line.** `src/data/exampleLine.ts`, `src/sim/exampleLine.ts`, `StartDef.exampleLine` and its call in `stepLink` go. The guided arrow line takes its place.
- **The first guided build's layout.** The ports feed the tile east of them: wood (1,4), stone (1,6), fiber (1,8). The assembler stays where the example line had it, (11–13,3), so the frost step (058) still removes the conduit at (12,2) and seats the rune there; the cutter, knapper and spinner stay at (11,4), (12,4), (13,4) facing up into its back. The ports' conduits:
  - wood along row 4, (2,4)…(10,4), into the cutter's left side (9 conduits);
  - stone along row 6, (2,6)…(11,6), then (12,6) up and (12,5) up into the knapper (12 conduits);
  - fiber along row 8, (2,8)…(12,8), then (13,8)…(13,5) up into the spinner (15 conduits);
  - the assembler's front: (12,2) and (12,1) up into the middle mouth (12,0).
  Build order: wood conduits, cutter, stone conduits, knapper, fiber conduits, spinner, assembler, the two output conduits (42 pieces). Clear of the ley line (row 10, column 15, row 1 east of 13) and the fixtures.
- **The frost line has to move.** Any line from the west wall's rows 4–8 to the assembler fences off the room's north-west, so 058's rimestone line up column 3 and along row 2 into the rune's left side (058.5) crosses the arrow line three times. Rebuilt with the same lesson (one underground pair, under the ley line): from the rimestone port east along row 12, (2,12)…(13,12), (14,12) up, the pair (14,11)→(14,9) under the ley line's (14,10), (14,8)…(14,3) up, (14,2) left and (13,2) left into the rune's right side. The rune takes from any side but its front. Raised as 067.x (the spec keeps 058's rune step; 058.5 said "from its left side").
- **The build lock** already holds from the start of a guided game until the frost step is done (`buildLocked`), with ghost-only exceptions while a guided goal is current (`currentGuided`). The arrow build is a third `GuidedId`, `arrow-line`, so the lock covers it with no new rule. The spec's "then lifts" is read as the arrow build's own ghost-only rule ending; 058's span (until the frost rune) stays, since the spec keeps the later builds' "lock rules, as 058 set". Raised.
- **The talent cut-in** waits during any guided goal (058.4); the arrow build is one.
- **Saves.** `fieldCleared` is new and `travelled`, `lineRanDry`, `refilled` go: `SAVE_VERSION` 20, and `tests/sim/saveShape.json` follows.
- **Tests that start from the old flow** (grep of tests/ and tests/e2e): `tutorial`, `goals`, `guidedTutorial`, `guidedLayouts`, `foundryTutorial`, `exampleLine` (sim and data), `objectiveTarget`, `crafting`, `link`, `subSteps`, `saveTriggers`, `sim`, `entrances`, `intake`, `researchEntrances`, `unlockByCraft`, `volleyLanes`, `stamp`, `cache`, `area`, `hotbars`, `sitePylons`, `huskHive`, `placement`, `data`, `foundryMap`, `tests/fixtures/foundrySteps.ts`; e2e `tutorial`, `tutorialFrost`, `tutorialPage`, `guidedTutorial`, `guidedTutorialShots`, `foundryTutorial`, `guidance`, `guidanceShots`. Each is rewritten for the new flow, never dropped without a replacement.

## Slice 1: hand-crafting from the start
**Tests first**
- Data: no recipe has `requires`; casing, fuse, ley dust, bomb and ley bolt list their raws in `shownAfter`.
- Sim: on the tutorial start, the bomb and ley bolt rows are unknown until their raws have been carried, then known with the tube unattuned and every gate shut; each can be crafted (the arrow chain known from the start, as now).
- Sim: every recipe is known once its `shownAfter` items are found, with no attunement.
- `DEFAULT_START`'s `found` makes the bomb rows known as before.

**Code**
- `recipes.ts` (`requires` removed, `shownAfter` added); `knownRecipe`, `CraftStores`, `taggedKnown`, `CraftMenuView`'s empty stores; `StartDef.found` and `createSim`.

## Slice 2: the opening's gates and goals
**Tests first**
- The shrine's door opens to E from the start; `gates.shrine` true on the tutorial start.
- The foundry's stairs stay solid until the shrine is claimed, then open for good (through a KO).
- E at the sealed stairs, or walking into them, pushes a `sealedDoors` event; nothing after the claim.
- Killing the field pack's last Husk sets `fieldCleared` and `populated`; clearing `enemies` by hand does not; the sandbox never does.
- The chain's first nine goals in order with their texts and targets, each met by a scripted run on the tutorial start: tube, gather, arrows, bombs, ley bolts, field, Warden, claim, travel (walking in and by fast travel).
- The talent cut-in still cuts in at the first point.
- No refill goal; the travel goal is `inOrder`.
- e2e (`tests/e2e/sealedDoor.spec.ts`): a New game walks into the sealed stairs and presses E: the line "Claim the shrine first" shows over the door.

**Code**
- `tutorial.ts` (gates, `fieldCleared`, `stepSealedDoors`), `events.ts`, `combat.ts` (death group), `step.ts`, `state.ts`, `summary.ts`, `objectives.ts` (data and sim: the `fieldCleared` check), `targets`, `save.ts` 20, saveShape.
- Render: `SealedDoorView`, the shimmer art in `src/data/art/fixtures.ts`, `TutorialView`'s pulse, `OverworldView`'s dome built open.
- Data: `SEALED_DOOR_TEXT`, the shimmer's pulse and the message's timing.

## Slice 3: the first guided build, and the example line gone
**Tests first**
- Data: the arrow line's ghosts stand on floor, clear of the fixtures, each other and the ley and frost lines; they use no port-fed tile but wood's, stone's and fiber's own first ones (and the ley and rimestone ones for their lines).
- Sim: entering the foundry for the first time after the claim attunes the tube and lays nothing.
- Sim: the arrow build's ghosts in order; anything off them refused; built in order, the line runs from the ports with no hoppers and arrows reach the middle entrance; "Wait for the tube to fill with arrows" follows and completes.
- Sim: the ley line and the moved frost line, built after it in order, still work (ley bolts in the right entrance; frost arrows in the middle one), and the lock lifts after the frost rune.
- Sim: the chain from the claim through 058's goals: travel, arrow build, fill, identify, equip, right entrance, ley bolts, leave.
- No example line on any start; no refill goal; `SAVE_VERSION` 20.
- e2e: `tutorial.spec.ts` plays a New game in the new order (bombs and ley bolts by hand, the field, the Warden, the claim, the travel, the arrow line on ghosts, the fill, the bench, the right entrance, the ley line, leaving); `tutorialFrost.spec.ts` stages its start with the arrow line built; `guidedTutorial`, `foundryTutorial`, `guidance` and `guidanceShots` restaged.

**Code**
- `guidedBuilds.ts`: `arrow-line` and the frost line's new tiles; `objectives.ts`: the arrow goal (`guided: 'arrow-line'`, `built` check); `guided.ts` and the sim's `built` check.
- Remove `exampleLine` data, sim, start flag and its tests (replaced above).

## Slice 4: review shots and the spec's results
- `tests/e2e/foundryAfterShrineShots.spec.ts` (REVIEW_SHOTS=1) into docs/review/067: the sealed door with its message; the bomb and ley bolt craft rows before the foundry; the ghost arrow line part built and finished; the tube filling from the ports.
- Older shot specs touching this (046's `foundryTutorial`, 058's `guidedTutorialShots`, 051's `guidanceShots`) run with REVIEW_SHOTS=1; their images restored as on main.
- The spec's results and "Raised after the build".

## Order and verification
- One builder, slices in order on this branch, committing after each with `npm run check` green and pushing.
- Locally: the touched e2e files, one Playwright process, `--workers=1`, on port 5320.
- Self-review of the diff against the spec at the end; CI green on PR 81.
