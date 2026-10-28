# 077: World detail, landmarks and weather
status: done

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. Plan: docs/plans/077-world-and-weather.md.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 15, 17, 18, 20, 21, 27 and 28) and his calls on 077 that day. This is art spec 4 of 8, built in order after 074, 075 and 076. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
The overworld feels lived in. Each region gets more plants, flowers, rubble and ruins, but paths and fight space stay clear. Each region also gets three big set pieces to steer by. Grass and trees sway, water ripples, ley lines flow toward the foundry and motes drift. Each region has its own weather: dust in the Hollows, ash and embers in the Emberworks, rain and lightning in the Stormcrown. None of it changes the game: collision, shots, pathing and the sim stay the same, tick for tick.

## Design references
- docs/design.md "Camera and art" (the 2026-10-27 wording, applied by 074): pushed vector, a mood per region, the Stormcrown "lit by ley lines and lightning", a Graphics quality setting, screen shake only in boss spawns.
- docs/design.md: the theme rule (a lost magical civilization: rune-carved stone, ley lines, brass and crystal, nothing modern) and the regions (053, 060, 064).
- docs/art.md: "Style", "Outline", "Accent" (ley is cyan; Wisps are violet and fire is ember), the palette, "Vector sprites", "Registering sprites". The build adds a "World detail and weather" section.
- docs/specs/074-light-and-moods.md: the art-direction rules for the pass, the two layers (world and readability), the region moods and their 4-tile blend, fog, the lights table and budget, the lightning ambient flash, ground blending, the quality tiers (Low, Medium, High), and 074.2 (no per-frame walk over props).
- docs/specs/076-enemy-polish.md: `PARTICLE_BUDGET` (Low 150, Medium 300, High 500 live particles) and the live death-mote cap (60, 120, 200). Weather shares that budget.
- Earlier specs it builds on: 014 (glows, motes), 017 and 053 (the chunked overworld), 018 (ley lines), 029 (the Frozen Grotto), 030 (Ley Springs), 032 (landmarks), 034, 060 and 064 (the regions), 042.10 (Flashes), 059 (pieces and their footprints), 064 (the lightning bolt look), 070 (the silhouette, and its bucketed cover test), 072 (return stones).

## Depends on
074 (moods, quality tiers, fog, the lightning flash, lights), 076 (`PARTICLE_BUDGET` and `ui().particles`) and 072 (the return stones, for the reachability test). The build starts once they're on main. If one is still unmerged then, the build merges its branch in first and says so in the PR.

## Rules for this spec
1. **Decorative only.** No prop, plant, set piece, ripple or weather particle changes collision, shots, pathing, spawning or any sim rule. No file under `src/sim` changes. `SAVE_VERSION` stays at main's.
2. **The world layout doesn't change.** No tile, wall, room, road or landmark area moves. The overworld's ground stays pinned row by row in tests/sim/worldGround.json. Everything here sits on top.
3. **Deterministic placement.** Where every prop and set piece goes is a pure function of the fixed map, data and `worldTileHash` (the fixed per-tile hash 074's ground already uses), salted per prop set. Weather and ripple timing come from a render-side stream of `src/sim/rng.ts`'s generator with its own seed. No new code calls `Math.random`. Render only reads `rng.ts`; it never touches the sim's own stream.
4. **No per-frame scans.** Nothing walks every prop, chunk or tile each frame (070's silhouette once cost about 40% of the tick rate that way). Motion is stepped only for the chunks the camera's view touches, under a per-tier cap.
5. **Readability.** 074's readability layer is untouched. Plants lie under telegraphs, items and feet. Weather is thin and translucent, and never hides a telegraph, a health bar, a name, a prompt or the HUD.
6. **No critters and no screen shake.** Lightning is a flash that obeys Flashes and reuses 074's flash.

## Prop sets per region (data)
There are three kinds of decor. All of them are in the world layer, so they take the region's mood (074: tinted on Low and Medium, lit on High).

- **Plants**, which sway: grass clumps, flower clumps, ferns, reeds and hanging vines. They are small (at most 12 px tall) and stand only on walkable floor. They draw at one fixed depth, over the ground and glows and under 074's fog, telegraphs and everything standing. So a plant never covers a foot, an item or a telegraph. They are live images, made when their chunk is built.
- **Ground scatter**, flat and still: pebbles, chips, leaf litter, slag drips and slate shards. It is painted into the chunk's ground texture when the chunk is baked, like 074's patches and cracks, so it costs nothing per frame.
- **Ruin variants**: new looks for tiles that are already solid (rocks, ruin stones, rubble, chimneys, rods, cairns). Render picks a variant from the frame `pieceFrame` (059) already gives, within the same piece class, so every footprint stays as it is. `src/sim/tileLook.ts` doesn't change. Landmarks' own blocks (the Quarry's cut stones, the Husk Hive's nest stones, the cache's walls) keep their looks.

Every colour below is an existing palette id. **The palette doesn't change.**

| Region | Plants (sway) | Ground scatter (baked) | Ruin variants (same footprints) |
| --- | --- | --- | --- |
| **Region 1**, sunny meadow | grass clumps (3 shapes) `grass-dark` `grass` `grass-light`, tips `leaf-pale`; flower clumps (3) on `leaf` stems with `snow`, `gold-trim` or `wisp-light` petals and `sun` or `gold-shade` centres; ferns at grove edges (2) `leaf-dark` `leaf` `leaf-light`; pond-rim reeds `leaf` `straw` `straw-light` | pebbles `rock` `rock-light`; leaf litter under groves `leaf-dark` `straw-dark`; clover `grass-light` | ruin stones: a toppled column drum, a fallen capital, a leaning rune slab, in `rock-dark` `rock` `rock-light` with `moss-tuft` and a `cyan` rune; 1 boulder in 5 gets moss and a fern (`moss-tuft`, `leaf`) |
| **Stonefall Hollows**, dusk quarry | dry tufts `straw-dark` `straw` `moss-tuft`; vines hanging from cliff faces `moss-tuft` `leaf-dark` | quarry chips `hollow-light` `hollow-pale`; half-buried cut flags `flag-dark` `flag`; rust stains `iron-rust` | rubble: a cut block with a drill-hole row, a broken column drum, a heap of stone and scaffold timber, in `hollow-dark` `hollow` `hollow-light` `hollow-pale`, timber `wood-dark` `wood`, ley-iron scrap `iron` `iron-rust` with a `vein` glint |
| **The Emberworks**, orange through smoke | scorched tufts `ash-light` `straw-dark`; ember-thorn scrub `rust-dark` `ash-light` | cooled slag drips `ash-dark` with `cinder` glints; soot stains `ash-dark`; clinker `iron-dark` `ash` | chimneys: 1 in 6 a broken stump with soot (`ash-dark` `ash`, brass band `brass-dark` `brass`); a fallen brick pile at a kiln row's end (`rust-dark` `rust` `rust-light`) where a kiln tile's look allows |
| **The Stormcrown**, dark heights | wind-bent grass `warden-dark` `warden` `storm-light`, leaning downwind | slate shards `storm-dark` `storm-light`; storm-glass glints `storm-pale` `snow`; rain-dark patches `storm-dark` | iron rods: 1 in 6 bent or snapped (`iron-dark` `iron` `iron-light`, `brass` band); cairns: 1 in 5 with a brass marker plate (`brass-dark` `brass`) or a storm-glass shard (`storm-pale` `storm-glow` `snow`) |

Region 1's baked tufts and flowers (017) stay as the ground's own texture, and the live plants are added on top.

### Density (data: `DECOR` in `src/data/decor.ts`)
"Moderate", as one chance per eligible tile, picked by the salted hash:

| Region | Plants (per open floor tile) | Scatter (per open tile) | Vines (per cliff face over open floor) | Ruin variants (of their tile kind) |
| --- | --- | --- | --- | --- |
| Region 1 | 1 in 7 | 1 in 10 | none | ruin stones 3 in 4; boulders 1 in 5 |
| Stonefall Hollows | 1 in 14 | 1 in 6 | 1 in 6 | rubble 1 in 4 |
| The Emberworks | 1 in 24 | 1 in 6 | none | chimneys 1 in 6 |
| The Stormcrown | 1 in 12 | 1 in 6 | none | rods 1 in 6; cairns 1 in 5 |

- A chunk holds at most 80 plants (`DECOR.maxPlantsPerChunk`). Past that, the farthest from the chunk's centre are dropped.
- The decor is the same on every quality tier. Only its motion changes (see "Quality tiers").

### Kept clear (data: `DECOR_CLEAR`)
No plant or scatter goes:
- on a road or path tile, or within 1 tile of one (the path's own flecks are unchanged);
- inside a boss arena (the Sunken Forum, the Anvil Hall, the Crown Spire), where the fights are;
- on the barrier's band, a ramp or a gate;
- within 2 tiles of a pylon, node, altar, arena door, return stone, waystone, cache, spring pool, the start stone or the foundry's stairs;
- in the Frozen Grotto's clearing, which keeps its frost;
- on a solid tile (plants and scatter only ever stand on walkable floor; vines hang from a cliff face over it).

## Landmarks: big set pieces (data: `SET_PIECES` in `src/data/setPieces.ts`)
Three per region, each from its region's own theme. They are **set pieces, not 032 landmarks**: no discovery banner, no XP, no minimap icon and no change to any landmark area. Hovering one shows its name, like other world names (015), with no description.

**None of them blocks movement.** Each stands only on tiles that already stop feet and straight shots: trees in a grove, cliff runs, the ring cliffs, kiln rows and cairns. Collision already matches the piece's base, and nothing new is solid. The tiles under its footprint don't draw their own standing sprites; the set piece replaces them.

The places below were found on the fixed map (seed 20261018) by this spec's search. The footprint is the top-left tile, then width × height in tiles. Bearings are degrees clockwise from north, and distances are tiles from the foundry's door.

| Region | Set piece (id) | Where | Footprint, stands on | Look (about w × h px) | Motion and light | Blocks |
| --- | --- | --- | --- | --- | --- | --- |
| Region 1 | **Fallen Colossus** (`fallen-colossus`) | ring 2, north (10°, 40) | (153, 107) 3×2, a grove's trees | A toppled statue of a hooded builder lying among the trees: its head on its side, a dim cyan rune where the face would be (an echo of the wanderer), a shoulder and a reaching stone hand, moss and ivy over it. `rock-dark` `rock` `rock-light` `rock-pale`, `moss-tuft` `leaf-dark` `leaf`, rune `cyan`. 120 × 80 | Its ivy sways with the trees. The rune has a glow halo and no light. | no |
| Region 1 | **Ley Tower** (`ley-tower`) | ring 2, east (111°, 43), between the Ley Grotto and the Husk Hive | (186, 161) 2×2, a grove | A broken round tower of rune-carved stone with a brass collar, its top snapped off. A cracked ley crystal is still caught in its broken crown, glowing. Ivy climbs it. `rock` `rock-light` `brass-dark` `brass`, crystal `cyan-deep` `cyan` `cyan-glow`. 70 × 190 | The crystal breathes like 014's glows and is a ley light in 074's table (cyan, radius 96, intensity 0.7, priority 3; Medium and High). | no |
| Region 1 | **The Watcher** (`watcher`) | ring 2, south-south-west (199°, 43), toward the Ruined Cache | (132, 187) 2×2, a grove | A standing statue of a hooded builder, hands folded on a staff topped with a dead crystal, moss streaking its robe. `rock-dark` `rock` `rock-light`, `moss-tuft`, crystal `dormant` `dormant-dark`. 64 × 170 | none | no |
| Stonefall Hollows | **The Unfinished Giant** (`unfinished-giant`) | the outer cliff edge, north-north-east (21°, 79) | (174, 72) 5×2, cliff | A giant face and shoulders half cut into the quarry face and never finished: chisel steps, a timber scaffold with ropes, and a cut block hanging on chains from a beam. `hollow-dark` `hollow` `hollow-light` `hollow-pale`, timber `wood-dark` `wood` `wood-light`, chains `iron`, a `vein` seam. 200 × 130 | The hanging block and ropes swing (a 4-frame loop). The vein has a halo. | no |
| Stonefall Hollows | **Aqueduct Head** (`aqueduct-head`) | the outer cliff edge, due south (174°, 80), above the Broken Aqueduct | (154, 226) 3×2, cliff | The broken stone water tower where the aqueduct came off the heights: a stepped tower, its dry spillway running down the cliff face, rust streaks, and a channel stub pointing at the aqueduct below. `hollow-dark` `hollow` `hollow-light`, `iron-rust`. 110 × 170 | none | no |
| Stonefall Hollows | **Great Crane** (`great-crane`) | a cliff run in the south-west (223°, 54) | (109, 185) 4×2, cliff | A builders' quarry crane of brass-bound timber on the cliff run. Its jib leans out, and a block cradle hangs from its chain over its own footprint. `wood-dark` `wood` `wood-light`, `brass-dark` `brass`, chain `iron`, block `hollow-light`. 120 × 180 | The chain and cradle sway (a 4-frame loop). | no |
| The Emberworks | **Great Furnace** (`great-furnace`) | the outer cliff edge behind the Anvil Hall (345°, 112) | (118, 38) 4×2, cliff | A towering beehive furnace of rust brick on soot stone, three times a chimney's height, banded in brass with a cyan ley ring. Its mouth glows ember, and smoke rolls from its crown. `rust-dark` `rust` `rust-light`, `ash-dark` `ash`, `brass`, ring `cyan`, mouth `flame-dark` `cinder` `cinder-light`. 150 × 220 | Its smoke is a 4-frame loop. Its mouth is a fire in 074's table (cinder, radius 96, intensity 0.9, ±15% flicker, priority 2; Medium and High). | no |
| The Emberworks | **Great Crucible** (`great-crucible`) | among the Ash Kilns' rows (250°, 97) | (55, 179) 3×2, kilns | A giant brass crucible tipped on a stone cradle, cooled slag frozen in a spill down its lip, an ember glow deep inside. `brass-dark` `brass` `brass-light`, `ash-dark` `ash`, slag `iron-dark`, glow `cinder`. 120 × 110 | A fire light (cinder, radius 72, intensity 0.8, priority 2; Medium and High). | no |
| The Emberworks | **Toppled Stack** (`toppled-stack`) | kiln rows toward the Outpost Forge (204°, 102) | (105, 239) 3×2, kilns | A giant chimney fallen across a kiln row, broken into three drums, its brass band burst and soot spilling out. `ash-dark` `ash` `ash-light`, `brass-dark` `brass`, its ley ring `cyan-deep` gone dark. 130 × 70 | none | no |
| The Stormcrown | **Storm Tower** (`storm-tower`) | cairns by the road up to the Crown Spire (322°, 129) | (66, 45) 2×2, cairns | A broken lightning tower of slate banded in brass, with a crown of bent iron rods and cracked storm-glass panes. `storm-dark` `storm` `storm-light`, `brass-dark` `brass`, rods `iron` `iron-light`, glass `storm-pale` `snow`. 70 × 220 | Weather lightning strikes its crown (see "Weather"). It gives light only during a strike. | no |
| The Stormcrown | **The Stormcaller** (`stormcaller`) | the Emberworks' cliff wall seen from the Stormcrown, south (175°, 112) | (155, 258) 3×2, cliff | A giant builder carved out of the cliff, arms raised to the sky, cyan ley runes down its arms, storm-glass set in its chest. `storm-dark` `storm` `storm-light` `storm-pale`, runes `cyan` `cyan-glow`. 130 × 200 | The runes have a glow halo and no light. | no |
| The Stormcrown | **Wind Harp** (`wind-harp`) | cairns in the west-south-west (232°, 135), toward the Broken Sky-bridge | (40, 229) 3×2, cairns | A giant stone frame strung with brass wires. `storm` `storm-light`, wires `brass` `brass-light`. 110 × 150 | The wires shiver in the wind (a 4-frame loop). | no |

### Placement rules (tested)
1. Every footprint tile already stops feet and straight shots. None is walkable, shot-through (water, slag, chasm), a door, an arena door, a barrier, a ramp or a gate tile.
2. The row just in front (below) the footprint is walkable for at least half its width, so the piece is seen from where the player walks.
3. Its footprint is at least 2 tiles from any road. Its drawn box covers no pylon, node, altar, arena door, return stone, waystone, spring, start stone or road tile.
4. Its base (the opaque pixels in its footprint's bottom row) lies inside its footprint, at most 4 px over the edge, so where you bump into it matches what you see.
5. It registers with 070's occluders, so the player's silhouette shows behind it. Its loops don't change the cover test's key (below).
6. If a rule fails on the build's base, the build moves that piece to the nearest spot within 8 tiles that passes, and lists the move in the PR.

Set-piece smoke, chains and wires are baked frame loops, not particles, so they never touch the particle budget.

## Ambient motion
Motion is render-only and data-driven (`SWAY`, `RIPPLES`, `LEY_FLOW` and `WIND` in `src/data/ambient.ts`).

### Wind (per region)
One wind per region leans the sway, drifts the weather and slants the rain. Like the mood, it follows the camera's centre and blends over 074's 4-tile band.

| Region | Direction (toward, screen) | Strength | Gusts |
| --- | --- | --- | --- |
| Region 1 | east | 1.0 | none |
| Stonefall Hollows | east-south-east | 1.0 | every 6–10 s, ×2.5 for 1.5 s, in step with the dust |
| The Emberworks | east | 0.5 (still, hot air) | none |
| The Stormcrown | south-east | 1.8 | every 4–8 s, ×1.5 for 1 s |

### Sway (grass, flowers, vines and trees)
- Each plant, vine and tree turns a little about its foot: angle = amplitude × wind strength × sin(clock × rate + phase), plus a lean downwind of at most a third of the amplitude.
- The phase comes from the tile hash plus the tile's position along the wind, so gusts roll across a field instead of moving it in lockstep.
- Amplitudes: grass 4°, flowers 3°, ferns and reeds 2.5°, vines 3°, trees and old trees 0.6°. A sway cycle takes 2.4–3.6 s for plants and 4–5 s for trees.
- Tree nodes (018) sway like trees. Their stage frames don't multiply, since sway is a rotation, not new frames.
- **The stepper:** each built chunk keeps a list of its swaying objects. Each frame only the chunks the camera's view touches are stepped: at most 4, since the view is 640 × 360 and a chunk is 640 px. At most `SWAY.perFrame` objects are updated a frame (Medium 300, High 600). Past that, objects are updated in turns, each at least every other frame. Chunks out of view are never touched. When a chunk leaves the view, its objects are left as they stand.
- **The silhouette (070):** rotation changes neither a sprite's frame nor its position, so its cover key and the bucketed lookup stay as they are. Swaying never re-runs the pixel test by itself.
- On Low nothing sways, and every object rests at angle 0.

### Water ripples
- Ponds, including the Reed Marsh's, show rings: one every 1.4–2.6 s at a point in the deep water. Each grows from 2 to 10 px across (squashed to half height) and fades over 1.6 s, in `foam` at alpha 0.5. A Ley Spring's pool shows the same rings in `cyan-glow`.
- Only ponds and springs whose box meets the view are looked at. Each chunk lists its own when it's built.
- Medium shows up to 12 rings in view. High shows up to 20, and adds two `snow` glints a pond that twinkle. Low shows none.
- Ring timing comes from the render-side seeded stream.
- The Slag River and the Stormcrown's chasms stay still (see "Decisions").

### Ley lines flow
- Beads of light run along every ley line toward the foundry, the way hauls run home (053). The Ley Grotto's vein lines run into its pylon.
- A bead is a soft 6 px streak in `cyan-glow`, alpha 0.7, additive, moving at 24 px/s. Medium places one every 4 tiles, at most 24 in view. High places one every 3 tiles, at most 48. Low places none (the baked glowing seam stays).
- Each line's segments get a bounding box once at boot. Each frame, only segments whose box meets the view are looked at, and beads come from a pool.
- Beads carry no light. 074's ley lights stay as they are.

### Motes
Region 1's drifting motes are its weather (below). In the overworld, 014's room-wide motes (`AMBIENT.motes`, spread over the whole 9,344 px map, so almost never seen) are replaced by each region's weather. The foundry and the other rooms keep 014's motes until 079.

## Weather per region (data: `WEATHER` in `src/data/weather.ts`)
Each region has one weather made of layers. A layer has colours (palette ids), a size, a motion, a life, an alpha, a blend and a count per quality tier. Counts are particles alive in view. Particles spawn over the view plus a 32 px margin. When they drift out of view, they're recycled at the upwind edge, so their cost follows the count, not the map.

| Region | Layer | Colours | Look and motion | Life | Alpha, blend | Low | Medium | High |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Region 1, motes | pollen | `sun` `snow` | 1 px, drifting downwind 4–10 px/s with a slow sway | 4–7 s | 0.6 | 6 | 14 | 22 |
| | ley motes | `cyan-glow` `cyan` | 1 px, rising 3–8 px/s | 4–7 s | 0.6, additive on Medium and High | 2 | 6 | 10 |
| Stonefall Hollows, dust | dust | `hollow-pale` `rock-pale` `sand` | 1–2 px, along the wind 12–24 px/s, faster in gusts | 3–6 s | 0.45 | 16 | 40 | 70 |
| The Emberworks, ash and embers | ash | `ash-pale` `ash-light` | 2 px flakes falling 6–14 px/s, fluttering downwind | 4–7 s | 0.55 | 12 | 30 | 50 |
| | embers | `cinder` `cinder-light` | 1 px, rising 10–24 px/s, flickering within ±15% | 1.5–3 s | 0.8, additive on Medium and High | 6 | 15 | 30 |
| The Stormcrown, rain and lightning | rain | `storm-pale` `foam` | 1 × 7 px streaks slanted 15° downwind, falling 320–420 px/s | 0.5–0.9 s | 0.35 | 30 | 80 | 140 |
| | splashes | `storm-pale` | a 3-dot ring on the ground, 120 ms | 0.12 s | 0.4 | 0 | 0 | 20 |
| | lightning | | see below | | | off | on | on |

- **Totals and the cap:** at most 30, 80 and 160 in view by tier. `WEATHER_CAP` is Low 40, Medium 100 and High 160.
- **The shared budget (076):** weather particles count as live particles. Weather spawns a particle only while the live total of every kind is below `PARTICLE_BUDGET` minus the live death-mote cap. So deaths always have their room.
  - Low: 40 + 60 ≤ 150.
  - Medium: 100 + 120 ≤ 300.
  - High: 160 + 200 ≤ 500.
  - That leaves 50, 80 and 140 for 078's bursts.
- **Blending:** a region's weather scales by its weight in 074's mood blend, so crossing a boundary crossfades one weather into the next.
- **Boss fights:** inside a boss arena while its fight is on, weather drops to Low's counts and there is no weather lightning, so fights stay readable.
- **Depth:** weather draws over the world's standing things (`DEPTHS.weather`) and under the supply line's motes, health bars, names, damage numbers, prompts and the HUD. It is never on the HUD camera.
- **Where:** only in the overworld. There is none in the foundry or other rooms (079 owns the foundry), and none in the sandbox's room.
- **Built with** one Phaser `ParticleEmitter` per layer (the particles skill), so each layer is one batched draw. Its emitter random comes from the render-side seeded stream.

### Weather lightning (the Stormcrown)
- **When:** every 10–22 s, from the seeded stream, while the Stormcrown's blend weight is at least 0.5.
- **What it strikes:**
  - the Storm Tower's crown whenever it is in view;
  - otherwise an iron rod (`I` tile) in view at least 6 tiles from the player;
  - otherwise a cairn or a cliff top in view;
  - with nothing suitable in view, it skips that strike.
  - It never strikes a storm-rod node of the Rod Field (064) or within 4 tiles of one, so it can't be mistaken for a rod's charge.
- **How it looks:**
  - the bolt is 064's lightning look (`LIGHTNING_LOOK`, `src/render/bolt.ts`, in whatever colours 076 leaves it), from above the view's top edge to the target, 220 ms;
  - 074's lightning ambient flash (`LIGHTNING_FLASH`), through the same function rod strikes use, so a weather strike and a rod strike together make one flash, never two stacked;
  - 074's "lightning striking a rod" light (`storm-pale`, radius 112, 200 ms) at the target.
- **Never:** on Low; with Flashes off (neither the bolt nor the flash); inside a boss arena or while a boss fight is on; in the foundry.
- **No game effect:** no sim event, no damage, no charge, no sound, no shake.

## Quality tiers (074's setting)

| | Low | Medium | High |
| --- | --- | --- | --- |
| Plants, scatter, ruin variants, set pieces | all | all | all |
| Sway (plants, vines, trees) | off | on | on |
| Sway updates a frame | 0 | at most 300 | at most 600 |
| Set-piece loops (chains, smoke, wires) | held on the first frame | on | on |
| Water ripples | none | up to 12 in view | up to 20, with glints |
| Ley flow | none | a bead every 4 tiles, at most 24 | every 3 tiles, at most 48 |
| Weather | Low counts (cap 40) | Medium counts (cap 100) | High counts with splashes (cap 160) |
| Weather lightning | off | on, if Flashes is on | on, if Flashes is on |
| Set-piece lights (074's table) | none | yes | yes |
| Decor in the mood | tinted | tinted | lit |

- A tier change applies at once, like 074's: sway stops or starts, and pools grow or shrink.
- Decor tints and lighting are set when a chunk is built and on a mood or tier change, never per frame (074.2).
- On the Canvas renderer the game runs as Low (074).

## Performance and tick health
- **The sim** still runs at 60 ticks a second. Everything here is render-only.
- **Same game:** the same seed and commands give the same `getState()` with the world on High, on Low and with `?world=off`.
- **Bounded work a frame:** the sway stepper steps only the chunks in view, and never more objects than its cap. Ripples and ley flow look only at what's in view. Weather never exceeds its cap. None of this depends on how many chunks are built.
- **Frame time on Low (a probe, as 074.4 made it):** in one page, an interleaved A/B compares Low with a dev-only `?world=off` flag. That flag skips plants, sway, ripples, ley flow, set-piece loops and weather, and keeps the set pieces' and variants' still frames. It runs in a Stormcrown pack fight in the rain and in Region 1's densest grove. Low's mean frame time is at most 1.1× that of world off, and its ticks per real second at least 0.9×. The probe is `tests/e2e/worldLifeProbe.spec.ts` with `PROBE=1`, and its numbers go in the PR.
- **Medium and High** frame times are measured in the same scenes and reported in the PR, not asserted. Shaun judges them on his laptop.
- **Chunk build:** decor adds at most 25% to a chunk's build time (074's bake plus its objects), measured and reported. waypointSteady.spec.ts (no stutter while walking) stays green.
- **Boot:** the new vector frames (about 100: plants, variants, set pieces and their loops, the ripple ring, the bead and the weather textures) and the bake time they add are reported.

## Acceptance criteria
- [ ] **Props:** each region shows its plants, scatter and ruin variants from the table, in their palette ids, at their densities (within ±15% over the region's eligible tiles). No plant or scatter breaks a `DECOR_CLEAR` rule. Plants draw under telegraphs, items and feet.
- [ ] **Set pieces:** all twelve stand at their places, pass the placement rules and show their names on hover. The silhouette shows the player behind them. Their lights appear on Medium and High (the Ley Tower, the Great Furnace, the Great Crucible).
- [ ] **No collision change:** passable and shot-through tiles are unchanged, tile for tile. worldGround.json and tests/sim/worldMove.test.ts pass untouched, and no file under `src/sim` changes.
- [ ] **Reachability:** with every gate open, from the wake, every road tile, every pack's spawn tile, a tile beside every pylon, every 072 return stone's travel tile, every arena door's outside tile, every waystone and every spring are reachable on foot.
- [ ] **Determinism:** decor placement is the same on every build, whatever order chunks are built in. A pinned hash per region of one sample chunk's decor list matches. Weather and ripples replay the same from the same seed and frames. No new file calls `Math.random`.
- [ ] **Sway:** on Medium and High, plants and trees turn within their amplitudes and stay at angle 0 on Low. Each frame the stepper touches only chunks in view and no more objects than its cap. Built chunks out of view are never touched.
- [ ] **Water and ley:** ponds and springs ripple on Medium and High, within their caps. Ley beads run toward the foundry within their caps. There are none on Low.
- [ ] **Weather:** each region shows its layers. Live weather particles never exceed the tier's cap. Weather never spawns once the live total reaches the budget minus the death-mote cap. A boundary crossfades the weather. Inside a boss fight, weather is at Low's counts.
- [ ] **Particle budget:** killing 10 Hollows enemies at once in the dust (076's check, with weather on) never shows more live particles than the tier's budget, or more death motes than its cap.
- [ ] **Lightning:** in the Stormcrown on Medium and High, a weather strike draws the bolt, flashes the ambient through 074's flash and places the rod-strike light. It strikes the Storm Tower when it's in view, and never a storm rod node or near one. There's none on Low, with Flashes off, or in a boss fight. A weather strike during a rod strike makes one flash.
- [ ] **Readability:** in the Stormcrown's rain on High, a telegraph's reddest pixels stay at least 85% as red as in Region 1 (074's check). The HUD's pixels match with weather on and off. Enemies in 074's readability layer are not tinted by any of this.
- [ ] **Sim untouched:** the same seed and commands give the same `getState()` on Low, on High and with `?world=off`.
- [ ] **Performance:** the Low probe above meets its budget. Medium and High timings, the chunk build time and the boot bake are reported in the PR. waypointSteady and newGameAfterQuit pass.
- [ ] **Docs:** art.md describes the prop sets, the set pieces, the motion, the weather and their tiers.
- [ ] **Review shots (docs/review/077):**
  - each region's props on High (4);
  - each set piece (12);
  - sway (two frames of one meadow);
  - a pond's ripples and a ley line's beads;
  - each region's weather on High (4);
  - the Stormcrown on Low;
  - a lightning strike at the Storm Tower;
  - the silhouette behind the Ley Tower.

## Data changes
- `src/data/decor.ts` (new): `DECOR` (the sets per region, their sprites and densities, `maxPlantsPerChunk`), `DECOR_CLEAR`, the decor depth.
- `src/data/art/decor*.ts` (new, split by region to stay near 300 lines): the plant, scatter and ruin-variant shapes.
- `src/data/setPieces.ts` (new): `SET_PIECES`, with each one's id, name, region, footprint, frames, loop, light and hover name.
- `src/data/art/setPieces*.ts` (new, split by region): their art and loops.
- `src/data/ambient.ts` (new): `WIND`, `SWAY` (amplitudes, rates, `perFrame` by tier), `RIPPLES`, `LEY_FLOW`.
- `src/data/weather.ts` (new): `WEATHER` by region and its layers, `WEATHER_CAP`, `WEATHER_LIGHTNING` (interval, targets, the rod-node margin, the player margin), and the render-side seed.
- `src/data/lights.ts` (074): the three set-piece lights.
- `src/data/silhouette.ts`: set pieces join what hides the player.
- `src/data/assets.ts`: `DEPTHS.decor` and `DEPTHS.weather`, the new frame keys and the weather texture keys.
- No palette, sim, save, tile or room changes. `SAVE_VERSION` stays at main's.

## Out of scope
- Critters of any kind (Shaun: none).
- Screen shake (080, boss spawns only).
- Sound: rain, wind and thunder.
- New collision of any kind. A set piece that blocks would be sim data in its own spec, with reachability tests.
- Minimap icons, discovery or XP for set pieces.
- The Slag River's and the chasms' motion.
- Light from the kilns' and chimneys' mouths: that is 074.7, Shaun's call; 077 doesn't change it.
- The foundry and other rooms (079), and the sandbox's room.
- Ammo trails, impacts and bringing other bursts under the budget (078).
- Boss intros and phases (080), the HUD (081), the wanderer (075), enemies (076).
- Automatic quality detection, shaders and filters.

## Test plan
- **Data (tests/data):**
  - `setPieces.test.ts`: the placement rules 1–4 on the generated map, palette ids, frames registered, names present;
  - `decor.test.ts`: every set's sprites and palette ids exist, densities in range;
  - `weather.test.ts`: every region has weather; each tier's counts are within `WEATHER_CAP`; the cap plus 076's death-mote cap is within `PARTICLE_BUDGET` on every tier; palette ids.
- **Sim (tests/sim):** `worldDecorReach.test.ts`: the reachability criterion with every gate open (tests/fixtures/reach.ts), and every set piece's footprint solid and shot-stopping. worldMove.test.ts and worldGround.json are kept unchanged.
- **Render (tests/render, Vitest):**
  - `decorPlace.test.ts`: the `DECOR_CLEAR` rules on every region; the same output twice and in any chunk order; pinned hashes; variants keep their piece class;
  - `sway.test.ts`: the stepper with 25 built chunks and 4 in view touches only those 4; the cap and turn-taking; angle bounds; Low touches none;
  - `ripples.test.ts` and `leyFlow.test.ts`: caps, direction toward the foundry, only what's in view;
  - `weatherSpawn.test.ts`: the budget gate, blend weights, the arena rule, and the lightning schedule from its seed and its targets (the tower first, never near a rod node, at least 6 tiles from the player, none on Low, with Flashes off or in a fight);
  - `noMathRandom.test.ts`: the new files' source has no `Math.random`.
- **Playwright (tests/e2e/worldLife.spec.ts):**
  - `ui().world` reports per built chunk its plants, variants and set pieces, the sway's updated count and chunks stepped this frame, ripples, ley beads and set pieces in view;
  - `ui().weather` reports blend weights, live particles per layer, the cap and lightning strikes and target;
  - `ui().particles` (076) counts weather;
  - the test hook gains `strikeWeather()` (the next weather strike now);
  - checks: decor per region; the set pieces at their places with hover names; the silhouette behind one; sway on Medium (angles change between frames) and none on Low; ripples and beads; each region's weather on each tier within its cap; the 10-kill budget check in the dust; a forced strike with its flash and light, and none with Flashes off, on Low and in the Conductor's fight; the per-frame bounds while walking across chunk lines; readability under rain; the same `getState()` on Low, High and `?world=off`.
- **Probe:** `tests/e2e/worldLifeProbe.spec.ts` with `PROBE=1`, the Low A/B and the tier timings.
- **Kept green:** lighting.spec.ts (074), the 076 enemy specs, art.spec.ts (the sheet), landmarks.spec.ts, returnStones.spec.ts, waypointSteady.spec.ts, newGameAfterQuit.spec.ts and the e2e files the change touches. The full suite runs in CI.
- **Build order:** one PR in three slices.
  - Slice A: the decor system, sway, ripples, ley flow, motes and Region 1's sets and set pieces.
  - Slice B: the Hollows and the Emberworks.
  - Slice C: the Stormcrown, lightning and the probe.
  - A plan file, since it spans several systems.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **Three set pieces per region**, all on tiles that were already solid, so **none blocks anything new**: the Fallen Colossus, the Ley Tower and the Watcher (Region 1); the Unfinished Giant, the Aqueduct Head and the Great Crane (the Hollows); the Great Furnace, the Great Crucible and the Toppled Stack (the Emberworks); the Storm Tower, the Stormcaller and the Wind Harp (the Stormcrown).
- **Set pieces aren't landmarks:** no banner, XP or minimap icon. They show their name on hover.
- **Decor is the same on every tier.** Only motion and weather scale. Low has no sway, ripples or ley flow, and thin weather.
- **Plants lie flat in depth**, under telegraphs, items and feet, rather than sorting by feet, so they never hide anything.
- **Ruin variants** reuse solid tiles' footprints (059), so rubble and ruins are added without any new solid ground.
- **Wind per region** (Region 1 a breeze, Hollows gusts, Emberworks still air, Stormcrown a strong south-east wind) leans the sway and drives the weather.
- **Motes in the overworld** become Region 1's pollen and ley motes, replacing 014's map-wide motes there. The foundry keeps 014's until 079.
- **Weather numbers:** at most 30, 80 and 160 in view (Low, Medium, High), capped at 40, 100 and 160. Weather always leaves the death motes' room, and 50, 80 and 140 for 078.
- **Boss fights** keep weather at Low's counts and have no weather lightning.
- **Weather lightning:** every 10–22 s, Medium and High only, with Flashes on. It goes to the Storm Tower first, never near a storm rod, at least 6 tiles from the player. It uses 074's flash and rod-strike light, so the two never stack. No thunder, since sound is out of scope.
- **Smoke, chains and wires** on set pieces are baked loops, not particles.
- **No palette change:** Region 1's flowers use the existing `snow`, `gold-trim` and `wisp-light`.
- **Left still:** the Slag River and the chasms. Say if you want the slag to crawl like the water moves.
- **Kiln light (074.7)** is untouched here. Only the Great Furnace and the Great Crucible give fire light.

## Open questions
None.

## Results
Built on `claude/077-world-and-weather` (PR #94) to docs/plans/077-world-and-weather.md, stacked on 074, 075 and 076 (`claude/074-light-and-moods` and `claude/076-enemy-polish`, which holds 075, merged in; 077 merges after them). No file under `src/sim` changed, no tile moved (tests/sim/worldGround.json and worldMove.test.ts untouched), and `SAVE_VERSION` stays at main's 22: nothing in the save changed. Every set piece stands where the spec's search put it (placement rules 1–4 pass on the build's base; no move under rule 6).

- **Data:** `src/data/decor.ts` (`DECOR`, `RUIN_VARIANTS`, `DECOR_CLEAR`), `setPieces.ts`, `ambient.ts` (`WIND`, `SWAY`, `RIPPLES`, `LEY_FLOW`), `weather.ts` (`WEATHER`, `WEATHER_CAP`, `WEATHER_BUDGET`, `WEATHER_LIGHTNING`, `WEATHER_SEED`), `worldArtAssets.ts` (re-exported by assets.ts, with `DEPTHS.decor` 0.27 and `DEPTHS.weather`), `SET_PIECE_LIGHTS` in lights.ts, `setPieces` in silhouette.ts. Art: `src/data/art/decor{Meadow,Hollows,Ember,Storm}.ts`, `setPieces{Meadow,Hollows,Ember,Storm}.ts`, `worldArt.ts` (91 new vector frames).
- **Render:** `src/render/world/` — pure: `decorPlace` (placement, the keep-clear mask, set-piece footprints), `variants`, `sway` (the stepper), `ripples`, `leyFlow`, `wind`, `weatherModel`, `weatherLightning`; Phaser: `DecorView` (per chunk: plants in 160 px square layers shown only near the view, vines, set pieces with loop, sway part and halos), `WaterLeyView`, `WeatherView` (one `ParticleEmitter` per layer, drawing the model), `WorldLife` (the frame), `scatter` (baked into the ground). OverworldView draws ruin variants, skips footprint tiles and files its trees with the sway; tree nodes sway (NodeView); set pieces light (lightSources), name on hover (hoverNames) and hide the player (070); weather lightning goes through 074's `LightPulses.strike` (one flash with a rod strike) and rod-strike light; 014's motes leave the overworld. The hook gains `ui().world`, `ui().weather`, `ui().chunkBuildMs`, `worldLifeOff()` and `strikeWeather()`; dev `?world=off`.
- **Unit tests** (tests first): `npm run check` green, 321 files, 2749 tests (103 new: tests/data/decor, setPieces, weather; tests/sim/worldDecorReach; tests/render/decorPlace (pinned per region), sway, ripples, leyFlow, weatherSpawn, wind, worldShown, setPieceHover, noMathRandom).
- **e2e** (each file alone, `--workers=1`, port 5341): tests/e2e/worldLife.spec.ts (7 tests: decor per region, the set pieces named on hover with their lights on Medium and High and none on Low, the silhouette behind the Storm Tower, sway, ripples and beads, the per-frame bounds, the world off, the same game on Low, High and `?world=off`) and worldWeather.spec.ts (4 tests: weather per region and tier, the budget gate through a 10-kill burst, forced weather lightning and none with Flashes off, on Low or in the Conductor's fight, readability under the rain), green. Kept green locally: lighting, landmarks, art, waypointSteady, newGameAfterQuit, feedback. The full suite runs in CI.
- **Performance** (worldLifeProbe.spec.ts, `PROBE=1`, headless Chromium on its software renderer, 1280×720, a shared 4-core machine under load from other builds, load average about 5; medians of 2.5 s windows, the A/B interleaved 8 rounds in alternating order):

| Scene (ms a frame, mean / p95; ticks a second) | world off | Low | Medium | High |
| --- | --- | --- | --- | --- |
| Stormcrown pack fight in the rain | 119.1 / 164.0; 59.0 | 108.2 / 138.1; 61.1 (tier run 105.0 / 125.5) | 106.7 / 122.5; 59.2 | 303.2 / 376.1; 25.4 |
| Region 1's densest grove (the Fallen Colossus) | 93.5 / 115.1; 60.3 | 92.5 / 123.0; 58.5 (tier run 97.8 / 133.3) | 100.4 / 125.8; 58.6 | 212.3 / 270.7; 45.1 |

  - Low against the world off: 0.91× (Stormcrown) and 0.99× (grove) the frame time (budget 1.1×), 1.04× and 0.97× the ticks a second (budget 0.9×). An earlier run under heavier load read 1.67× in the Stormcrown with the old per-chunk plant layers (every plant of up to 6 chunks drawn); the plants are now drawn in 160 px squares near the view only.
  - A chunk's whole build (bake, standing sprites and decor), 57 chunks each way: 52.2 ms with the world off, 60.9 ms with it (+17%, budget 25%).
  - Boot bake: 91 new frames, 8.2 ms to draw at 2× (the vector atlas bakes them once).
  - Weather on screen: at most 32 (Region 1), 70 (Hollows), 80 (Emberworks) and 160 (Stormcrown) on High, within `WEATHER_CAP`.
- **Review fixes:** the sway keeps each plant's own cycle (the rate no longer follows the wind, which jumped the phase at gusts and fluttered across region blends late in a session); the wind's strength and lean ease over `SWAY.easeMs` (1 s), and the phase runs along each plant's own region's wind. Unit tests bound the frame-to-frame change across a gust and a blend at 10 minutes in (before: 4.2° and 5.2° a frame; after: under a plant's own swing). Gusts ease in and out (`GUST_EASE_MS`, 300 ms). Weather over a layer's target fades out over `WEATHER_MOTION.overMs` (400 ms) instead of vanishing; `ui().weather.live` counts the particles that count toward the targets and `fading` the rest (the budget counts both). The world report's per-chunk list is worked out only when the hook reads it. Weather lightning skips targets whose bolt would run over the player or that sit under the bottom HUD. The model's and views' literals moved to named data (`WEATHER_MOTION`, `SWAY.hashPhase`/`ivy`/`nodeCycle`, `DECOR.vineHang`, `RIPPLES.ringAcross`/`depthOverGlow`/glint `pool`, `SET_PIECE_BREATHE`). Motion strips on Playwright's fake clock (30 frames over a second): `50-sway-gust-strip.png` (a Stormcrown gust's start, the sampled angle changing at most 0.5° a 33 ms frame) and `51-sway-border-strip.png` (a walk through the Emberworks–Stormcrown border's gap): no snap, pop or flicker. 41 re-taken from beside the tower (the old spot stood in the bolt's column).
- **Review shots (docs/review/077):** 01–04 each region on Low and High; 05–08 each region's weather on High (the view's middle at twice the size); 10–21 each set piece on High; 30–31 a meadow swaying (two frames); 32 a pond's ripples (and a spring's); 33 a ley line's beads; 40 the Stormcrown on Low; 41 weather lightning striking the Storm Tower (the bolt held on the tween clock, the ambient flash); 42 the silhouette behind the Ley Tower.

## Raised after the build
Conservative choices built; items marked **(Shaun)** want a yes or a change at the playtest.

- **077.1 The shared particle budget's seam (076 isn't on main).** `WEATHER_BUDGET` mirrors 076's `PARTICLE_BUDGET` (150, 300, 500) and live death-mote cap (60, 120, 200); weather spawns only while every live particle is below their difference, and leaves 50, 80 and 140 for 078. When 076 merges, `WEATHER_BUDGET` reads its constants and `ui().particles` counts weather (today's `ui().particles`, a number older specs wait to reach 0, is unchanged; weather reports its own in `ui().weather`). The 10-kill check in the dust: 014's bursts aren't under the budget until 078, and 10 kills at once reach 279 live on Low and 493 on High with the weather; the weather stops spawning while the budget is used and never passes its cap. **Since 076 merged in:** `WEATHER_BUDGET` reads 076's `PARTICLE_BUDGET` and `DEATH_MOTES.liveCap` (no copy), `ui().particles.live` counts the weather, and the death motes' room counts it too. The 10-kill check now holds every live particle within the tier's budget (at most 101 on Low and 271 on High, against 150 and 500: 076's death motes replaced 014's death bursts) and the death motes within their live cap, with the weather on.
- **077.2 072's return stones aren't on main.** `DECOR_CLEAR` keeps 2 tiles round the spot 072 puts each (three west of its arena door's `leaveTo`), and the reachability test walks to each one's travel tile, so nothing changes when 072 lands.
- **077.3 A broken chimney stump burns low at its own lip (Shaun).** 074.7 gives every chimney a fire at its top; a stump (1 in 6) is shorter, so its fire sits at the stump's lip (`fire.chimney.stumpRise`), still a fire. Kilns under a set piece (the Great Crucible's and the Toppled Stack's rows) aren't drawn, so they give no fire light.
- **077.4 Brick piles at kiln rows' ends (Shaun).** The spec gives no density: 1 in 2 front kilns at a row's east end show a brick pile at their foot; their mouths still glow, so 074.7's kiln light stays.
- **077.5 Region 1's ruin variants** replace only the plain ruin stone (the broken columns keep their look, as the spec's list names "ruin stones"); landmarks' cut blocks and nest stones never change.
- **077.6 The Colossus's ivy** sways at a vine's amplitude (3°): a tree's 0.6° doesn't show on a hanging part.
- **077.7 Tall set pieces and the locked camera.** The camera shows 360 px and follows the player (042), so the tallest pieces (the Furnace and the Storm Tower, about 220 px) show whole only from beside or behind them; walking up to their fronts shows their bases and lower bodies. The shots stand beside them.
- **077.8 The sway's view.** The stepper looks at the chunks the view itself touches (at most 2 × 2) and the row a margin below (tree feet below the view, canopies in it), and turns objects within 64 px of the view.
- **077.9 `?world=off` also skips the baked scatter and building plants**, so the probe's build-time A/B measures all of the world's detail.
- **077.10 Weather, ripples and beads aren't in the mood:** they draw in their own colours (chosen per region), as glows do.
- **077.11 Weather lightning keeps 6 tiles from the player** for cairns and cliff tops too, not only rods.
- **077.12 Frame times (Shaun).** High costs 2–3× Low on the software renderer (074.5's per-pixel lights); Medium costs about what Low does. Please try High in the Stormcrown's rain on your laptop.
- **077.13 Pond ripples are small** (2–10 px across, as specced), one ring every 1.4–2.6 s a pond: they read as a light stir, the springs' cyan rings a little more. If you'd like the ponds livelier, the ring size and rate are data.
- **077.14 The silhouette and wide set pieces.** 070 tests props standing within 96 px of the player's feet, so behind the widest pieces' far ends (the Unfinished Giant is 200 px wide) the player may not show through; behind their middles they do.
- **077.15 Weather lightning keeps clear of the player and the HUD (review).** A target is skipped when its bolt would run down over the player (within `WEATHER_LIGHTNING.playerColumn`, 81 px either side: the bolt's spread and jag and half the wanderer, landing lower than 24 px over the player's middle) or land in the bottom HUD's strip (`hudClear`, 66 px). A forced strike had run straight down through the wanderer and ended under the hotbar.
- **077.16 Gusts don't show in the sway (Shaun).** The sway's wind strength is capped at 1 (`SWAY.maxStrength`), and the Hollows' and Stormcrown's winds are already at it, so their gusts now show only in the dust and the rain's drift; before the review fix they sped the sway up, which is what made it snap. Raising `SWAY.maxStrength` (e.g. to 1.5) would let a gust swell the sway, eased, if you'd like to see it.
- **077.17 The Stormcrown's grass is hard to see in motion.** In the motion strip its wind-bent grass is dark on dark ground and sparse, so the sway barely reads there; Region 1's meadow shows it (30, 31).
