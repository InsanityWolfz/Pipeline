# Plan 053: The round world

Spec: docs/specs/053-round-world.md (approved on draft: 053.1–053.3's proposals are built, 053.1's design.md line included). Branch `claude/053-round-world`, from main. Each slice is vertical (data numbers, sim generation, render view), tests first, its own commit, `npm run check` green at each. Anything the spec doesn't decide goes under "Raised after the build" in the spec, with the most conservative choice built.

## The shape, in numbers (src/data/worldShape.ts)
- The overworld becomes a square grid 168 × 168 with the foundry's door at its centre (84, 84).
- Region 1 is the disc within 48 tiles of the door: 7,238 tiles, twice the old Region 1's 80 × 45 (3,600). Danger rings stay concentric: ring 0 under 17 tiles (unchanged, so the tutorial's ground keeps its distances), ring 1 under 30, ring 2 to the barrier.
- 053.2: the Hollows are the ring from 48 to 79 tiles (48 − 17 = 31 wide). The barrier is the whole circle at 48 tiles: a band of gate tiles, so the Hollows open all round once it falls.
- Past 79 tiles the ground rises into a ragged cliff edge, solid out to the grid's edge: the world's natural boundary.
- The ground round the foundry (the ruin field, the meadow, the start stone, the field pack, the meadow's nodes) keeps its shape, moved +4, +64 (old door (80, 20) → (84, 84)); tests reach it through one offset.

## Slices

### 1. The circle, the ring and every place on it (D.1)
- **Data** `worldShape.ts` (new): the size, centre, radii, ring bounds, `polar(bearing, r)` and `fromCentre`. `place.ts` (new): `shiftLandmark` moves a landmark whole (area, features, nodes, guards, pylon, blocks, cache, stamps, seams), so each site keeps its tested inner layout and only its position changes. `landmarkSites.ts`, `hollowsSites.ts`, `grotto.ts`, `springs.ts`, `hollows.ts` (the forum), `overworld.ts` (the shrine, the ruin field): new positions spread round the circle — the Warden's shrine in the north-east quadrant, the Bulwark's forum in the ring's north-west, the sites at their own bearings. `ringOf`, `inHollows`, `regionAt` by distance from the door. Generation counts scale with area (groves, rock fields, ponds, ruin stones ×2; the Hollows' cliff runs, rubble and terraces ×6.9, its old 40 × 45 to the new ring).
- **Sim** `overworldGen.ts`, `hollowsGen.ts`: Region 1's terrain inside the disc, the Hollows' inside the ring, the outer cliff edge; the barrier band's gate tiles; a gate-tile lookup set so shots and feet don't scan the whole band.
- **Tests first** `tests/sim/roundWorld.test.ts` (new): the grid and centre; Region 1 a disc and the Hollows a ring of the spec's widths; rings concentric; the barrier a closed band at 48 tiles that stops feet while shut; the edge solid past 79 tiles, ragged; every landmark, pylon, spring, node, guard and arena reachable on foot from the wake tile once the barrier is down; the Warden's arena in one quadrant; sites spread round (every 90° quadrant holds one); the same seed, the same map. Existing tests that pinned old tiles move to the data.

### 2. Roads without crossings (D.3)
- **Data** `roads.ts` (new): the road network as waypoint lists. Five roads leave the foundry's courtyard (the paved ruin field round the stairs, the network's hub) at their own bearings and branch out to every landmark and both arenas, through the barrier into the Hollows; a branch starts on a waypoint of its parent. `curves.ts` (new): a smooth (centripetal Catmull-Rom) sampler.
- **Sim** the generator stamps the sampled roads two tiles wide, as before.
- **Tests first** `tests/data/roads.test.ts` (new): one connected network (through the hub); no two road segments cross; no two roads run side by side (doubled strips) away from their junction; every landmark, the shrine's gate, the forum's way in and the courtyard joined.

### 3. Ley lines as single smooth curves (D.3)
- **Data** `leyLines.ts` (new): each pylon's line home, a smooth curve from the pylon through its waypoints to its own point on the foundry ruin's edge. The start and meadow seams go; the meadow's vein stands on the Reed Marsh's line. The shrine's and the Ley Grotto's short vein seams stay, meeting only at their pylon.
- **Render** `ground.ts`: seams drawn smooth (no jag), under the roads.
- **Tests first** `tests/data/leyLines.test.ts` (new): each starts on its pylon and ends on the ruin; no line comes near a road; no two lines come near each other but at a shared pylon; no line runs through another landmark.

### 4. Icons travel the claimed lines (D.4)
- **Render** `SupplyView.ts`: each haul runs home as a small icon of its raw (the HUD's item icon at `SUPPLY_LOOK.iconScale`) with its halo, instead of a round mote. `ui().supply` reports the icon frame.
- **Tests first**: the icon frame per raw exists (data test); e2e: a claimed line carries an icon.

### 5. The foundry's entrance (D.2)
- **Data** `art/terrain.ts`: a larger ruined gatehouse over a 9 × 5 footprint: tall rune pillars with lit crystals, a lit doorway, steps going down; `home.ts` (new) holds the footprint, the courtyard and the ruin field's walls.
- **Render** `OverworldView`: the doorway's light pulses.
- **Tests first**: the footprint is solid but the door; the arrival tile open; the sprite on the contact sheet.

### 6. Render for a bigger world
- `OverworldView`: the ground's chunks and the standing sprites are built near the camera and dropped far from it (a 168-tile world baked whole would take ~460 MB of textures); the outer cliff's inner tiles paint flat rather than as sprites.
- `HollowsView`: the barrier's curtain drawn along the circle (only the tiles in view); its collapse's shards in view.
- `MinimapView` / `minimap.ts`: the whole round world at a smaller scale; the objective band moves down under it.

### 7. Tests, bots and the sandbox walk the new map
- e2e helpers take the home offset; the tutorial e2e, landmark, claiming, overworld specs walk the new map by data; `tests/sim` bots and `tests/measure` read the data. The sandbox's Warden arena moves beside the forum's new tiles.
- SAVE_VERSION 9, no migration, the shape fixture regenerated.

### 8. Verify, shots, measure, docs
- `npm run check`; touched e2e files; the full `npx playwright test` once. Review shots in docs/review/053: the whole minimap revealed, the foundry entrance, a road junction, a claimed ley line with icons; older shots retaken only where 053 changes their subject.
- `npm run measure` once, recorded. docs/design.md's line (053.1). A progress entry. Spec stays `approved`.
