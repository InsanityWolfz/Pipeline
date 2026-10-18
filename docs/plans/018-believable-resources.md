# Plan 018: Believable resources

Spec: docs/specs/018-believable-resources.md. Written for the unattended run (stacked on 017, `claude/018-believable-resources`). It stays inside the spec.

## Shape of the change
Nodes stand in terrain that explains them, and the render shows where every material comes from. The only sim changes:
- **Terrain:**
  - Ley lines move from render data (`GROUND.leySeams`) into `OVERWORLD.leyLines`.
  - Small hand-placed features (`OVERWORLD.features`: groves, rock fields, ponds) are stamped round each node after the clearings.
  - The generator keeps the stamped ponds in `terrain.ponds`, so the existing pond painter draws them.
- **Port event:** a `supplies` event fires when a supply port produces an item, reported in the summary.

Everything else is render:
- vector nodes with use and regrow stages
- the Husk's resin and the Warden's core
- the pylon's tendril and the motes on the ley line
- hover descriptions

## Tests first
1. **`tests/data/placement.test.ts`:**
   - Each node type's placement rule in `NODES` (`grove`, `rock-field`, `pond-edge`, `ley-line`) holds for every placed node, checked against the generated overworld:
     - **grove:** the node's tile is grass, with at least 3 tree tiles within 2 tiles of it
     - **rock field:** at least 2 rock tiles within 2 tiles
     - **pond edge:** the node is on shallows, next to deep water
     - **ley line:** within half a tile of a ley line segment
   - The ley lines end at the foundry entrance.
   - The shrine's safe zone holds one node of each type.
   - Every node can be reached from the start (the flood fill from 017 covers the tile below each node).
2. **`tests/sim/supply.test.ts`:** a claimed port emits one `supplies` event per item it produces, and the summary reports it.
3. **`tests/render/nodeStages.test.ts`** (pure functions in `src/render/nodeStages.ts`):
   - the stage for uses left
   - the regrow stage for a timer value (at least 3 stages)
   - the harvest target: the nearest node of the item's type in the zone
4. **e2e `tests/e2e/resources.spec.ts`:**
   - Harvest a node to depleted, then step frames and see the regrow stage advance through `ui().nodes`.
   - Kill a Husk and pick up resin.
   - Claim the pylon and see a mote event before the port item arrives.

## Steps
1. **Data:**
   - In `nodes.ts`, `placement` per node type and `REGROW_STAGES = 3`.
   - In `overworld.ts`, `leyLines` and `features` round every node; the shrine site gets a boulder.
   - Shrine husks move off the new features.
   - Item descriptions for the pylon, ley line and supply port (`src/data/descriptions.ts`).
2. **Generator** (`overworldGen.ts`): stamp the features after the clearings. A grove keeps a sunlit pocket round its tree node. Rock fields come out speckled. A pond puts water beside the reeds' shallow tile.
3. **Sim:** the `supplies` event in `stepPorts`, plus the summary.
4. **Art** (`src/data/art/nodes.ts`):
   - **Tree:** full, then losing canopy at 2 and 1 uses; then a stump with a sapling, growing in 3 stages.
   - **Boulder:** smaller at each use; pebbles; regrow piles.
   - **Reeds:** thinning; cut stubs; regrowing stalks.
   - **Ley vein:** crystals shrinking; dark stumps; regrowing.
   - Particles per type are data in `juice.ts`: leaves, chips, stalks, a cyan spark.
   - The pixel node sprites are deleted and the atlas rebuilt.
5. **Render:**
   - **`NodeView`:**
     - vector frames by stage
     - the harvest reaction: a tree shake, plus a particle burst on each harvest tick
     - a sun-dapple ellipse under trees
   - **Husk:** resin blobs at the straps in the body part, with an animated drip and glint overlay in `EnemyView`. Amber matches the resin item.
   - **Warden:** a core part in the chest with the `glow` role, so it pulses with the wind-up's glow. The death poses hide it, and the existing drop shows it falling out.
   - **`SupplyView`:** on each `supplies` event after the claim, a tendril from the pylon to the nearest node of that item in the zone, a node pulse, then a mote of the item's colour travelling along the ley line from the shrine to the entrance, where it sinks in. The view is purely visual and keeps no game state.
   - **Hover:** the pylon, the ley line and the supply port name themselves and show their one-line description.
6. **Docs:** art.md lists the node stages; progress and spec build notes.

## Risks
- Stamped features in the meadow could block e2e walking routes or the sim sandbox. Features sit at the meadow's edges, beside the existing nodes, and e2e routes are rerun.
- Moving the shrine's husks changes the claim fight. Its e2e test is rerun.
