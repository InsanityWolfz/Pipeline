# 067: The foundry after the first boss
status: approved

Approved by Shaun in chat, 2026-10-26 ("approve 67 and 68"), with the draft's listed decisions; its plan is pre-approved.

Plan pre-approved by Shaun, 2026-10-26.

Drafted from Shaun's playtest calls and his OK of the proposal (docs/brainstorm/2026-10-26-playtest-calls.md, "The opening"), 2026-10-26.

## Goal
A new player first learns to fight with ammo they make by hand. They gather, hand-craft arrows, bombs and ley bolts, clear the ruin field, beat the Pylon Warden and claim the shrine. Only then does the foundry open.

Inside, the tube attunes, and the player builds their first arrow line themselves on glowing ghosts, fed from the supply ports the shrine's pylon now fills. Then the tutorial carries on as 058 left it.

This keeps "I did it by hand, now it does itself" honest, and the line never quietly runs dry: it is fed from the ports from the start.

## Design references
- docs/design.md:
  - "Opening: first 30 minutes";
  - pillar 2 (manual first, then automated);
  - "The Foundry" (supply ports, each claimed pylon sends its area's raws).
- docs/prototype.md, "Player flow". The new order changes beats 4–9:
  - the tube attunes after the claim;
  - the first supply slot's line is built after the claim;
  - the claim comes before the foundry.
- docs/specs/046-foundry-onboarding.md: the example line and the refill goal, both removed here.
- docs/specs/058-guided-tutorial.md: guided builds on ghosts and the build lock.
- docs/specs/028-foundry-flow.md: supply ports.
- docs/specs/012-tutorial-flow.md: attunement and gates.

## Acceptance criteria

**Before the foundry (sim, data)**
- [x] A New game starts as now: wake by the tube's stone, pick up the tube, and gather from glowing nodes.
- [x] Bombs, ley bolts and their parts (casing, fuse, ley dust) can be hand-crafted from the start. The `requires: 'attuned'` gate on recipes is gone. Their rows show once their raws have been carried, like 038's `shownAfter`.
- [x] The goal chain before the foundry:
  1. "Pick up the tube"
  2. "Gather wood, stone and fiber (E)"
  3. "Craft arrows (C)"
  4. "Craft bombs (C)", once resin, stone and ley crystal are known
  5. "Craft ley bolts (C)"
  6. "Clear the ruin field"
  7. "Defeat the Pylon Warden at the shrine"
  8. "Claim the shrine's pylon (E)"

  Each goal has a waypoint target. The talent cut-in (058) still cuts in at the first point.
- [x] The shrine's barrier dome is open from the start. It no longer waits for the first line to fill.
- [x] The packs that waited for the first line (017's "once the first line fills") start when the ruin field is cleared.
- [x] The foundry's door stays sealed, with its gate drawn as a shimmer, until the shrine's pylon is claimed. E at it, or walking into it, shows "Claim the shrine first".
- [x] Equipping gear (058's bench steps) moves after the foundry opens. Gear found before then is carried. The first piece is safe on a KO (the playtest UI fix).

**After the claim (sim, data, render)**
- [x] The shrine's claim opens the foundry's door, and the next goal is "Travel to the foundry (E at the pylon)". Fast travel or walking both work.
- [x] Entering the foundry the first time attunes the tube, as now (012's moment). An unattuned tube still fires hand-loaded rounds outside, so nothing changes before then.
- [x] **The first guided build** (058's rules, a new build in `src/data/guidedBuilds.ts`):
  - an arrow line made of the cutter, knapper, spinner and assembler;
  - fed by conduits from the wood, stone and fiber supply ports;
  - into the middle intake entrance.
  - Each piece shows as a glowing ghost, with a build-bar arrow on the next piece, as 058 does.
  - The build lock holds from the first foundry visit until this build is done, then lifts. The ley bolt line and the frost rune keep their own guided builds and lock rules, as 058 set.
  - Placing a ghost piece is free, as every piece is.
- [x] The shrine's pylon already supplies wood, stone and fiber to their ports (028), so the line runs at once. No hoppers are needed.
- [x] "Wait for the tube to fill with arrows" follows the build, then the 058 chain carries on:
  - identify and equip at the bench;
  - restore the second entrance with the Warden core;
  - the ley bolt line on ghosts;
  - the frost rune;
  - the Grotto and onward.

**Removed**
- [x] The pre-built example line (046) and its stock.
- [x] The "Refill the hoppers" goal (046) and its skip rule.

**Saves**
- [x] `SAVE_VERSION` goes up by one. Older saves read as too old.

**Review shots (docs/review/067)**
- [x] The sealed foundry door with its message; the bomb and ley bolt craft rows before the foundry; the first ghost arrow line, part built and finished; the tube filling from the ports.

## Data changes
- `recipes.ts`: no `attuned` requirement; `shownAfter` for the bomb and ley chains.
- `objectives.ts`: the new chain before the foundry; the refill goal removed.
- `guidedBuilds.ts`: the first arrow line's ghosts and its lock.
- The example line's data removed (`exampleLine.ts`).
- The foundry door's gate opening on the shrine's claim.
- The shrine dome's opening rule; the population's start trigger.

## Out of scope
- The talent tree, bosses past the Warden, and Region 2 onward.
- The art pass.
- Changing what a KO costs, beyond the first-armor fix already in flight.

## Test plan
- **Sim:**
  - every recipe is hand-craftable without attunement;
  - the new goal chain in order, each check met by a scripted run;
  - the foundry door shut until the claim and open after;
  - the shrine dome open at the start;
  - the packs start after the ruin field;
  - attunement on the first foundry entry after the claim;
  - the guided arrow build's ghosts in order and the build lock;
  - the line runs from the ports with no hoppers;
  - the chain continues into 058's goals;
  - no example line and no refill goal.
- **Playwright:** a New game played through, with the guided tutorial e2e rewritten for the new order. The sealed door's message. Review shots.
- Old e2e and unit tests that start from the example line or the refill goal are rewritten for the new flow, never deleted without a replacement.

## Open questions
None: Shaun OK'd the proposal.

## Decisions in this draft (OK them with the approval)
- Packs start after the ruin field, rather than waiting on the first line, which now comes much later.
- Equipping gear moves after the foundry opens, since the bench is in the foundry.
- The first ghost line feeds the middle entrance from the ports, with no hoppers.
- An unattuned tube still fires hand-loaded rounds, as it does today before the foundry.

## Raised after the build
Build-time choices the spec didn't decide; the conservative option is built. Shaun OKs or changes them.
- **067.1 The arrow build's goal text.** Built: "Build an arrow line into the middle entrance (B)", in the words of 058's ley bolt step; it's done when every ghost is built, and "Wait for the tube to fill with arrows" follows.
- **067.2 "Craft bombs (C), once resin, stone and ley crystal are known".** Built: the bomb goal is current right after the arrows, with 051's sub-lines naming the raws still lacking; the bomb row itself shows once all three have been carried. Resin comes from Husks, so in play the ruin field is usually cleared while the bomb goal shows (goals complete in any order).
- **067.3 The frost line had to move.** Any arrow line from the west wall's wood, stone and fiber ports to the assembler fences off the room's north-west, so 058.5's rimestone line up column 3 into the rune's left side would cross it three times. Built: the same lesson (one underground pair, under the ley line), from the rimestone port east along row 12, up column 14 and into the rune's right side (docs/review/067/06). The ley bolt line is unchanged.
- **067.4 When the build lock lifts.** "Then lifts" is read as the arrow step's ghost-only rule ending with its build; 058's lock (from the first visit until the frost rune) holds between the arrow line and the ley bolt line, since the later builds keep "their own lock rules, as 058 set".
- **067.5 Packs on the test starts.** The ruin field's clearing populates the land only on the real game's start (gates shut). `?start=field`, `?start=hollows`, `?playtest` and the sandbox keep their own `populated`, so tests that fell every enemy through the hook stay calm.
- **067.6 The travel goal.** Done on the first foundry entry by either route (in order, so an earlier visit can't count); its waypoint points at the claimed pylon even when the player walks.
- **067.7 The sealed door.** E isn't taken and gets no E prompt (a sealed arena door has none either); "Claim the shrine first" floats over the door for 1.4 s after the last E or push, then fades. The rubble is redrawn as a pulsing ley shimmer (docs/review/067/01).
- **067.8 The shrine's dome.** The `shrine` gate stays, open on every start, as the arena door's unlock; the dome drawn over the shrine while it was shut is removed, as nothing can show it now.
- **067.9 The Warden's goal** reads `killedBosses` too: the Warden has no altar, so `bossDefeats` never records it.
- **067.10 The first piece safe on a KO** is #88's (fix-playtest-ui, merged into this branch): the first unidentified piece is banked as it's picked up. Not built again here.
- **067.11 docs/prototype.md** still tells beats 4–9 in the old order; not edited, as the spec's data changes don't list it.
- **067.12 The left entrance after the tutorial.** With the rimestone line coming from the east, (11,2) is free, so a hopper or conduit there feeds the left entrance's floor tile (11,1); 058.9's underground pair is no longer needed (tutorialFrost.spec.ts uses a hopper).
- **067.13 Older review shots.** 051/02 (the refill goal's hopper arrows) and 055/01 (the Warden's door sealed on a new game) can't be retaken; 058/03–06 show the example line and the old frost layout. Both are kept as taken. 058/07 (the arrow over the bench's E) gives an edge arrow on main too since #88, so it isn't 067's.
- **067.14 Dead hooks left in place.** The waypoint's raw icons (051, B.2) and the `hoppers` target have no goal using them now; kept, as a later goal may.
- **067.15 `?start=field`** counts stone, resin and ley crystal as carried (`StartDef.found`), so its bomb and ley bolt rows show from the start, as they did with its foundry gate open.

## Results (build)
- Plan: docs/plans/067-foundry-after-shrine.md (four slices). Built on `claude/067-foundry-after-shrine`: hand-crafting from the start (22d39d6), the opening's gates and goals (877978c), main merged (#87, #88: 0122196), the first guided build and the example line removed (a32c47e), then the review shots and these results.
- Criteria: all met, the first-armor rule by #88 (067.10). Vitest: tests/sim/opening.test.ts (the chain's first nine goals each met by a scripted run, the dome open, the sealed stairs and their message, the packs after the field, attunement on the first entry after the claim), guidedLayouts.test.ts (the three layouts clear of each other and the fixtures; built in order, the arrow line fills the tube from the ports with no hopper, then the ley line and the moved frost line work and the lock lifts), guidedTutorial.test.ts (the whole chain's texts, the talent cut-in waiting during the arrow step) and guidedArrow.test.ts (the travel goal, the arrow step's ghost-only lock and sub-line), crafting and data tests (no `attuned`, `shownAfter` on the five rows), save shape at version 20.
- Playwright: tutorial.spec.ts plays a New game in the new order (bombs and ley bolts by hand, the field, the Warden and the claim fought, the fast travel, the arrow line and the ley line on their ghosts, the bench, the right entrance) and tutorialFrost.spec.ts on to the end; sealedDoor.spec.ts (the message to a push and to E, none after the claim); foundryTutorial.spec.ts (the port-fed arrow line's first run); guidedTutorial.spec.ts (the arrow line's ghosts and bar arrow; the unlock banner from carried raws).
- Review shots, docs/review/067: 01 the sealed door and its message, 02a–b the bomb and ley bolt rows before the foundry, 03 the arrow line part built with the bar arrow, 04 finished, 05 the tube filling from the ports, 06 the moved frost line (067.3).
- Checks: `npm run check` green (2,489 unit tests). Locally passed: tutorial, tutorialFrost, foundryTutorial, sealedDoor, guidedTutorial, guidance, playtestUi, bossDoors, saving, exportImport, forgewright; with REVIEW_SHOTS=1, guidanceShots, guidedTutorialShots and bossDoorsShots' Warden door (images restored as on main; 058/07 fails on main too, 067.13) and foundryAfterShrineShots.
