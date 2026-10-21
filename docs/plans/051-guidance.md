# Plan 051: Guidance

Spec: docs/specs/051-guidance.md (approved on draft: 051.1 and 051.2's proposals are built). Branch `claude/051-guidance`, stacked on `claude/050-playtest-fixes` (PR #42). Each slice is vertical (sim rule, render view, data numbers and words), tests first, its own commit, `npm run check` green at each. Anything the spec doesn't decide goes under "Raised after the build" in the spec with the most conservative choice built.

## Slices

### 1. Objective targets and waypoint arrows (B.1, 051.2)
- **Data** `src/data/objectives.ts`: every goal names a `target` (`TargetDef`): the tube stone, the nodes for the raws still to gather, the nodes for what a craft lacks, the field pack (then the foundry's stairs), a room (the foundry, or outside), the hoppers, the bench, a site's pylon, the nearest unclaimed site pylon, the intake's caps, the new entrance, the intake, the ports, the Hollows' barrier, a boss. It replaces 027's `marker`.
- **Sim** `src/sim/objectiveTarget.ts` (new): `objectiveTargets(state)` — every point the current goal names (room, world px, and the item a hopper needs); `waypoint(state)` — the nearest one (051.2), or, when it's in another room, the door of the player's room that leads there (the foundry's door inside, the stairs outside). Pure and deterministic.
- **Render** `src/render/WaypointView.ts` (new): an arrow at the screen's edge pointing at the waypoint while it's off screen, an arrow bobbing over it while it's on screen (027's marker sprite and lifts, `markerPoint` now reads the sim's target). Always on. `ui().waypoint` reports `{ mode: 'edge' | 'over' | null, x, y, angle, via }`.
- **Tests first** `tests/sim/objectiveTarget.test.ts`: each goal's target; the nearest of several; through the door from both sides. `tests/render/waypointPlace.test.ts`: the edge point and angle. e2e: an edge arrow for an off-screen goal.

### 2. The refill goal's hopper icons (B.2)
- **Sim**: the refill goal's targets are the hoppers whose raw isn't put back yet, each with the raw it takes (the input of the machine it feeds; else what it last held).
- **Render**: over each one an arrow and the raw's icon in a small plate.
- **Tests first**: the three example-line hoppers, wood, stone, fiber; one refilled drops out.

### 3. Sub-steps (B.3)
- **Data**: "Craft bombs and ley bolts (C)" moves before "Enter the foundry", with `subSteps: 'collect'`.
- **Sim** `src/sim/subSteps.ts` (new): the raws a craft goal still lacks (the recipe tree, less what's carried, shared parts counted once); state `lacked` remembers which showed for the goal, so a line ticks off once gathered. Bomb and ley bolt recipes have to be known before the foundry (Raised after the build).
- **Render** `ObjectiveView`: indented sub-lines under the goal, each with the raw's icon, ticked when gathered.
- **Tests first** `tests/sim/subSteps.test.ts`: lines appear only when lacking; tick off; stone spent on arrows brings stone back.

### 4. Harvestable nodes glow (B.4)
- **Sim** `harvestable(node)`: uses left. **Render** `NodeView`: a soft pale outline behind each harvestable node and an occasional sparkle; none on a used-up node until it regrows. **Data** the glow's numbers in `src/data/art/nodes.ts`. `ui().nodeGlow`.
- **Tests first**: harvestable follows use and regrow.

### 5. Minimap fog, no water, icons, hover labels (B.5, 051.1)
- **Sim** `src/sim/fog.ts` (new): a revealed-tiles bitmap (`state.fog`, overworld tiles packed 32 to a number), revealed from the camera's view each tick outside. SimState's shape changes: SAVE_VERSION 8, no migration, shape fixture regenerated.
- **Render** `MinimapView`: unrevealed tiles fogged; water, trees and rocks drawn as plain ground; the foundry, the shrine's pylon, claimed pylons and the Bulwark's arena as icons once their tile is revealed (landmarks once discovered, as 032); hovering an icon names it.
- **Tests first** `tests/sim/fog.test.ts`: the view reveals, it stays after leaving, it survives a save.

### 6. The foundry minimap (B.6)
- **Render** `src/render/FoundryMapView.ts` (new) with a pure layout `foundryMap.ts`: inside the foundry, in the minimap's place, conduits (and splitters, mergers, sorters) as lines, machines as dots, icons for the intake (the tube), bench, stash, the door, the open entrances and the ports; no moving items. `ui().foundryMap`.
- **Tests first** `tests/render/foundryMap.test.ts`; e2e: its pieces in `ui()`.

### 7. Learning right click (B.7)
- **Render**: 047.9's banner line goes; a small mouse icon with the right button lit sits beside the carried bar (the bound key's cap if `use` is rebound); as the attune ends on the first entry, the old left-click slot shrinks down into the carried bar's selected cell and the intake's slot grows in its place. **Data** `src/data/hints.ts` and `hudLayout.ts`: the icon's place and the animation's times. **Art** `hud-mouse` in `src/data/art/hud.ts`.
- e2e `tests/e2e/carriedBeforeAttune.spec.ts`: the icon shows, the animation runs once.

## Verify
- `npm run check`; the touched e2e files on port 5251 while building; the full `npx playwright test` once at the end on 5251.
- Review shots `tests/e2e/guidanceShots.spec.ts` (REVIEW_SHOTS=1, docs/review/051/): an edge arrow, the arrow over a hopper with its icon, sub-steps with icons, a glowing node, the fogged minimap, the foundry minimap, the mouse icon. Older shots covering the HUD, minimap, objectives and foundry rerun; only what 051 changes is retaken.
- `npm run measure` once; recorded, not tuned.
