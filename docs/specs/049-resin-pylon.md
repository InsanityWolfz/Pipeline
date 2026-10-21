# 049: Resin pylon (Husk Hive)
status: approved

Approved by Shaun in chat, 2026-10-20 ("Start 48/49"), taken as approval on draft: the build follows the proposals in the open questions.

From Shaun's playtest note 16 (docs/brainstorm/2026-10-20-playtest-notes.md): "There should be a resin pylon somewhere so bombs become solved." Husk resin is only a drop today, so a bomb line can't be fed from supply. Interview answers: docs/brainstorm/2026-10-20-playtest-interview.md, "Next batch: 049".

## Goal
A new landmark, the Husk Hive, gives the player a way to automate bombs: resin to harvest by hand, and a pylon that supplies resin to the foundry once claimed.

## Design references
- docs/design.md: "World, regions, ley lines, bosses", "The Foundry".
- Specs: 018 (believable resources, node regrowth, Husk resin), 028 (supply ports per resource), 032 (landmarks, pylons, hidden until found, champions), 034 (ring scaling), 041 (rings).

## Acceptance criteria
**The site**
- [ ] A new landmark, the Husk Hive, in ring 2 of Region 1: a Husk nest of amber-crusted stone (Shaun). It is hidden until found, like other landmarks (032), and named on the minimap once found.
- [ ] It is guarded by a Husk pack with a champion (Shaun), at ring 2 scaling.
- [ ] Its layout, guards and nodes are data in `src/data/landmarkSites.ts`, like the other sites.

**Resin**
- [ ] Resin seeps at the site: nodes harvested with E like other nodes, with use and regrow stages (018). They give Husk resin (Shaun).
- [ ] The site's pylon, once claimed, supplies Husk resin through a supply port at the same rate as other pylons (028, Shaun).

**Bombs**
- [ ] With the Hive claimed, a bomb line can run from supply alone: a test feeds a bomb line from the resin port plus the other ports it needs.

## Data changes
- `src/data/landmarkSites.ts`: the Husk Hive.
- `src/data/nodes.ts`: a resin seep node.
- `src/data/art`: the Hive, the seep in its stages, and the claimed pylon's resin motes.

## Out of scope
- Changing bomb recipes, Husk drops or pylon rates.
- Region 2.

## Test plan
- Vitest: the site's data validates (guards, nodes, pylon, ring 2); seeps harvest and regrow; the claimed pylon supplies resin; a bomb line runs from supply alone; determinism.
- Playwright: in the sandbox or with `?playtest`, claim the Hive and see resin arrive at the port in `getState()`.
- Screenshots: the Hive unclaimed with its guards, a seep in its stages, the claimed pylon.

## Open questions
- **049.1 Where in ring 2 exactly?** Proposal: on the opposite side of the map from the Old Grove, so the two ring 2 sites spread players out; exact tile in data, checked for open floor and no overlap with other landmarks.
- **049.2 "After the Warden".** Ring 2 is open from the start; danger gates it, not a lock. Proposal: no hard lock. Ring 2 scaling and the champion make it a post-Warden goal in practice, and a goal line points to it after the Warden.
- **049.3 Seep yield and regrow.** Proposal: the same as a Region 1 stone node (018), resin instead of stone.
