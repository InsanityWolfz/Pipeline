# 053: The round world
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 053-055"): the build follows the proposals in the open questions (053.1's design.md line included).

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme D: D.1–D.4) and his interview answers (docs/brainstorm/2026-10-21-world-combat-interview.md). Shaun: "we don't want a square or rectangle. We want like a circle… the stone area… would be the outer ring of the grass area, like a donut… it's a much bigger map, but I think we need to leave a lot of room for exploration."

## Goal
The world becomes round: the grass region a circle around the foundry, the Hollows a ring around it, with clean roads, tidy ley lines that show what they carry, and a foundry entrance that reads as somewhere to go.

## Design references
- docs/design.md: "World, regions, ley lines, bosses" (needs Shaun's OK to update, see 053.1).
- Specs: 017 (the overworld, danger rings, the minimap), 018 (nodes), 032 (landmarks), 034 (the Hollows), 041 (ring scaling), 049 (the Husk Hive), 051 (the fog-of-war minimap, waypoints).

## Acceptance criteria
**The shape (D.1)**
- [ ] Region 1 is a circle centred on the foundry, about twice today's overworld area (Shaun). Its danger rings (017, 041) are concentric bands inside it.
- [ ] The Warden's arena sits in one quadrant; the pylons and landmarks (032, 049) are spread round the circle.
- [ ] The Hollows (034) are a ring around Region 1, of similar width, with the Bulwark's arena in the ring. Its barrier (034) sits on the boundary between the two.
- [ ] The edge of the world past the Hollows is a clear natural boundary (cliffs or water), not a straight line.
- [ ] The layout is data, generated from the seed as today; every landmark, pylon, spring and arena is reachable.

**Roads and ley lines (D.3, D.4)**
- [ ] Paths are one connected road network, laid without crossings or doubled-up strips, joining the foundry, landmarks and arenas (Shaun).
- [ ] Ley lines run as smooth single curves from each pylon home, never overlapping a path or each other (Shaun).
- [ ] Along a claimed pylon's ley line, small icons of the resources it supplies travel home, instead of the round motes.

**The foundry entrance (D.2)**
- [ ] The foundry's entrance reads as a big, obvious place to go in: a larger ruin with the doorway lit and steps down, visible from a distance.

**Checks**
- [ ] `npm run measure` re-run and recorded (packs and the Bulwark); travel distances are new, so the tutorial e2e and the measure bots are updated to walk the new map.

## Data changes
- `src/data/overworld.ts`, `src/data/hollows.ts`, `src/data/landmarkSites.ts`: the round layout.
- `src/data/art`: the new foundry entrance, ley-line resource icons.

## Out of scope
- Boss doors and the rimestone pylon (055); combat changes (054); new regions or enemies.

## Test plan
- Vitest: the circle and ring shapes; every site reachable; danger rings concentric; paths connected with no crossings; ley lines don't overlap; determinism per seed.
- Playwright: the tutorial plays through on the new map; the ley line carries icons.
- Screenshots: the whole minimap revealed, the foundry entrance, a road junction, a claimed ley line.

## Open questions
- **053.1 design.md.** "World, regions, ley lines, bosses" describes regions; proposal: add one line that Region 1 is a circle and the next region a ring around it, on Shaun's OK.
- **053.2 Hollows width and the barrier.** Proposal: the Hollows ring is as wide as Region 1's radius minus its inner ring, and the barrier is a full circle, so the Hollows open all round once it falls.
- **053.3 Travel time.** A bigger map means longer trips home. Proposal: keep fast travel as it is (claimed pylons and the waystone) and judge at playtest.

## Raised after the build
The build's own choices where the spec didn't decide, each with the conservative option built. One round.

- **053.4 Size.** "About twice today's overworld area" read as twice Region 1's 80 × 45 tiles: Region 1 is the disc of radius 48 (7,238 tiles). If it meant the whole old map (120 × 45), the radius would be 59. **Shaun (2026-10-21): "Keep radius 48."** Play it first; grow it later if it feels small.
- **053.5 Danger rings.** Ring 0 keeps its 17 tiles (the tutorial's ground unchanged), ring 1 runs to 30, ring 2 to the barrier at 48. The Hollows (053.2) run from 48 to 79.
- **053.6 Placement.** Every landmark kept its spec's inner layout and moved whole round the circle: the Warden's shrine in the north-east quadrant (bearing 40°, 31 tiles), the Quarry west in ring 1, the Old Grove west-north-west, the Frozen Grotto north, the Ley Grotto east, the Husk Hive east-south-east across from the Grove (049.1), the Reed Marsh south-south-east, the Ruined Cache south-west; in the Hollows the Bulwark's forum north-west, the Cut and Cistern Terrace west-south-west, the aqueduct south. Most of the Hollows' east is empty ground for now.
- **053.7 The roads' hub.** A ley line can't reach the foundry without crossing a road that also reaches it, so the roads meet at the foundry's courtyard (the paved ruin field round the stairs, 11 tiles), not at a junction: five roads leave it, each between two ley lines, and branch from there (junctions out in the field). The ley lines cross the courtyard's paving to the ruin.
- **053.8 Ley lines.** Each pylon's line home ends on the edge of the foundry's ruin, at its own bearing. The meadow's and the start stone's seams (no pylon) are gone; the meadow's ley vein now stands on the Reed Marsh's line. The shrine's and the Ley Grotto's short vein seams stay, meeting only their pylon.
- **053.9 The world's edge.** Past the Hollows: a ragged band of cliffs, then solid cliff plateau to the grid's edge (drawn flat). Not water: the minimap shows water as ground since 051.
- **053.10 Population.** Pack counts rose with the map: ring 1 4 → 8, ring 2 8 → 12, ring 3 6 → 12. Ring 2 doubled put packs round the shrine (now in open ground, no longer at the map's edge) that swamped its fight; 12 still fills 017's ring 2 crowd. Measured in packs per 1,000 tiles of ring (main → 053): ring 1 3.68 → 4.17 (denser), ring 2 4.93 → 2.73, the Hollows 3.33 → 0.97 (now ~7× its old ground). Fuller Hollows would need far enemies to sleep (the sim ticks every enemy). After review, packs also keep out of the shrine's surroundings (its site grown by 14 tiles across and 9 up and down, `POPULATION.shrineMargin`): the Warden's fight stays unjoined, as on main, and the tutorial e2e's bot wins it unaided (before, packs homed round the shrine woke on the way in and joined through its side gaps, KO'ing the bot 3/3). Packs also keep off the barrier's band and every tile touching it (see 053.13). **Shaun's decision (2026-10-21): keep 8/12/12, "judge at playtest"**, along with the Bulwark measure (Results).
- **053.11 Minimap.** The whole round world at 0.6 view px a tile (about 100 px square, was 180 × 67); the objective band moved down under it.
- **053.12 design.md.** 053.1's line is added. The "Regions" line still says the Hollows are "west of the start"; proposal: drop "west of the start" (needs your OK).
- **053.13 Performance.** Two costs of the bigger world were fixed in the build: the barrier's ~430 gate tiles were obstacle boxes every mover scanned each tick (now sealed into a cached copy of the grid, gate tiles sorted once), and `separate()` compared every pair of enemies (now only pairs within `NEAR` px, in the same order: 4 × the largest feet box any enemy can have, 144 px; a unit test checks it pushes exactly as the all-pairs pass). Per tick (`createSim` + 3,000 ticks, loaded machine, µs): a new game 359 on 053 vs 333 on main (noise 311–387); a populated playtest 650 with 147 enemies vs main's 1,079 with 93. Before the fixes: 404 vs 275, and 2,300 once the packs grew. The overworld's ground and standing sprites are built near the camera only (a few chunks of 81; the view's chunks and the row below them, whose tall sprites reach up into it, at once, then the nearest one a frame). Correction after review: the separation change leaves results as they were, but sealing the barrier into the grid did change them. Its band's inner half is ring 2 floor, and packs could spawn there; once the band was wall, an enemy on such a tile was pushed out to the Hollows side and stuck (its pack slot "alive", never replaced). Packs now keep off gate tiles and their neighbours (`population.ts`, tested in tests/sim/barrierPacks.test.ts), which changes where they spawn and so the measure (Results).
- **053.14 Notes from review (cosmetic).** The barrier's ground under its smooth curtain steps tile by tile (the band is whole tiles); left as is. The hive road's spur to the South-east Ley Spring doubled back from the Hive in a hairpin (docs/review/049/04); the hive road now bends on south to the spring and the spur is gone.

## Results (build)
- `npm run measure`: ammo targets met as before; ring 1 and ring 2 packs met (2.2–3.2 s, 2.4–4 s, the measure arenas moved to open ground on the round map); ring 3 4/5 in band (14.1–21.6 s, as main). The Bulwark's decent build: 9/20 meet all three, 6 KOs (main: 14/20, 2 KOs); the naive bot KO'd on 5/5. The forum is unchanged inside, but it no longer sits against the map's edge, where the camera (and so what counts as on screen for the fight) was clamped; recorded, not tuned.
