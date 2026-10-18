# 020: Vector pass
status: approved

Approved by Shaun, 2026-10-18 ("I approve all"), for an unattended run.

## Goal
Everything still drawn as pixel grids moves to the 016 vector style:
- the foundry interior, lit by a warm forge glow
- machines whose mechanisms you can watch work
- the logistics pieces and fixtures
- the pylon and waystone
- every item and icon
- the HUD and menus, as carved stone and brass with real fonts

When this ships, no pixel sprite is left, and the pixel pipeline is removed.

## Design references
- docs/design.md: "The Foundry" (walk-around building, "Machines show where the bottleneck is"), "World, regions, ley lines, bosses" (fantasy machines, crystal conduits, the theme rule), "Tech and prototype scope" (Camera and art, as updated by 016)
- docs/prototype.md: "Crude animations needed" (machine idle and working loops, ammo moving between machines, pylon off and activating)
- docs/art.md as rewritten in 016
- docs/specs/006-foundry-building.md, 013, 015: the pieces, statuses, arrows, readouts and menus being redrawn
- Shaun's notes, 2026-10-18: "The foundry is good it just needs the updated sprites"; "all of the sprites need a pass after this change"
- Shaun's interview answers, 2026-10-18:
  - a warm forge glow
  - visible mechanisms
  - a fantasy display font with a clean body font
  - carved stone and brass for the HUD

## Acceptance criteria

**The foundry interior (render, data)**
- [x] The layout, collision and grid are unchanged. The floor, walls, corners and props are redrawn in vector:
  - warm sandstone flagstones with rune inlays
  - carved walls with brass fittings
  - ember braziers that flicker
  - cyan ley light pooling around conduits, items in flight and the intake pipe (019)
- [x] The build grid stays readable on the new floor in build mode.

**Machines (render, data)**
- [x] Each of the nine machines has a distinct, visible mechanism powered by a ley crystal. Each has idle and working loops in all three facings:
  - **Cutter:** a saw blade spins through a log.
  - **Knapper:** a stone hammer strikes a block.
  - **Spinner:** a spindle wheel turns, winding fiber.
  - **Assembler (3×1):** brass arms join shaft, head and rope.
  - **Shaper:** a press stamps a casing.
  - **Fuse-maker:** resin drips onto a twisting cord.
  - **Grinder:** a millstone turns over crystal.
  - **Packer (3×1):** arms pack a casing.
  - **Focuser:** a crystal lens gathers light into a bolt.
- [x] Each machine still shows the item it makes. Its working, starved and blocked status still reads at a glance, through the mechanism moving, stopping or jamming plus the status marker.

**Logistics and fixtures (render, data)**
- [x] Redrawn in vector, with their sim and behaviour unchanged:
  - conduits, straight and all 8 corners, with items riding them
  - the hopper
  - the crate, with its count
  - the sorter, with its sort arrow
  - the gravity stager, with its needle and spread fan
  - the identification bench
  - the stash
  - the supply port
  - the foundry exit stairs
  - the waystone
  - the pylon: off, activating and active
  - the ley barrier
  - the rubble
- [x] Build mode's facing arrows, input arrows, ghost and placement drop-in are redrawn to match.

**Items and icons (render, data)**
- [x] Every item has a vector icon, used on the ground, in the HUD, in menus and riding conduits:
  - wood, stone, fiber, ley crystal, husk resin
  - shaft, arrowhead, rope, casing, fuse, ley shard, warden core
  - unidentified armor
  - the arrow, bomb and ley bolt ammo
  - light and heavy armor
- [x] The look-alike pairs from 005 stay different in shape: fuse and shaft, ley shard and ley bolt, casing and bomb.

**HUD and menus (render, data)**
- [x] Two fonts are bundled in the repo under an open licence (OFL or similar), with their licence files, and loaded locally with no network:
  - a carved-serif display face for titles, names and objectives
  - a clean body face for numbers, readouts and descriptions
  - They replace the 3×5 letter font and the digit font. This adds font files only, no npm dependency.
- [x] HUD frames and menus are rune-carved stone tablets with brass corners, and the hotbar slot is ringed in cyan like the tube. This covers:
  - the health bar
  - the hotbar and ammo strip
  - the worn armor
  - the objective line
  - key prompts
  - the craft menu
  - the hopper and sorter pickers
  - the stash and bench menus
  - the hover readouts and build-bar descriptions
  - the pause title card
  - the KO text
  - the minimap frame (017)
- [x] The crosshair, damage numbers and the "+1" pickup popup are redrawn to match.
- [x] Every menu row has hover and press feedback. The hover sound left over from 014 is added.

**Removing the pixel pipeline (scripts, docs)**
- [x] No pixel grid sprite remains. The grids, the atlas, `npm run art`, its build script, its stale-atlas check, the pixel palette and nearest filtering are removed. `docs/art.md` and `docs/process.md` drop the pixel pipeline.

**Rules unchanged**
- [x] No sim rule changes. Every unit and e2e test passes, updated only for renamed asset keys and text rendering.

**Checks**
- [x] `npm run check` and `npm run test:e2e` pass.
- [x] A contact sheet of every machine (idle and working), piece, fixture, item and HUD element is pending Shaun's review.

## Data changes
- `src/data/art/`: foundry interior, machines, logistics, fixtures, pylon, items, HUD and menu shapes.
- `src/data/assets.ts`: vector keys only.
- `src/data/palette.ts`: the pixel palette is removed. Warm interior tones are added to the daylight palette if needed.
- Font files and licences under `assets/fonts/`, with a font key table in `src/data`.

## Out of scope
- Any change to the foundry's layout, rules or tuning.
- New machines or pieces.
- A settings menu.
- Music.

## Test plan
- **Vitest:**
  - Every piece, machine, item and HUD key has shape data.
  - No pixel asset keys remain.
  - Every colour id is in the palette.
  - The font keys exist.
- **Playwright:**
  - All existing foundry, crafting, armor, claiming and tutorial tests pass.
  - There are no console errors, and the fonts load offline.
- **Screenshots (qa):**
  - the foundry with a full arrow line running
  - each machine working, starved and blocked
  - build mode with arrows and the ghost
  - every menu
  - the HUD in combat
  - item icons in the stash
  - the pylon states

## Build notes
Built unattended on `claude/020-vector-pass`, stacked on 019, from `docs/plans/020-vector-pass.md`. No sim rule, layout or tuning changed (one render-only addition is the attune follow-up already on 019).
- **Fonts.**
  - Cinzel (display) and Source Sans 3 (body) are in `assets/fonts/` with their OFL licences, loaded with `FontFace` before the game starts. No npm dependency.
  - `TextLine` (Phaser Text at the screen's resolution) replaced the 3×5 glyph fonts everywhere.
  - Boot now waits for the fonts and views (`ui().ready`). The smoke test blocks the network and checks both fonts loaded.
- **Every sprite is vector**, under the frame names the views already used where possible:
  - items and emblems (`items.ts`)
  - conduits, sorter, hopper, crate, stager, arrows and markers (`logistics.ts`)
  - fixtures and the pylon (`fixtures.ts`)
  - machines (`machines.ts`, `mechanisms.ts`)
  - the interior (`interior.ts`)
  - the HUD (`hud.ts`)
- **Machines** now have their own frames (`MACHINE_SPRITES`), replacing the two shared housings:
  - idle, which also covers starved
  - jammed, for blocked: stuck mid-stroke with an ember glint, and the body shakes
  - a 4-frame working loop at 8 fps
  - each in three views
- **The sorter's sort-side arrow** has its own gold frames instead of a fill tint, which had flattened its outline.
- **The interior.**
  - One flag per tile, so the build grid is the floor's own mortar lines.
  - The pixel floor themes' moss and the mossy wall top became worn, inlaid and brass flags, and a studded wall top.
  - Seven warm interior tones join the daylight palette.
  - The foundry's mood is a warm forge tint, braziers glow wider, and ley light pools along conduits and sorters.
- **HUD and menus.**
  - Fixed pieces are vector tablets. Panels that change size draw the same tablet live: the objective, names, the build tip, readouts, pickers, the pylon, stash and bench menus, and the minimap frame.
  - Rows light under the cursor with the hover sound (the leftover from 014) and flash brass when pressed.
  - The KO text sits on a tablet.
- **The pixel pipeline is gone:**
  - grids, the atlas, `npm run art`, `scripts/build-art.ts` and `scripts/art/`, and the atlas staleness test
  - the pixel palette: its ids in data were mapped to daylight ids, so `ley-cyan` becomes `cyan` and `ember` becomes `rust`
  - `ATLAS_KEY`, and nearest filtering. The minimap draws crisp squares at the screen's scale instead.
  - A frame that was never drawn now logs a console error, so the game tests catch it.
- **The ley barrier** (the shrine's dome) was already vector since 017 (`SITE_LOOK` in `art/ground.ts`); unchanged.
- **QA fixes:**
  - QA reported the damage numbers and "+1" popup missing. Following it up showed screenshot timing: a capture lands after their 0.7 s life. A longer life showed them drawn, so they were never broken. They're now plain objects with the text drawn at its popped scale (the review's blurriness fix).
  - Machine status markers stand on the back of the machine's top face instead of a tile above it, which had covered the piece in front.
  - The press flash is see-through.
- **Review fixes:**
  - menu rows destroy their text on rebuild
  - the colour test covers all 020 art and the HUD layout colours
  - dead code removed
  - the craft menu uses the shared row hover, and it is silent on rows the player can't afford
  - the KO text's fade stops on clear
  - fonts fall back on a failed load
- **GameScene.ts** is 319 lines; it was 316 on the base. Splitting it is left for a later tidy.
- **The contact sheet** (`/sheet.html`) groups frames by family. Screenshots of every 020 family are in `docs/review/020/` for Shaun's review.

## Open questions
- **The pause title card.** *Answer (Shaun, 2026-10-18):* crafting shouldn't pause; make Esc the pause menu for now, with some sound settings. *Built:*
  - **The craft menu keeps the world running.** Its clicks never fire the tube, and its title card reads "Crafting".
  - **Esc is the pause menu:** once there's nothing left to close (a site menu, the hopper picker, the craft menu, build mode), Esc stops the world and shows a "Paused" card over a dimmed screen. Its rows are Sound (on/off), Volume (− and +), and Resume; Esc also resumes. These are the same mute and master volume as M, [ and ], and they're saved.
  - Menu routing moved from `GameScene` into `render/MenuRouter.ts`. The test hook reports `craftOpen`, `paused`, `pickerOpen` and `sound()`.
- **The floor's variants (for Shaun).** About one tile in five shows a variant: cracked, worn, a faint ley rune inlay, or a brass strip. Keep that mix, or make the floor plainer?

