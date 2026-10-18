# 018: Believable resources
status: draft

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

## Open questions
None.
