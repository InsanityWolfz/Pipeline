# 018: Believable resources
status: approved

Approved by Shaun, 2026-10-18 ("I approve all"), for an unattended run.

## Goal
Every material visibly comes from somewhere:
- Wood is cut from real trees in sunlit groves.
- Stone is chipped from boulders in rock fields.
- Fiber is cut from reeds at the edge of ponds.
- Ley crystal grows where ley lines break the surface.
- Resin oozes from Husks' bindings, and the Warden's core glows in its chest before it drops.

A claimed pylon visibly harvests the land around it and sends the haul home along a ley line. The game explains its own supply, so the immersion holds.

## Design references
- docs/design.md:
  - "Pitch": "Every ARPG hand-waves infinite arrows. This game is about where they come from."
  - "World, regions, ley lines, bosses": ley conduits carry materials home, and the theme rule
  - "The Foundry": "No ratio math. Supply lines deliver a fixed amount per minute."
- docs/prototype.md: "Player flow" beat 2, and "Materials and drops"
- docs/specs/017-overworld.md: the terrain, groves, rock fields, ponds, ley lines, shrine site and safe zone
- Shaun's notes, 2026-10-18: "the tree area is a patch of grass where the sun is shining through", "the stones are actually rocks and not squares with a dot in the middle", "the fiber is near a small pool of water"; "we also need to make sure we are giving an account for the resources and other things in the game or we break the immersion"
- Shaun's interview answers, 2026-10-18:
  - visible pylon harvest
  - gathering with E as now
  - visible remains while a node regrows
  - resin from Husks and the core in the Warden

## Acceptance criteria

**Where nodes stand (data, sim)**
- [ ] Each node type has a placement rule in data:
  - Trees stand in groves, on grass with a sun-dapple patch.
  - Boulders stand in rock fields.
  - Reeds stand on a pond's shallow edge, touching water.
  - Ley veins stand on a ley line.
  - A data test fails if any placed node breaks its rule.
- [ ] Ley lines are part of the overworld terrain, as glowing seams in the ground. Every ley vein sits where one surfaces, and the lines lead toward the foundry entrance.

**Gathering (render)**
- [ ] Holding E harvests, with the same rules, uses and regrow time as today. Each type reacts as it's worked:
  - The tree shakes and drops leaves.
  - Chips fly off the boulder.
  - Reed stalks are cut and fall.
  - Crystal shards crack off the vein with a cyan spark.
- [ ] Each node shows its uses left by its shape:
  - The boulder gets smaller.
  - The tree loses canopy.
  - The reed clump thins.
  - The vein's crystals shrink.

**Depleted and regrowing (render)**
- [ ] A depleted node shows its remains:
  - A tree becomes a stump with a sapling.
  - A boulder becomes pebbles.
  - Reeds become cut stubs.
  - A vein goes dark, with dull stumps of crystal.
- [ ] Over the regrow time the remains visibly grow back in stages (at least 3), then the full node returns. This is render-only from the sim's regrow timer.

**Drops that make sense (render, data)**
- [ ] Husks have amber resin oozing at their straw bindings, with a slow drip and glint. Resin drops look like the same amber.
- [ ] The Pylon Warden has a glowing core in its chest, visible from the start of the fight, that pulses during its wind-up. When it dies the core falls out as the warden-core drop.

**Pylon harvest (sim summary, render)**
- [ ] The shrine site has at least one tree, boulder, reed clump and ley vein inside the claimed pylon's safe zone. A data test checks this.
- [ ] After the claim, each time the supply port produces an item, the pylon reaches a ley tendril to the nearest node of that item's type in its zone.
  - The node pulses.
  - A glowing mote of that item travels along the ground ley line from the shrine site to the foundry entrance and sinks in.
  - Inside the foundry, the item appears at the supply port as today.
- [ ] The pylon's harvest never depletes nodes, and the player can still harvest them. Supply stays a fixed rate (design.md: no ratio math). This is visual only, driven by the existing port events. No sim rule changes, except that the summary reports the port's item events if it doesn't already.
- [ ] Hovering the pylon, the ley line or the supply port shows a one-line description of where the materials come from.

**Art (data)**
- [ ] All nodes, remains, regrow stages, the Husk resin, the Warden core, the tendril and the motes are drawn in the 016 vector style and palette.
- [ ] The old pixel node sprites are removed.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Harvesting, regrow, drops and the supply port tests pass unchanged in meaning.

## Data changes
- `src/data/nodes.ts`: a placement rule per node type, and regrow stage count.
- `src/data/overworld.ts`: ley lines, node placements that follow the rules, and the shrine site's harvest nodes.
- `src/data/art/`: node, remains, regrow, resin, core, tendril and mote shapes.
- Descriptions for the pylon, ley line and supply port.

## Out of scope
- New materials, new node types, or changes to harvest amounts, uses or regrow times.
- Supply rates that depend on the nodes.
- Gathering with the tube.
- Visible armor on enemies that will drop it (Shaun didn't pick it).

## Test plan
- **Vitest:**
  - The placement rules hold for every placed node.
  - The shrine zone has one node of each type.
  - The regrow stage picked for a given timer value.
  - The pylon harvest picks the nearest node of the item's type, in a render-logic unit test.
- **Playwright:**
  - Harvest a node to depleted and see it regrow through its stages, stepping frames.
  - Kill a Husk and pick up resin.
  - Claim the pylon and see a port item arrive with a mote event first.
- **Screenshots (qa):**
  - each node full, half used, depleted and mid-regrow
  - a Husk's resin
  - the Warden's core in its wind-up
  - a pylon tendril and a mote on the ley line
  - the hover descriptions

## Build notes
- **Placement rules.** The rule in data is a label per node type (`placement` in `src/data/nodes.ts`); the predicates live in `tests/data/placement.test.ts`. A node must:
  - sit inside a hand-placed feature of its kind (`OVERWORLD.features`)
  - meet that kind's local check: grass with 4+ trees within 3 tiles, 2+ rocks within 3, shallows next to water, or within half a tile of a ley line
- **Features.** Groves and rock fields fill only the back half of their disc (the rows up to their centre), with a grass pocket round the node, so every node can be gathered from below. Ponds put the reeds in their shallows.
- **The shrine.** It gained a boulder (node 13), so its safe zone holds one node of each type. A shrine Husk moved from (71,12) to (69,11), off the new pond.
- **Ley lines** move from render data into `OVERWORLD.leyLines`. They lead to the foundry stairs directly or through the shrine's pylon. The pylon's haul runs along the `shrine` line.
- **The one sim addition** is the `supplies` event when a port produces a raw, reported in the summary. Port timing, items and nodes are untouched; the harvest is visual only.
- **Regrow stages.** The bare remains, then 3 stages, picked from the sim's timer (`src/render/nodeStages.ts`). Uses left show as 3 looks.
- **Names and colours.**
  - The rubble node's display name is now "Boulder"; its id is unchanged.
  - New palette colours: the resin ambers match the resin item's icon, and the core violets match the warden-core item's.
- **The Warden's core.** It was first drawn as a cyan ley crystal. The reviewer caught that it didn't match the violet warden-core drop, and Shaun chose to match the drop: a violet heart-stone with a gold heart.
- **Hover descriptions** are a first draft for Shaun to edit (`src/data/descriptions.ts`). An unclaimed pylon says it needs claiming.
- **Test helpers.** The new groves and ponds broke straight-line walking in the e2e helpers:
  - `walkTo` now finds a path over a passable grid from the dev-only hook (`passable()`, built from `src/sim/bodies.ts`).
  - Fight loops in the claim, crafting and tutorial tests step round obstacles.
  - The 017 ring-2 crowd test now walks to the busiest ring-2 spot.
- **From review.** All three blocking items are fixed:
  - the core matches its drop
  - render numbers moved to data
  - the new data references are tested

  From the suggestions, these are in:
  - tighter placement rules
  - the dormant pylon wording
  - description tests
  - `roomBodies` moved out of `step.ts`
  - the port item checked in e2e
  - `killHusk` stops retrying failed paths
  - regrow ticks read from data

  `GameScene` is 315 lines, slightly over the ~300 guideline.

## Open questions
None.
