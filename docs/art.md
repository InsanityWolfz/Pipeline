# Art spec

Locks the look so every sprite matches. Approved by Shaun before any sprite goes in.

Since 016 the game is drawn in **clean vector art**, chosen by Shaun from a three-way style test (`docs/art/style-test.html`). Since 020 everything is: the player and combat, the overworld, the foundry interior, its machines and pieces, every item and the HUD. There are no pixel sprites.

## Style
- **View:** three-quarter top-down. You see the tops and fronts of things. Pure art convention, no 3D.
- **Look:** smooth shapes with one shared ink outline, soft gradients and glows, sharp at any screen size. Bright daylight colours, like RuneScape 3 or Realm of the Mad God. The environment in the style test is the target.
- **Light:** from the top left. Top and left edges are lit; bottom and right edges and cast shadows are darker.
- **Scale:** 32-pixel tiles in world px. The wanderer is about 42 px tall; a Husk about 38 and the Warden about 60.
- **Resolution:** the camera shows 640×360 world px at a whole-number zoom, but the canvas draws at the device's real resolution. Vector frames are drawn into textures at boot at that scale (up to 4 texels per world px), and text renders at it too.
- **Outline:** characters, enemies, projectile bodies and props get the `ink` outline (`OUTLINE_WIDTH`, 0.75 world px). Glows, particles and shading inside a shape don't.
- **Accent:** ley-line cyan marks magic: the tube, the hose, the tank window, the wanderer's face glow, ley bolts and runes. Wisps are violet and fire is ember, so neither reads as ley.
- **Theme rule:** lost magical civilization. Rune-carved stone, glowing ley lines, brass and crystal. Nothing modern.

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
| `cobalt-dark` | #1f2d66 |
| `cobalt` | #3456b4 |
| `cobalt-light` | #6a8ee4 |
| `hide` | #9a6a40 |
| `hide-light` | #c8955f |
| `bone-dark` | #a39783 |
| `bone` | #d9d0be |
| `bone-light` | #f4efe3 |
| `rim-light` | #ffe6c4 |

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
