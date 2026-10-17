# Art spec

Locks the look so every sprite matches. Approved by Shaun before any sprite goes in.

## Style
- **View:** three-quarter top-down. You see the tops and fronts of things. Pure art convention, no 3D.
- **Light:** from the top left. Top and left edges are lit; bottom and right edges and cast shadows are dark.
- **Scale:** 32-pixel tiles. Characters are 32 wide and 32 to 48 tall.
- **Resolution:** the game renders at 640×360 and scales up in whole-pixel steps, so one sprite pixel is always a square block on screen.
- **Outline:** characters, enemies, items and machines get a one-pixel outline in `outline`, the palette's darkest color. Floor and wall tiles don't, though mortar lines may use it.
- **Mood:** dusk ruins. Cool slate and violet stone, deep teal shadows, moss, warm ember highlights. Ley-line cyan is the signature accent: it marks magic, so it stays rare on ordinary surfaces.
- **Theme rule:** lost magical civilization. Rune-carved stone, glowing ley lines, crystal conduits. Nothing modern.

## Palette
24 colors. Sprites may use only these. The source of truth is `src/data/palette.ts`; this table mirrors it, and a test checks they match.

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

## Sprite files
- One file per sprite: `assets/sprites/<key>.txt`, where `<key>` is the kebab-case asset key.
- Lines starting with `#` are comments. Every other line is one row of pixels, one palette symbol per pixel.
- Animation frames are separated by a line containing only `---`. All frames are the same size.
- `npm run art` builds `assets/build/sprites.png` and `sprites.json` (a Phaser atlas). A one-frame sprite is the frame `<key>`; animation frames are `<key>/0`, `<key>/1` and so on. A symbol outside the palette fails the build with the file, line and column.
- It also writes review images to `assets/build/review/` (not committed): the palette swatch sheet and each sprite at 4×.
- Register every key in `src/data/assets.ts`. Render code uses those keys, never string literals.
