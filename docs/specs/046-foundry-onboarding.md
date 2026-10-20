# 046: Foundry onboarding
status: draft

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 1, 4, 10) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md). Note 10 came from watching a first-time player struggle in the foundry.

## Goal
The first foundry visit shows a working arrow line instead of an empty floor, so a new player sees how a line turns resources into rounds that go up the tube. Early resources make more ammo, and the Splitter is there from the start.

## Design references
- docs/design.md: "The Foundry".
- Players' favourite moment (friends' playtest): "seeing their items go up the tube for the first time".
- Specs: 006 (foundry building), 019 (the intake), 024 and 028 (entrances, the volley, hoppers fed by conduits), 027 (the foundry tutorial), 033 (research, the Splitter), 042 (saves).

## Acceptance criteria
**The example line (note 10)**
- [ ] On the first foundry entry, a complete arrow line already stands, built from ordinary pieces: its three hoppers stocked with wood, stone and fiber, its machines and conduits running into the first intake entrance. When the tube attunes (019), the line starts and arrows go up the tube.
- [ ] The line runs until its stock is used up. Then an objective shows how to refill the hoppers with wood, stone and fiber.
- [ ] Its pieces are ordinary: the player can pick them up, move them and rebuild the line, with the usual refunds.
- [ ] The layout and the starting stock are data.

**The tutorial (027, note 10)**
- [ ] The foundry tutorial's steps change: instead of building the first line, the player refills the example line. After the first boss (the Warden, whose core opens the second entrance), the tutorial has them build a second arrow line into the second entrance.

**Early ammo (note 1)**
- [ ] Region 1 recipes (shafts, arrowheads, rope, casings and the rest) make twice as many per craft, by hand and in machines. Their costs and the node yields don't change, and later regions' recipes don't change.

**Splitter (note 4)**
- [ ] The Splitter is in the build bar from the first foundry visit. Its research entry and schematic are removed (033), and anything that referred to them is updated.

## Data changes
- `src/data/foundry.ts` (or a new file): the example line's layout and stock.
- `src/data/recipes.ts`: Region 1 output counts doubled.
- `src/data/research.ts`, `src/data/pieces.ts`: the Splitter unlocked from the start.
- `src/data/objectives.ts`: the tutorial's foundry steps.

## Out of scope
- The volley shape (next batch) and the resin pylon (next batch).
- Any other balance change. `npm run measure` is re-run and its numbers recorded, not tuned.

## Test plan
- Vitest: the example line produces arrows into the first entrance from its stock and then stops; the refill objective appears; doubled Region 1 outputs; later recipes unchanged; the Splitter available at start; the tutorial's step order.
- Playwright: a new game into the foundry sees arrows go up the tube; after the Warden, the second-line objective.
- Screenshots: the example line running on first entry, the refill objective.

## Open questions
- **046.1 Does a save made before 046 get the example line?** Proposal: no, only new games. Saves already have a foundry; adding pieces to it could block what the player built.
- **046.2 How much stock?** Proposal: enough for about 60 arrows (about a minute of fire), so it runs dry during the first outing and the refill lesson lands soon after.
- **046.3 The Warden core and the second entrance.** Proposal: unchanged from 033: the Warden's core restores the second entrance; the tutorial's new step follows it.
