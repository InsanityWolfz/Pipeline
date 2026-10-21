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

## Raised after the build
Built on `claude/049-resin-pylon` (plan: docs/plans/049-resin-pylon.md). 049.1–049.3 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **049.4 Where the Hive is (049.1).** The ground straight across the foundry from the Old Grove is the Ley Grotto's, so the Hive sits at the nearest ring 2 ground on the east side: tiles x 99–103, y 34–40, south-east of the meadow on the south-east path, beside the South-east Ley Spring. That ground wasn't all open: the Hive clears about 8 trees (x 98–102, y 34–38) and turns two path tiles to floor ((101, 39) under the pylon and (99, 40) under a seep); the south-east path stays connected. It overlaps no landmark, the spring's clearing or the tutorial ground; every guard stands on a ring 2 tile; its 7-tile zone stays clear of the Reed Marsh's. Its ley line runs home up the meadow's east side. Proposal: keep.
- **049.5 The pack.** Four Husks, one always the champion (placed in data, `champion: true`), named with the seeded RNG like any champion. A KO brings it back, champion and all, until the pylon is claimed; a pack that holds its placed champion draws no extra random one. No Wisps ("a Husk pack"). Proposal: keep.
- **049.6 Named on the minimap.** No landmark has a name label on the minimap today (032 shows an icon; the discovery banner and the pylon's hover name it). The Hive does the same: its `site` icon once found, "Discovered" over "Husk Hive" on the banner, "Husk Hive pylon: sends husk resin home." on hover once claimed. Proposal: keep; a minimap label for every landmark would be a new spec.
- **049.7 The goal (049.2).** "Find the Husk Hive and claim its pylon" comes right after "Claim a second pylon", with no arrow marker (032's `sitePylon` marker points at the nearest found site, not this one). No lock. Wording is Shaun's to edit. Proposal: keep.
- **049.8 The resin port.** It stands on the west wall at (1, 11), below the ley crystal port and above the bench, so a bomb line's resin and ley crystal come in side by side. A port's plate lies on the tile below it, where that port's body (or the bench) hid it; now a plate with a fixture right below it moves one tile into the room. This also applies to 034's ley-iron port over the wood port. Proposal: keep.
- **049.9 Saves.** The new goal shifts the saved goal flags and a new game holds a placed champion, so SAVE_VERSION is 6 with no migration (Shaun's rule): a version 5 save reads as too old and the player starts a New game. (048 may bump it too; resolved at merge.)
- **049.10 The RNG stream.** Naming the placed champion takes one draw from the seeded RNG at a world reset, so everything drawn after it in a run (population, drops) differs from before 049. Two harvest tests had relied on a drop scattering within contact on the same tick; they now wait for the magnet pull (045) to bring it in. `claiming.spec.ts`'s scripted shrine fight also played out differently and KO'd the bot; that test is about the claim, so since review it clears the shrine's guards through the hook as a declared setup step (no scripted fight, no hidden healing).

### Results
- Criteria: met, two of them as recorded and waiting on Shaun's answer: "named on the minimap once found" is the `site` icon only, with the name on the banner and the pylon's hover (049.6), and "a goal line points to it" is a goal line's text with no arrow marker (049.7). The rest: the site (ring 2, hidden until found, its `site` icon on the minimap once found, data in `src/data/landmarkSites.ts`), its Husk pack with a placed champion at ring 2 scaling, resin seeps harvested with E that use up and regrow, the claimed pylon's resin port at 15 a minute, and a bomb line run from the stone, resin and ley crystal ports alone (tests/sim/huskHive.test.ts, tests/data/huskHive.test.ts).
- `npm run check`: passes (1655 unit tests).
- `npx playwright test` (full run, once): 131 passed, 1 failed, 121 skipped (review shots). The failure was `claiming.spec.ts`'s scripted shrine fight, KO'd on every run on this branch (it passes before 049): the run's RNG stream differs, so the chaotic fight plays out differently. Since review that test clears the shrine's guards through the hook as a declared setup step before the claim (no health top-up; a scripted bot gets no hidden healing); that file re-run passes. New: `huskHive.spec.ts` (find the Hive, its minimap icon; claim it through the hook and see resin wait in the resin port in `getState()`).
- Review shots (docs/review/049): `01-hive-unclaimed-guards.png` (with Thornback, the Husk champion), `02-sheet-seep-stages-and-stones.png` (the seep at each use, bare and regrowing, and the nest stones at 4×), `03-seep-worked-in-world.png`, `04-hive-claimed-resin-mote.png`, `05-resin-port.png`. Of 032's shots only `08-south-east-spring.png` changes (the Hive stands beside the spring) and was retaken; the old one was stale, so the new one also shows earlier specs' HUD changes and the Hollows on the minimap, not only the Hive; 032's minimap shots don't change (the Hive isn't found there). At review, 030's `02-south-east-spring.png` turned out to show the Hive and its pack too, so it was retaken as well (also stale before, it shows the same earlier HUD changes); both south-east spring shots were retaken after the nest stone's light fix.
- `npm run measure`: ammo line and still 5/5 met; ring 1 2.2–3.2 s, ring 2 2.4–4.0 s, ring 3 13.9–14.9 s, all met; the Bulwark's decent build 13/20 with 4 KOs (MISSED, as before 049: 13/20 with 3), the naive bot KO'd 5/5. The small shifts come from the RNG stream (049.10), not from tuning.
