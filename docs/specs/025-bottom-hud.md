# 025: Bottom HUD: centred hotbar, active ammo above it, fist when empty
status: approved

Approved by Shaun in chat, 2026-10-18 ("approve 21-27").

## Goal
The bottom of the screen reads at a glance. The three hotbar cells (1, 2 and 3) sit centred along the bottom. Above them, also centred and a little larger, is the tube slot, which shows exactly what the next fire press does: the round, the volley, or a fist for melee.

## Design references
- docs/design.md: "Combat" (hotbar = ammo lines; reservoir)
- docs/specs/020-vector-pass.md: the HUD in vector
- docs/specs/023-melee.md: melee when nothing can fire
- docs/specs/024-intake-spread.md: the volley from fed entrances
- Shaun's playtest notes, 2026-10-18: "the UI at the bottom should be centered for the hot bar slots and then have the ammo you are using centered right above it and make it slightly larger than the hot bar picture and text so its obvious and when you are out of ammo just show a little fist icon so the player knows they are meleeing"
- Interview answers (Shaun, 2026-10-18):
  - "the bottom row would have the three hot bars 1,2,3 and then the tube slot would be centered above those slightly larger"
  - when the volley is mixed, show the whole volley

## Acceptance criteria

**Layout (render, data)**
- [ ] **Bottom row:** the three hotbar cells (arrow, bomb and ley bolt, keys 1, 2 and 3), centred horizontally.
  - Each cell shows its key number, its icon and its carried count.
  - The selected cell is highlighted, as the ammo strip is today.
  - The row sits `HUD_LAYOUT.margin` px above the bottom edge.
- [ ] **Tube slot:** centred directly above the bottom row, with a small gap.
  - Its icons and text are `HUD_LAYOUT.activeScale` times the hotbar cell size (starting at 1.4×), so it reads as the main thing.
- [ ] The tube slot shows what the next press fires, in the same order as the sim (024):
  - **A carried round of the selected ammo:** that ammo's icon and its carried count.
  - **Otherwise, a volley:** one icon per round in the volley, side by side, each with its entrance's count. For example: arrow 12 · arrow 9 · bomb 4.
  - **Otherwise:** a fist icon, labelled "Melee".
- [ ] **Before the tube is picked up:** the hotbar row is hidden, and the tube slot shows only the fist.
- [ ] The separate hotbar slot sprite and its old layout to the right are removed. Nothing else in the bottom-centre overlaps the new layout. The build bar still replaces the hotbar row in build mode, as today.
- [ ] Everything stays inside the 640×360 view.

**Art (data/art)**
- [ ] A vector fist icon in the 016/020 style: a rust-gloved fist, outlined, with a soft shadow. Pending review.
- [ ] A slightly larger tube-slot frame in the HUD style.

**Hook**
- [ ] `getState()` reports `hud.active` as one of:
  - `{ kind: 'carried', ammoId, count }`
  - `{ kind: 'volley', rounds: [{ ammoId, count }] }`
  - `{ kind: 'melee' }`
  
  It is derived from sim state by a pure helper that the sim's fire path also uses, so the HUD can't disagree with what fires.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/hudLayout.ts`: `HUD_LAYOUT` (margin, gap, activeScale), replacing the hotbar slot and ammo strip offsets.
- `src/data/art/hud.ts`: the fist icon and the tube-slot frame.
- `src/data/assets.ts`: new sprite keys.

## Out of scope
- Health, materials and the minimap.
- Unlocking more hotbar slots.
- Keybinding changes.

## Test plan
- **Vitest:** the active-ammo helper returns carried, volley or melee for each state, in the same order as the fire path.
- **Playwright:** check `hud.active` in three states: carried arrows, an arrow+bomb volley, and empty. Both rows are centred within 1 px of 320.
- **Screenshots:**
  - the HUD with carried arrows
  - the HUD with a mixed volley
  - the HUD with the fist
  - the HUD before the tube

## Open questions
None.
