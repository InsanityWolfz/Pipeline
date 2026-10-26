# 067: The foundry after the first boss
status: draft

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
- [ ] A New game starts as now: wake by the tube's stone, pick up the tube, and gather from glowing nodes.
- [ ] Bombs, ley bolts and their parts (casing, fuse, ley dust) can be hand-crafted from the start. The `requires: 'attuned'` gate on recipes is gone. Their rows show once their raws have been carried, like 038's `shownAfter`.
- [ ] The goal chain before the foundry:
  1. "Pick up the tube"
  2. "Gather wood, stone and fiber (E)"
  3. "Craft arrows (C)"
  4. "Craft bombs (C)", once resin, stone and ley crystal are known
  5. "Craft ley bolts (C)"
  6. "Clear the ruin field"
  7. "Defeat the Pylon Warden at the shrine"
  8. "Claim the shrine's pylon (E)"

  Each goal has a waypoint target. The talent cut-in (058) still cuts in at the first point.
- [ ] The shrine's barrier dome is open from the start. It no longer waits for the first line to fill.
- [ ] The packs that waited for the first line (017's "once the first line fills") start when the ruin field is cleared.
- [ ] The foundry's door stays sealed, with its gate drawn as a shimmer, until the shrine's pylon is claimed. E at it, or walking into it, shows "Claim the shrine first".
- [ ] Equipping gear (058's bench steps) moves after the foundry opens. Gear found before then is carried. The first piece is safe on a KO (the playtest UI fix).

**After the claim (sim, data, render)**
- [ ] The shrine's claim opens the foundry's door, and the next goal is "Travel to the foundry (E at the pylon)". Fast travel or walking both work.
- [ ] Entering the foundry the first time attunes the tube, as now (012's moment). An unattuned tube still fires hand-loaded rounds outside, so nothing changes before then.
- [ ] **The first guided build** (058's rules, a new build in `src/data/guidedBuilds.ts`):
  - an arrow line made of the cutter, knapper, spinner and assembler;
  - fed by conduits from the wood, stone and fiber supply ports;
  - into the middle intake entrance.
  - Each piece shows as a glowing ghost, with a build-bar arrow on the next piece, as 058 does.
  - The build lock holds from the first foundry visit until this build is done, then lifts. The ley bolt line and the frost rune keep their own guided builds and lock rules, as 058 set.
  - Placing a ghost piece is free, as every piece is.
- [ ] The shrine's pylon already supplies wood, stone and fiber to their ports (028), so the line runs at once. No hoppers are needed.
- [ ] "Wait for the tube to fill with arrows" follows the build, then the 058 chain carries on:
  - identify and equip at the bench;
  - restore the second entrance with the Warden core;
  - the ley bolt line on ghosts;
  - the frost rune;
  - the Grotto and onward.

**Removed**
- [ ] The pre-built example line (046) and its stock.
- [ ] The "Refill the hoppers" goal (046) and its skip rule.

**Saves**
- [ ] `SAVE_VERSION` goes up by one. Older saves read as too old.

**Review shots (docs/review/067)**
- [ ] The sealed foundry door with its message; the bomb and ley bolt craft rows before the foundry; the first ghost arrow line, part built and finished; the tube filling from the ports.

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
