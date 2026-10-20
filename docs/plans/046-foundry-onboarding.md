# Plan 046: Foundry onboarding

Spec: docs/specs/046-foundry-onboarding.md (approved on draft: 046.1–046.3's proposals are built). Branch `claude/046-foundry-onboarding`, stacked on `claude/045-readability` (InsanityWolfz/Pipeline#33). Five slices, each tests first and its own commit. SimState's shape changes once (slices 1, 3, 4), so `SAVE_VERSION` goes 2 → 3 with one migration.

## Slices

### 1. The Splitter from the start (note 4)
- **Data** `src/data/research.ts`: the `splitter` node goes; `RESEARCH_PIECES` is just the merger. `src/data/items.ts`, `src/data/drops.ts`: `schematic-splitter` goes (the drop pool and `?playtest`'s one-of-each follow from the item list). `src/data/researchAssets.ts`, `src/data/art/research.ts`: the splitter's wall diagram and restored panel go; the floor sprites stay.
- **Render** `src/render/ResearchView.ts`: wall panels are machine speed or merger.
- **Save** migration 2 → 3 (`src/sim/migrateV3.ts`): drops `research.splitter` and every `schematic-splitter` (inventory, banked, stash, start, ground). No refund (raised: 046.5).
- **Tests first** `tests/sim/splitMerge.test.ts`: the Splitter is on the bar and placeable at the start, the Merger still locked until restored. Research, schematics, inventory-row and data tests lose the splitter node; e2e research and menu-label runs restore the merger instead.

### 2. Doubled Region 1 outputs (note 1)
- **Data** `src/data/recipes.ts`: shaft, arrowhead, rope 4; arrow 8; casing, fuse 2; ley-dust, bomb, ley-bolt 4. Inputs unchanged; iron plate and landmine (Region 2) and the stages unchanged. `src/data/foundry.ts`: `OUTPUT_CAP` 4 → 8, so a machine still holds one doubled craft (raised: 046.6).
- **Tests first** `tests/data/recipes.test.ts`: each Region 1 recipe's output is twice its old count, inputs unchanged; Region 2 recipes and stages unchanged. A machine test: one wood through a cutter makes 4 shafts. Existing counts in tests are updated.

### 3. The example line on a new game's first entry (note 10, 046.1, 046.2)
- **Data** `src/data/exampleLine.ts` (new): the pieces (hoppers of wood, stone and fiber on row 5, cutter, knapper and spinner on row 4, the assembler across row 3, two conduits up into the centre entrance) and each hopper's stock: 2 of each raw, 64 arrows with the doubled outputs. `StartDef.exampleLine?: boolean`, true in `TUTORIAL_START` only.
- **Sim** `src/sim/exampleLine.ts` (new): `placeExampleLine(state)` lays the pieces as ordinary pieces (the same `createPiece` placing uses, skipping any tile already taken) and stocks the hoppers; called by `stepLink` the tick the tube attunes, on a start with `exampleLine`. Old saves keep their start without the flag, so never get it (046.1).
- **Tests first** `tests/sim/exampleLine.test.ts`: a tutorial-start sim walked into the foundry has the line, stocked; it runs, arrows go into the centre entrance; with the player firing it delivers 64 arrows and stops; nothing on another start or an old save; picking a piece up refunds its contents; re-placing works. `tests/data/exampleLine.test.ts`: pieces exist, tiles are floor and clear of fixtures, the last conduit feeds the open entrance.

### 4. The refill objective (note 10, 027)
- **Data** `src/data/objectives.ts`: 027's seven build steps become one goal, "Refill the hoppers: wood, stone and fiber (E)", `check: { kind: 'refilled', items: [wood, stone, fiber] }`, `waitsFor: { kind: 'lineDry' }`, prompt E over the nearest hopper. `waitsFor`: the objective line passes over a goal until that check has held.
- **Sim** `SimState.lineRanDry` (kept through a KO): set the first tick, once attuned, the foundry holds nothing left to run (every hopper empty, no machine holding or crafting anything, nothing on a carrier). `refilled` holds once the line has run dry and hoppers hold each item. `currentObjective`/`objectiveLine` skip waiting goals.
- **Render** `src/render/MadePopups.ts`: the "+ shaft" popups were tied to the removed steps; they now pop the first time machines ever make each item (`events.firstMade`), so the example line's first run shows the same popups (raised: 046.4). `newestHopper` prompt target goes (unused).
- **Save**: the objectives list is by index, so the migration maps the old list onto the new one by text; the refill goal counts as done where 027's "Put wood in the hopper" was.
- **Tests first** `tests/sim/foundryTutorial.test.ts` (rewritten): the goal's place in the chain; hidden while the line runs; shows when it runs dry; completes when the three are refilled by hand after that (refills before it runs dry don't count). `tests/sim/save.test.ts`: a v2 save migrates (objectives remapped, splitter gone, no example line).

### 5. The second line after the Warden (027, 046.3)
- **Data** `src/data/objectives.ts`: after "Restore a second intake entrance", "Build a second arrow line into the new entrance", `check: { kind: 'entrancesHold', ammo: 'arrow', min: 2 }`, B over the player, the intake marker, the assembler's cell pulsing. The Warden core still restores the second entrance (046.3).
- **Tests first** the chain order; the check holds with arrows in two entrances, not one.

## Verify
- `npm run check`; the touched e2e files while building (foundryTutorial, tutorial, research, menuLabels, hudInventory, foundry); the full `npx playwright test` once at the end.
- Review shots in `tests/e2e/foundryTutorial.spec.ts` (REVIEW_SHOTS=1, docs/review/046/), as 027's were: the example line running on first entry, the refill objective. The older foundry and tutorial shot specs are rerun and their images restored unless the change is intended.
- `npm run measure` once; recorded in the spec.
