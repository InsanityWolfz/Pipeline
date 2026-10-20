# 046: Foundry onboarding
status: approved

Approved on draft by Shaun in chat, 2026-10-20 ("Approve 45-47 on draft"): the build follows the proposals in the open questions.

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 1, 4, 10) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md). Note 10 came from watching a first-time player struggle in the foundry.

## Goal
The first foundry visit shows a working arrow line instead of an empty floor, so a new player sees how a line turns resources into rounds that go up the tube. Early resources make more ammo, and the Splitter is there from the start.

## Design references
- docs/design.md: "The Foundry".
- Players' favourite moment (friends' playtest): "seeing their items go up the tube for the first time".
- Specs: 006 (foundry building), 019 (the intake), 024 and 028 (entrances, the volley, hoppers fed by conduits), 027 (the foundry tutorial), 033 (research, the Splitter), 042 (saves).

## Acceptance criteria
**The example line (note 10)**
- [x] On the first foundry entry, a complete arrow line already stands, built from ordinary pieces: its three hoppers stocked with wood, stone and fiber, its machines and conduits running into the first intake entrance. When the tube attunes (019), the line starts and arrows go up the tube.
- [x] The line runs until its stock is used up. Then an objective shows how to refill the hoppers with wood, stone and fiber.
- [x] Its pieces are ordinary: the player can pick them up, move them and rebuild the line, with the usual refunds.
- [x] The layout and the starting stock are data.

**The tutorial (027, note 10)**
- [x] The foundry tutorial's steps change: instead of building the first line, the player refills the example line. After the first boss (the Warden, whose core opens the second entrance), the tutorial has them build a second arrow line into the second entrance.

**Early ammo (note 1)**
- [x] Each Region 1 raw resource makes twice the rounds, by hand and in machines (046.7, Shaun: "2× per resource"). Only the last step of each chain doubles: arrows 4 → 8, bombs 2 → 4, ley bolts 2 → 4. Parts (shafts, arrowheads, rope, casings, fuses, ley dust) keep their counts, so one wood, stone and fiber make 16 arrows (from 8). Costs, node yields, later regions' recipes and the landmine's cost don't change.

**Splitter (note 4)**
- [x] The Splitter is in the build bar from the first foundry visit. Its research entry and schematic are removed (033), and anything that referred to them is updated.

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

## Raised after the build
Built on `claude/046-foundry-onboarding` (plan: docs/plans/046-foundry-onboarding.md). 046.1–046.3 are built as proposed: only new games get the example line (the start carries the flag; a save keeps its own start), 4 of each raw (64 arrows with the doubled arrow craft), and the Warden core still restores the second entrance. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **046.4 The "+ shaft" popups.** They were tied to 027's build steps, which are gone. Built: they pop the first time machines ever make each item, so the example line's first run shows +shaft, +arrowhead, +rope and +arrow over its machines as the old steps did. Proposal: keep. The alternative is dropping them.
- **046.5 Saves with the Splitter's node or schematic.** Save version 3 drops `research.splitter` and every `schematic-splitter` (carried, banked, at home, on the ground). A restored Splitter's 2 ancient gears are not refunded. Proposal: no refund, since the Splitter is free now. The same migration maps the saved objectives by text: the refill goal counts as done where "Put wood in the hopper" was, and "Build a second arrow line into the new entrance" counts as done where "Feed two entrances to fire a spread" was.
- **046.6 Machine output cap.** `OUTPUT_CAP` 4 → 8, only as high as the biggest craft needs: one doubled arrow craft (8). As a side effect, machines making parts and stage machines can now hold more crafts' output than before (a stage machine holds two batches of 4). Proposal: keep.
- **046.7 Stages and the compounding. Answered by Shaun, 2026-10-20: "2× per resource".** The first build doubled every step, which compounded to 4× (32 arrows per wood, stone and fiber). Rebuilt so only the final craft of each Region 1 chain doubles (arrows, bombs, ley bolts). Parts and the landmine chain are as they were, so each raw makes twice the rounds: 16 arrows per wood, stone and fiber. The example line's stock went from 2 to 4 of each raw to keep 64 arrows (046.2). Stage machines tag rounds rather than make them, so their batch of 4 is unchanged.
- **046.8 When the refill goal shows and what counts.** After the tube attunes, the line passes over this goal until the lines have run dry. Dry means no hopper holds anything and no machine is crafting or holds a whole craft's inputs. Leftover parts stuck in a buffer, finished items waiting to go out and items on conduits don't count, so a stray extra wood can't hold up the chain (a review fix; the test is "one wood too many"). After that, each of wood, stone and fiber put in a hopper by hand counts. Supply ports and refills made before it runs dry don't. With no hopper in the foundry at all, the goal counts as done once the lines run dry. That covers a save from before 046 that never reached the foundry (no example line, so no hoppers to refill), the test starts (`?start=field`, `?playtest`), and a player who picked the hoppers up. An old save caught partway through 027's steps counts it done where "Put wood in the hopper" was. Proposal: keep.
- **046.9 Unlocks for the example line's machines.** 006's rule is unchanged: a machine is placeable once its part has been hand-crafted. A player who reaches the foundry without hand-crafting (say) a shaft can pick the cutter up but can't place it again until they do. Proposal: leave as is. The alternative is unlocking the example line's machines when it's laid.
- **046.10 The second-line goal's check.** "Build a second arrow line into the new entrance" completes once two entrances hold arrows. A Splitter off the example line meets it too (the e2e playthrough does this). Proposal: keep.
- **046.11 Other starts.** `?playtest`, `?start=field`, `?start=hollows` and the sandbox get no example line. Proposal: keep (they're test starts).

### Results
- `npm run check`: passes (1590 unit tests).
- `npx playwright test` (full run, once): 127 passed, 113 skipped (review shots), 0 failed.
- Review shots (docs/review/046): `01-example-line-running.png` (first entry, the parts' popups, arrows up the tube) and `02-refill-objective.png` (the goal with E over a hopper).
- Older shots that 046 changes were refreshed:
  - Retaken after the door's fade with no banner showing, using a new `quietScreen` e2e helper: 026/01–04, 029/02, 031/07 and 031/09.
  - Recommitted as captured: 033/01–07, 09 and 10 (the Splitter's wall panel and list row are gone), and 045/04 (the Splitter in Logistics).
  - Refreshed, so they also carry drift from 045 and earlier unrelated to 046: the red HP bar, the Mines group, the XP row and the shot-capture timing.
  - The other drift in this container also shows on the base branch, so it was restored and not recommitted.
- `npm run measure`: unchanged from 045. Ammo line and still 5/5 met. Ring 1 2.2–2.9 s, ring 2 2.8–4.2 s and ring 3 10.2–17.6 s, all met. The Bulwark's decent build is still 13/20 with 3 KOs (MISSED, as in 043.2/045), and the naive bot is KO'd 5/5. The bots start with fixed ammo, so the doubled outputs don't reach them.
