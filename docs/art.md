# Art spec

Locks the look so every sprite matches. Approved by Shaun before any sprite goes in.

Since 016 the game is drawn in **clean vector art**, chosen by Shaun from a three-way style test (`docs/art/style-test.html`). Since 020 everything is: the player and combat, the overworld, the foundry interior, its machines and pieces, every item and the HUD. There are no pixel sprites.

## Style
- **View:** three-quarter top-down. You see the tops and fronts of things. Pure art convention, no 3D.
- **Look:** smooth shapes with one shared ink outline, soft gradients and glows, sharp at any screen size. Since the art pass (074–081, Shaun, 2026-10-27) it is clean vector **pushed further**: soft gradients lit from the top left, a rim light on lit edges, glows and shadows; no pixel art and no painted textures. The "Vector, pushed further" and "Ley-lit" cards of `docs/art/style-test-2.html` are the target.
- **Mood per region (074):** Region 1 is sunny and bright (Realm of the Mad God), Stonefall Hollows dusky, the Emberworks orange through smoke, the Stormcrown dark, lit by ley lines and lightning (Hollow Knight). See "Light and region moods" below.
- **Light:** from the top left. Top and left edges are lit; bottom and right edges and cast shadows are darker.
- **Scale:** 32-pixel tiles in world px. The wanderer is about 42 px tall; a Husk about 38 and the Warden about 60.
- **Resolution:** the camera shows 640×360 world px at a whole-number zoom, but the canvas draws at the device's real resolution. Vector frames are drawn into textures at boot at that scale (up to 4 texels per world px), and text renders at it too.
- **Outline:** characters, enemies, projectile bodies and props get the `ink` outline (`OUTLINE_WIDTH`, 0.75 world px). Glows, particles and shading inside a shape don't.
- **Accent:** ley-line cyan marks magic: the tube, the hose, the tank window, the wanderer's face glow, ley bolts and runes. Wisps are violet and fire is ember, so neither reads as ley.
- **Theme rule:** lost magical civilization. Rune-carved stone, glowing ley lines, brass and crystal. Nothing modern.

## Light and region moods (074)
Render only: lights and moods never feed the sim, and the sim never imports them.
- **Two layers.** The **world layer** (the ground, trees, rocks, ruins, region props, nodes, landmark dressing, pylons and fixtures) takes the region's mood and is lit by lights. Views register those objects with `WorldLayer` (`src/render/lighting/`) as they make them. The **readability layer** is never darkened: enemies, bosses and their parts, every telegraph and wind-up, rounds, ground items, the player, health bars, name tags, prompts, waypoints, damage numbers, the HUD and menus draw at full daylight colour in every region. Lights reach it only as the **light catch**: an additive copy of its frame in the light's colour, at most 0.35 alpha, from the two nearest lights at its feet.
- **Moods** (`src/data/moods.ts`, `REGION_MOODS` by danger ring): an ambient (a palette colour and a darkness: 0 white light, 1 the colour), a screen wash (at most 0.06 alpha, under the HUD), a ground fog (colour, alpha and drift) and a light scale (daylight drowns lights, the dark lets them read). Region 1's rings share the sunny mood; the dark regions follow the "Ley-lit" card of `docs/art/style-test-2.html`. The mood follows the camera's centre and blends over 4 tiles each side of a region's edge (48, 79 and 110 tiles out). The sandbox is sunny; the foundry keeps its own warm tint until 079.
- **Lights** (`src/data/lights.ts`): the wanderer's face glow (flaring on each shot), the muzzle flash, blasts, the Conductor's and the Forgewright's attacks, lightning on a storm rod, fires (flaring vents, burning ground, braziers, the Emberworks' kiln mouths and chimney tops), ley glows (crystals, veins, pylons, springs) and ley lines; rounds in flight on High. Ley is cyan, fire ember, lightning storm violet; nothing else glows. Render picks them by priority, then by distance from the camera's centre, up to the tier's budget, and places them: on Medium as a soft additive pool of each light's colour on the ground (`LIGHT_POOL`), on High with Phaser 4's per-pixel lights (`setLighting`). A light sits at a height of `LIGHT_Z` × its radius, so it pools softly. The overworld's ground is drawn in 160 px squares of each chunk and only the squares a light reaches are lit (the rest carry the ambient as a tint, which looks the same), so the lighting's cost follows the lights rather than the screen; on High only the props a light reaches are lit per pixel, the rest tinted, which keeps the draw calls down (a lit sprite breaks Phaser's batch). Lightning in the Stormcrown also flashes the ambient toward `storm-pale` for a moment.
- **Glow halos** (014's additive glow images) stay on every tier as the visible halo; the light adds the ground brightening round it.
- **Flashes off** (042.10): no event places a flash of light (the muzzle flash, blasts, lightning, the face glow's flare) and there is no ambient flash; fires flicker within ±15%.
- **Graphics quality** (Settings, stored in `pipeline.settings`, default Medium; the Canvas renderer runs as Low):

| | Low | Medium | High |
| --- | --- | --- | --- |
| World layer | the ambient as a multiply tint | tinted, with a light pool on the ground under each light | ground and props lit per pixel |
| Lights in view | none | up to 8 | up to 16 |
| Rounds in flight lit | no | no | yes |
| Light catch | no | yes | yes |
| Fog | off | one layer | two layers drifting apart |
| Lightning's ambient flash | no | yes | yes |

- **The ground's blending** (`GROUND_BLEND` in `src/data/art/ground.ts`, baked into the chunks): Region 1's edge with the Hollows follows the true circle as a ragged band of rounded blobs; slag and ash meet in ragged blobs too; broad soft patches 4–8 tiles across in each region's own colours; cracks with a lit lower-right lip on stone, paving, ash and slate (none on Region 1's grass); worn roads with a darker trodden centre, the ground creeping in at their edges and pebbles. It is flat paint: no collision, nothing standing, and paths and ley lines are painted over it.

## World detail and weather (077)
Render only, and decorative only: nothing here is collision, and no file under `src/sim` changed for it. Every colour is a palette id.
- **Plants** (`DECOR` in `src/data/decor.ts`, art in `src/data/art/decor*.ts`): at most 12 px tall, standing on open floor, one chance per tile by its salted `worldTileHash` (Region 1 1 in 7: grass clumps, flower clumps in `snow`, `gold-trim` and `wisp-light`, ferns at grove edges, reeds at pond rims; the Hollows 1 in 14 dry tufts and vines on 1 in 6 cliff faces over open floor; the Emberworks 1 in 24 scorched tufts and ember-thorn scrub; the Stormcrown 1 in 12 wind-bent grass). At most 80 a chunk. They lie flat at `DEPTHS.decor` (over the ground and glows, under the fog, telegraphs, items and feet), one Phaser `Layer` per ground chunk, shown only while the chunk is in view. A plant's ink outline is only on its back blades or none (ferns, vines), so a field doesn't read as ink.
- **Ground scatter** (pebbles, leaf litter, clover; quarry chips, cut flags, rust; slag drips, soot, clinker; slate shards, storm-glass glints, rain-dark patches): baked into the chunk's ground when it's built, no outline, 1 in 10 (Region 1) or 1 in 6 open tiles.
- **Kept clear** (`DECOR_CLEAR`): roads and a tile round them, boss arenas, the barrier's band, ramps and gates, 2 tiles round pylons, nodes, altars, arena doors, 072's return stones, caches, springs, the start stone and the foundry's stairs, and the Frozen Grotto.
- **Ruin variants** (`RUIN_VARIANTS`): new looks for tiles that were already solid, picked in render from the frame `pieceFrame` or a region's picker gives, keeping that frame's shadow so the footprint (059) is the same: Region 1's ruin stones (a toppled column drum, a fallen capital, a leaning rune slab, 3 in 4) and mossy boulders (1 in 5); the Hollows' rubble (a drilled cut block, a broken drum, a heap with scaffold timber, 1 in 4); a broken chimney stump (1 in 6; its fire burns low at its own lip) and a brick pile at a kiln row's east end; bent or snapped iron rods (1 in 6) and cairns with a brass plate or a storm-glass shard (1 in 5).
- **Set pieces** (`SET_PIECES` in `src/data/setPieces.ts`, art in `src/data/art/setPieces*.ts`): three per region on tiles that already stop feet and shots, the tiles under each drawing no sprite of their own: the Fallen Colossus, the Ley Tower and the Watcher; the Unfinished Giant, the Aqueduct Head and the Great Crane; the Great Furnace, the Great Crucible and the Toppled Stack; the Storm Tower, the Stormcaller and the Wind Harp. Each is a still base (it hides the player, 070's silhouette shows them), with a 4-frame loop drawn over it (the Giant's hanging block, the crane's cradle, the furnace's smoke, the harp's wires; held on Low), the Colossus's ivy swaying, and glow halos on runes and crystals. The Ley Tower's crystal is a ley light, the furnace's mouth and the crucible's glow fires (074's table). Hovering one shows its name.
- **Wind and sway** (`WIND`, `SWAY` in `src/data/ambient.ts`): one wind per region (a breeze, the Hollows' gusts, the Emberworks' still air, the Stormcrown's gale), blended with the mood. Plants, vines, trees and tree nodes turn about their foot (grass 4°, flowers 3°, ferns and reeds 2.5°, vines 3°, trees 0.6°, plus a lean downwind of a third), the phase rolling along each plant's own region's wind. Each keeps its own cycle (2.4–3.6 s, trees 4–5 s) whatever the wind: gusts and region blends change only the amplitude and lean, eased over a second, so nothing snaps or flutters. Gusts ease in and out (`GUST_EASE_MS`). Only the chunks in view are stepped, at most 300 (Medium) or 600 (High) objects a frame; nothing sways on Low.
- **Water and ley**: rings on ponds (`foam`) and springs (`cyan-glow`), up to 12 (Medium) or 20 (High, with twinkling glints); beads of `cyan-glow` running along every ley line toward the foundry (or a vein seam's pylon), one every 4 tiles (Medium, at most 24) or 3 (High, at most 48). None on Low.
- **Weather** (`WEATHER` in `src/data/weather.ts`): Region 1's pollen and ley motes (replacing 014's map-wide motes in the overworld), the Hollows' dust (faster in gusts), the Emberworks' ash and embers, the Stormcrown's rain (slanted downwind) and High's splashes. One Phaser `ParticleEmitter` per layer, its values from a seeded render-side stream; at most 40, 100 and 160 live (`WEATHER_CAP`), within the particle budget it shares with 076's death motes; Low's counts in a boss fight; crossfading at region edges (particles over a layer's new count fade out over `WEATHER_MOTION.overMs` rather than vanish, at tier changes too); drawn over everything standing and under bars, names, prompts and the HUD; never in the foundry or the sandbox.
- **Weather lightning** (the Stormcrown, Medium and High, Flashes on, never in a boss arena or fight): every 10–22 s a bolt in 064's look strikes the Storm Tower's crown when in view, else an iron rod at least 6 tiles from the player (never near a Rod Field storm rod), else a cairn or cliff top, with 074's ambient flash and rod-strike light; never a target whose bolt would run down over the wanderer or that sits under the bottom HUD.

## The wanderer
The player is a hooded wanderer of the lost civilization:
- a rust cloak with a gold-trimmed hem over a pale robe
- a shoulder mantle with a gold clasp, a belt with a ley buckle
- no face: a cyan glow in the hood, in the tube's colours, that pulses and flares on each shot
- leather gloves and boots
- the tube held like a minigun, its ringed cyan hose running round the hip into a brass tank on the back

Before the tube attunes, the barrel, rings, hose and tank window are dormant grey-cyan; attuning lights the rings one by one.

## Palette
Every colour comes from the palette, by id. The source of truth is `src/data/palette.ts`; this table mirrors it, and tests check that they match. (The pixel palette went with the pixel sprites in 020.)

### Daylight
| Id | Hex |
| --- | --- |
| `ink` | #1e1a2e |
| `grass-dark` | #2f8a3a |
| `grass` | #45ad45 |
| `grass-bright` | #5cc850 |
| `grass-light` | #8ee060 |
| `sun` | #d6f27a |
| `ground-shade` | #1e4a28 |
| `dirt-dark` | #b88d4f |
| `dirt` | #d9b26e |
| `dirt-light` | #ecd096 |
| `sand` | #e3cf96 |
| `water-deep` | #1f6fc0 |
| `water` | #3a9be8 |
| `water-light` | #7fd0ff |
| `foam` | #d4f4ff |
| `rock-dark` | #5f6880 |
| `rock` | #8e97ab |
| `rock-light` | #c3cad8 |
| `rock-pale` | #e6ebf3 |
| `wood-dark` | #5e3a22 |
| `wood` | #8a5a33 |
| `wood-light` | #b07a48 |
| `leaf-dark` | #1f7a35 |
| `leaf` | #2f9a42 |
| `leaf-light` | #4fc24f |
| `leaf-pale` | #9ae86a |
| `cyan-deep` | #138f9c |
| `cyan` | #2ee6e0 |
| `cyan-glow` | #b8fff8 |
| `hood-dark` | #0d1c24 |
| `rust-dark` | #7a321d |
| `rust` | #b5532f |
| `rust-light` | #dc7d4f |
| `robe` | #e9dcc0 |
| `gold-trim` | #f2c45a |
| `gold-shade` | #b8862e |
| `leather-dark` | #3e2818 |
| `leather` | #5a3a26 |
| `strap` | #6a4426 |
| `brass-dark` | #a8782a |
| `brass` | #e0b04a |
| `brass-light` | #f6dc8a |
| `dormant` | #7d9ea3 |
| `dormant-dark` | #4b6468 |
| `straw-dark` | #a57c34 |
| `straw` | #d9b65a |
| `straw-light` | #f0d88a |
| `cinder` | #ff7a2a |
| `cinder-light` | #ffd27a |
| `flame-dark` | #d8361f |
| `resin-dark` | #c4552e |
| `resin` | #f0a14a |
| `resin-light` | #f4d27a |
| `core-dark` | #4a3a6b |
| `core` | #7a63a0 |
| `wisp-dark` | #5b2f8f |
| `wisp` | #9b5de5 |
| `wisp-light` | #d7b8ff |
| `mask` | #efe6d2 |
| `warden-dark` | #4c5a4a |
| `warden` | #7d8f6e |
| `warden-light` | #b2c29a |
| `moss-tuft` | #5fae3e |
| `mortar` | #3b2b21 |
| `flag-dark` | #6f553f |
| `flag` | #8a6c4f |
| `flag-light` | #a2815e |
| `carve-dark` | #4f3b2f |
| `carve` | #6f5442 |
| `carve-light` | #93745a |
| `hollow-dark` | #3b475c |
| `hollow` | #5f6f88 |
| `hollow-light` | #8c9cb4 |
| `hollow-pale` | #bccadb |
| `iron-dark` | #2f343f |
| `iron` | #566070 |
| `iron-light` | #8a95a6 |
| `iron-rust` | #9a4b2b |
| `vein` | #5ef2ff |
| `danger` | #e8322f |
| `ash-dark` | #3d3735 |
| `ash` | #5f5753 |
| `ash-light` | #857b74 |
| `ash-pale` | #b3a89e |
| `storm-dark` | #2c2b44 |
| `storm` | #47466b |
| `storm-light` | #6b6a92 |
| `storm-pale` | #a19fc4 |
| `storm-glow` | #9a86ec |
| `snow` | #ffffff |
| `hit-red` | #ff4d4d |

## Vector sprites
- **Shape data** lives in `src/data/art/`: ellipses, rounded rects, paths (written as short SVG-style strings, `M`, `L`, `Q`, `C`, `Z`) and round-capped lines, with fills (flat, linear or radial gradients), strokes, the outline flag, glows and opacity. Units are world px around an anchor.
- **Static and frame-by-frame sprites** (projectiles, effects, the tube stone) are `VectorSprite`s in `src/data/art/sprites.ts`: a key, a box, an anchor and one shape list per frame. Frame names are `key`, or `key/0`, `key/1` and so on for animation frames.
- **Rigs** are characters made of named parts with pivots:
  - The wanderer (`wanderer.ts`) has parts for the side, down and up views and a draw order with dynamic pieces (legs, arms, hose, tube, tank window, face glow). `src/render/vector/wandererRig.ts` poses it from sim state every frame: the stance widens, the hips crouch and lean back, each shot shoves and kicks, the cloak flaps.
  - Enemies (`husk.ts`, `wisp.ts`, `warden.ts`) are parts by role (legs, body, head, arms, glow, charge) with a pose table per animation, one pose per frame. They are baked at boot into the frames `src/data/assets.ts` names, such as `husk-walk-side/2`.
- **World pieces with state:**
  - Gathering nodes (018, `nodes.ts`) have a look per use left, bare remains, and regrow stages, picked from the sim's timer.
  - The foundry intake (019, `intake.ts`) is a dormant and an attuned frame of the pipe. Its ring bands, gauge column and fill pulses are drawn live over it from `INTAKE_LOOK`.
- **Render code** never hard-codes a sprite: `src/render/vector/` draws whatever the data says. A new sprite is new data.
- **Review:** `npm run dev`, then open `/sheet.html`. The contact sheet draws every vector sprite, pose and facing at 4×.

## The foundry, machines and pieces (020)
- **Interior** (`interior.ts`): one warm sandstone flag per tile, so the build grid lines up with the floor, with cracked, worn, ley-inlaid and brass variants (`FLOOR_VARIANTS`); carved walls in 3/4 view (a top, and a face with a brass band and a rune course where floor lies below); the carved block, the swaying banner and the four-frame brazier. Warm forge light is the room's mood tint and the braziers' ember glows; ley light pools along conduits.
- **Machines** (`machines.ts`, `mechanisms.ts`): a stone housing per footprint and view, a window onto the machine's own mechanism, a ley crystal that glows while it works and a brass chute on the output side. Each mechanism is a function of its window and the loop's phase. Frames: idle (still, also starved), jammed (stuck part-way with an ember glint, for blocked; render shakes it), and a 4-frame working loop, in three views. The icon of what it makes sits on the top face.
- **Logistics** (`logistics.ts`): conduits are generated from their entry and exit edges (stone trough, cyan channel, brass collars, chevrons riding the flow); the splitter's channels meet at a brass hub. Hopper, crate, gravity stager, build arrows (cyan out, ember in) and status markers.
- **The underground pair** (052, `tunnels.ts`): the channel runs into a carved stone hood and dives under the floor at the entrance, and climbs out of the same hood at the exit; the hood's cyan rune is a chevron pointing down into the floor (entrance) or up out of it (exit). A tunnel shows on the floor as two cyan-glow lines along each tile it passes under (`TUNNEL_LOOK`): bright for a pair's tunnel, faint for an entrance's reach while placing, which ends in a tick.
- **Fixtures** (`fixtures.ts`): the identification bench (052: a wooden workbench with a big brass magnifying glass on one side and an armor rack holding a breastplate on the other; its glass flares as gear is identified), stash, supply port, the exit arch, waystone, the pylon (off, activating, active), door rubble and the room's ley crystal.
- **Items** (`items.ts`): a 16×16 icon per item and ammo, plus the build and menu emblems. The 005 look-alike pairs stay apart by shape: the shaft is a thin rod and the fuse a fat coil; the ley shard is three chunks and the ley bolt one head on a trail; the casing an open shell and the bomb a sealed sphere.

## HUD, menus and text (020)
- **Tablets:** HUD pieces and menus are rune-carved stone tablets with brass corners. Fixed-size pieces are vector frames (`hud.ts`); panels that change size are drawn live in the same look (`src/render/tablet.ts`, `TABLET` in `hudLayout.ts`). The tube slot (025) is ringed in cyan like the tube: one frame per volley size (1–3 wells, brass studs between), above the hotbar cells.
- **Fist** (025, `hud-fist`): the tube slot's melee icon, a rust leather glove curled shut with the thumb across the front, a brass cuff and a soft ink shadow, in the 16×16 item-icon box.
- **Menu rows** light with a cyan rim under the cursor (with the hover sound) and flash brass when pressed. The craft menu, which pauses the game, has a title card.
- **Fonts:** two OFL fonts bundled in `assets/fonts/` with their licences, loaded locally before the game starts: Cinzel (display: titles, names, objectives) and Source Sans 3 (body: numbers, readouts, descriptions). Styles are in `src/data/fonts.ts`; `TextLine` draws them at the screen's resolution.

## Registering sprites
- Register every key in the asset tables (`src/data/assets.ts`, `foundryAssets.ts`, `roomArt.ts`, `props.ts`). Render code uses those keys, never string literals; a test checks every vector frame is registered.
- A frame that was never drawn logs a console error when shown, so the game tests catch it.
