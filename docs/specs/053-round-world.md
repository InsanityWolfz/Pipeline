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
