# Art spec

Locks the look so every sprite matches. Approved by Shaun before any sprite goes in.

Since 016 the game is drawn in **clean vector art**, chosen by Shaun from a three-way style test (`docs/art/style-test.html`). The player, the tube and everything in combat are vector. Rooms, foundry pieces, items and the HUD are still pixel grids until 020 replaces them, so this file covers both for now.

## Style
- **View:** three-quarter top-down. You see the tops and fronts of things. Pure art convention, no 3D.
- **Look:** smooth shapes with one shared ink outline, soft gradients and glows, sharp at any screen size. Bright daylight colours, like RuneScape 3 or Realm of the Mad God. The environment in the style test is the target.
- **Light:** from the top left. Top and left edges are lit; bottom and right edges and cast shadows are darker.
- **Scale:** 32-pixel tiles in world px. The wanderer is about 42 px tall; a Husk about 38 and the Warden about 60.
- **Resolution:** the camera shows 640×360 world px at a whole-number zoom, but the canvas draws at the device's real resolution. Vector frames are drawn into textures at boot at that scale (up to 4 texels per world px). Pixel sprites keep nearest filtering, so they stay crisp.
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

## Palettes
Every colour comes from a palette, by id. The source of truth is `src/data/palette.ts`; these tables mirror it, and tests check that they match.

### Daylight (vector art)
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
| `snow` | #ffffff |
| `hit-red` | #ff4d4d |

### Pixel (the remaining grid sprites)
| Symbol | Id | Hex |
| --- | --- | --- |
| `o` | `outline` | #120e1f |
| `v` | `shadow-violet` | #241c38 |
| `s` | `slate-dark` | #2e3347 |
| `S` | `slate` | #464b63 |
| `l` | `slate-light` | #6a7088 |
| `L` | `stone-pale` | #9aa0b4 |
| `m` | `mist` | #c9cedb |
| `p` | `violet` | #4a3a6b |
| `P` | `violet-light` | #7a63a0 |
| `t` | `teal-deep` | #14323a |
| `T` | `teal` | #1f4d52 |
| `g` | `moss-dark` | #24402e |
| `G` | `moss` | #3d6b3f |
| `h` | `moss-light` | #6f9a4f |
| `e` | `earth` | #4a3427 |
| `E` | `earth-light` | #7a573b |
| `r` | `ember-dark` | #7a2e2a |
| `R` | `ember` | #c4552e |
| `y` | `ember-light` | #f0a14a |
| `Y` | `gold` | #f4d27a |
| `c` | `ley-deep` | #1a7f8c |
| `C` | `ley-cyan` | #36e2e0 |
| `w` | `ley-glow` | #a8fff4 |
| `W` | `white` | #f4f7fb |

`.` is transparent.

## Vector sprites
- **Shape data** lives in `src/data/art/`: ellipses, rounded rects, paths (written as short SVG-style strings, `M`, `L`, `Q`, `C`, `Z`) and round-capped lines, with fills (flat, linear or radial gradients), strokes, the outline flag, glows and opacity. Units are world px around an anchor.
- **Static and frame-by-frame sprites** (projectiles, effects, the tube stone) are `VectorSprite`s in `src/data/art/sprites.ts`: a key, a box, an anchor and one shape list per frame. Frame names follow the atlas: `key`, or `key/0`, `key/1` and so on.
- **Rigs** are characters made of named parts with pivots:
  - The wanderer (`wanderer.ts`) has parts for the side, down and up views and a draw order with dynamic pieces (legs, arms, hose, tube, tank window, face glow). `src/render/vector/wandererRig.ts` poses it from sim state every frame: the stance widens, the hips crouch and lean back, each shot shoves and kicks, the cloak flaps.
  - Enemies (`husk.ts`, `wisp.ts`, `warden.ts`) are parts by role (legs, body, head, arms, glow, charge) with a pose table per animation, one pose per frame. They are baked at boot into the frames `src/data/assets.ts` names, such as `husk-walk-side/2`.
- **World pieces with state:**
  - Gathering nodes (018, `nodes.ts`) have a look per use left, bare remains, and regrow stages, picked from the sim's timer.
  - The foundry intake (019, `intake.ts`) is a dormant and an attuned frame of the pipe. Its ring bands, gauge column and fill pulses are drawn live over it from `INTAKE_LOOK`.
- **Render code** never hard-codes a sprite: `src/render/vector/` draws whatever the data says. A new sprite is new data.
- **Review:** `npm run dev`, then open `/sheet.html`. The contact sheet draws every vector sprite, pose and facing at 4×.

## Pixel sprite files (until 020)
- One file per sprite: `assets/sprites/<key>.txt`, where `<key>` is the kebab-case asset key.
- Lines starting with `#` are comments. Every other line is one row of pixels, one palette symbol per pixel.
- Animation frames are separated by a line containing only `---`. All frames are the same size.
- `npm run art` builds `assets/build/sprites.png` and `sprites.json` (a Phaser atlas). A one-frame sprite is the frame `<key>`; animation frames are `<key>/0`, `<key>/1` and so on. A symbol outside the palette fails the build with the file, line and column.
- It also writes review images to `assets/build/review/` (not committed): the palette swatch sheet and each sprite at 4×.
- Register every key in `src/data/assets.ts`. Render code uses those keys, never string literals. A key is either a grid or vector data, never both; a test checks this.
