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
- [ ] The layout, collision and grid are unchanged. The floor, walls, corners and props are redrawn in vector:
  - warm sandstone flagstones with rune inlays
  - carved walls with brass fittings
  - ember braziers that flicker
  - cyan ley light pooling around conduits, items in flight and the intake pipe (019)
- [ ] The build grid stays readable on the new floor in build mode.

**Machines (render, data)**
- [ ] Each of the nine machines has a distinct, visible mechanism powered by a ley crystal. Each has idle and working loops in all three facings:
  - **Cutter:** a saw blade spins through a log.
  - **Knapper:** a stone hammer strikes a block.
  - **Spinner:** a spindle wheel turns, winding fiber.
  - **Assembler (3×1):** brass arms join shaft, head and rope.
  - **Shaper:** a press stamps a casing.
  - **Fuse-maker:** resin drips onto a twisting cord.
  - **Grinder:** a millstone turns over crystal.
  - **Packer (3×1):** arms pack a casing.
  - **Focuser:** a crystal lens gathers light into a bolt.
- [ ] Each machine still shows the item it makes. Its working, starved and blocked status still reads at a glance, through the mechanism moving, stopping or jamming plus the status marker.

**Logistics and fixtures (render, data)**
- [ ] Redrawn in vector, with their sim and behaviour unchanged:
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
- [ ] Build mode's facing arrows, input arrows, ghost and placement drop-in are redrawn to match.

**Items and icons (render, data)**
- [ ] Every item has a vector icon, used on the ground, in the HUD, in menus and riding conduits:
  - wood, stone, fiber, ley crystal, husk resin
  - shaft, arrowhead, rope, casing, fuse, ley shard, warden core
  - unidentified armor
  - the arrow, bomb and ley bolt ammo
  - light and heavy armor
- [ ] The look-alike pairs from 005 stay different in shape: fuse and shaft, ley shard and ley bolt, casing and bomb.

**HUD and menus (render, data)**
- [ ] Two fonts are bundled in the repo under an open licence (OFL or similar), with their licence files, and loaded locally with no network:
  - a carved-serif display face for titles, names and objectives
  - a clean body face for numbers, readouts and descriptions
  - They replace the 3×5 letter font and the digit font. This adds font files only, no npm dependency.
- [ ] HUD frames and menus are rune-carved stone tablets with brass corners, and the hotbar slot is ringed in cyan like the tube. This covers:
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
- [ ] The crosshair, damage numbers and the "+1" pickup popup are redrawn to match.
- [ ] Every menu row has hover and press feedback. The hover sound left over from 014 is added.

**Removing the pixel pipeline (scripts, docs)**
- [ ] No pixel grid sprite remains. The grids, the atlas, `npm run art`, its build script, its stale-atlas check, the pixel palette and nearest filtering are removed. `docs/art.md` and `docs/process.md` drop the pixel pipeline.

**Rules unchanged**
- [ ] No sim rule changes. Every unit and e2e test passes, updated only for renamed asset keys and text rendering.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] A contact sheet of every machine (idle and working), piece, fixture, item and HUD element is pending Shaun's review.

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

## Open questions
None.
