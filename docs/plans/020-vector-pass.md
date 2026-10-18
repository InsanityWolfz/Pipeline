# Plan 020: Vector pass

Spec: docs/specs/020-vector-pass.md. Written for the unattended run (stacked on 019, `claude/020-vector-pass`). It stays inside the spec: no sim rule, layout or tuning changes.

## Shape of the change
The 016 vector pipeline already exists:
- shape data in `src/data/art`
- baked at boot into the `vectors` texture by `src/render/vector/textures.ts`
- `showFrame` picks the vector frame when one of that name exists, else the atlas

So the pass works frame by frame, keeping today's frame names wherever it can:
1. Add a vector frame under each atlas frame's name. The views keep working unchanged, and each step can be checked on its own.
2. Once nothing reads the atlas, delete the grids, atlas, build script, pixel palette and nearest filtering.

Text moves from the atlas glyph fonts to two bundled OFL fonts drawn with Phaser Text:
- **Display:** Cinzel, a carved roman serif, for titles, names and objectives.
- **Body:** Source Sans 3, a clean sans, for numbers, readouts and descriptions.

The `.ttf` files and their `OFL.txt` licences go in `assets/fonts/`. Vite bundles them, and a `FontFace` load at boot means no network is needed. There is no npm dependency.

## Steps (one commit each, checks green at each)
1. **Fonts and text.**
   - `assets/fonts/` with the two fonts and their licences
   - `src/data/fonts.ts` (keys, families, sizes per use)
   - a font loader in boot
   - a `TextLine` render helper replacing `GlyphLine`, at the backbuffer resolution so it stays crisp when zoomed
   - every glyph-text user (objective, prompts, HUD counts, menus, hover readouts, build tip, wake text, damage numbers, pickup popup) moves to it
2. **Items and icons.** Vector icons for all 19 items and ammo icons, under the same frame names. The 005 look-alike pairs stay different in shape.
3. **Logistics, fixtures and build arrows.**
   - conduits (3 views plus 8 corners, with the flow animation)
   - hopper, crate, sorter (with sort arrow), gravity stager (5 needle frames)
   - identification bench, stash, supply port, doorway stairs, waystone
   - pylon (off, activating, active), ley barrier, rubble
   - facing and input arrows, status markers, emblems, ghost tint
4. **Machines.** For each of the nine:
   - its own mechanism parts on a shared housing (1×1 or 3×1), each with a ley crystal
   - idle and working loops in 3 views
   - frames generated from data by a small rig (parts with a per-frame transform)

   Starved shows the mechanism still. Blocked shows it jammed, with a shake frame and the status marker. The item icon stays on top.
5. **The foundry interior.**
   - sandstone flagstones with rune inlays
   - carved walls with brass fittings, wall tops and edges
   - flickering ember braziers, the banner
   - warm forge light and the cyan ley pools (the glows that already exist), plus a warm ember glow in data
   - a build-grid overlay that stays readable on the new floor
6. **HUD and menus.**
   - carved stone tablets with brass corners as vector frames (nine-slice pieces drawn as Graphics from data where the size varies)
   - the hotbar slot ringed in cyan
   - the crosshair, health bar, ammo strip, worn armor, key caps, craft panel and rows, pickers, stash and bench menus, hover readouts, build tip, pause card, KO text and minimap frame
   - hover and press feedback on every menu row, plus the leftover hover sound
7. **Remove the pixel pipeline.**
   - `assets/sprites/`, `assets/build/sprites.*`, `scripts/build-art.ts` and `scripts/art/`
   - the `art` script and the stale-atlas check
   - `PIXEL_PALETTE`, `ATLAS_KEY`, atlas loading, nearest filtering, `textureOf` fallbacks
   - docs: art.md and process.md
8. **Contact sheet.** A dev page (`?sheet`) that lays out:
   - every machine (idle and working, 3 views)
   - every piece, fixture and item
   - the HUD elements

   It is screenshotted for Shaun's review and committed under `docs/review/`.

## Tests
- **Vitest:**
  - every piece, machine, item and HUD key has shape data
  - no pixel asset keys or grid files remain
  - every colour id is in the palette
  - the font keys and files exist
- **Playwright:**
  - existing suites, updated only for renamed keys and text
  - a font test: both families report loaded with the network blocked, and no console errors
- **QA screenshots:** the spec's list.

## Risks
- **Size.** About 100 frames to redraw. The machines share one rig and housing, so each machine is mostly its mechanism.
- **Text crispness.** Phaser Text at view px under camera zoom blurs, so text renders at the backbuffer scale (`resolution` = fit scale).
- **e2e tests that read glyph text** (hover names, prompts) go through `ui()` strings, not glyph frames, so they should hold.
