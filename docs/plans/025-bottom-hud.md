# Plan 025: Bottom HUD

Spec: docs/specs/025-bottom-hud.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec; docs/design.md is not touched.

## Shape of the change
1. **Sim: the helper.** `src/sim/volley.ts` gains `hudActive(state)`, a pure map of `nextPress(state)` (the fire path's own helper, 024) to the HUD's shape: `{ kind: 'carried', ammoId, count }`, `{ kind: 'volley', rounds: [{ ammoId, count }] }` or `{ kind: 'melee' }` (the entrance index dropped). `slotCount` (024's stopgap "until 025") goes from `src/sim/tube.ts`.
2. **Hook.** `getState().hud = { active: hudActive(state) }`. `tube.next` stays.
3. **Data.**
   - `src/data/hudLayout.ts`: `HUD_LAYOUT` replaces `AMMO_STRIP_LAYOUT` and `HUD_SLOT_LAYOUT` (from assets.ts): `margin` (6, the row above the bottom edge), `gap` (4, between the row and the tube slot, and between the slot's units), `activeScale` (1.4), the hotbar `cell` (24×28, step 26, key/icon/count offsets as the strip had), and `tubeSlot`, the slot's per-round unit derived from the cell × `activeScale` (34×39, step 36, its icon centred, its count or label centred under it).
   - `BUILD_BAR_LAYOUT.bottom` becomes `HUD_LAYOUT.margin`: the build bar sits in the hotbar row's place, and the row hides while building.
   - `src/data/art/hud.ts`: the fist icon (`hud-fist`, 16×16 like the item icons: a rust leather glove curled into a fist, knuckles lit from the top left, a brass cuff, ink outline, a soft ink shadow below) and the tube-slot frame (`hud-tube-slot-1..3`, one frame per volley size up to the intake's three entrances: a HUD tablet with a well per round, ringed in cyan like the tube). `hud-slot` and `hud-slot-glow` go.
   - `src/data/assets.ts`: `SPRITES.hudFist`, `tubeSlotFrame(n)`; `hudSlot`, `hudSlotGlow`, `HUD_SLOT_LAYOUT` go.
4. **Render.**
   - `src/render/hudLayout.ts` (new, pure): `hotbarCells()` (three cells centred, `margin` above the bottom) and `tubeSlotRect(rounds)` (centred, `gap` above the row, one unit per round), so unit tests can check the centring and that both stay in 640×360.
   - `HotbarView` replaces `AmmoStripView`: the three cells with key, icon and carried count, the selected one highlighted; hidden before the tube and while building.
   - `TubeSlotView` (new): the frame for the round count and, per unit, an icon at `activeScale` and its count (or "Melee" under the fist) in the count font at `activeScale`. It reads `hudActive` from the sim; before the tube that is melee, so only the fist shows.
   - `TextLine` takes an optional scale, drawing the font that much bigger (sharp, not stretched).
   - `HudView` drops the slot, its glow and its count; `overUi` covers the row and the tube slot.
   - `ui().hud`: the row (shown, left, right, top, bottom) and the tube slot (left, right, top, bottom, icons by frame, labels), view px, for the e2e.
   - Contact sheet: `hud-` frames already fall in "HUD and menus", so the fist and the frames show there.

## Tests (written first)
- **Vitest** `tests/sim/hud.test.ts`: `hudActive` is carried with the selected ammo's carried count; a volley of the fed entrances' rounds (west to east, each with its entrance's count) once none is carried; melee when everything is empty and before the tube. For each state, one fire press does what it said (one projectile of that ammo; one per round, each entrance down by 1; a punch). Summary carries `hud.active`.
- **Vitest** `tests/render/hudLayout.test.ts`: the row and every tube slot width (1–3 rounds) are centred on 320 and inside 640×360; the slot sits `gap` above the row, the row `margin` above the bottom; the build bar's cells sit in the row's band.
- **Vitest** data: the fist and frames are drawn (art tests already cover palette and kebab ids); a frame per entrance count.
- **Playwright** `tests/e2e/hud.spec.ts`: `?start=field` carried arrows (`hud.active` carried, 30); spend them to the fist (melee, "Melee" label); `?playtest`, open the sides and feed an arrow and a bomb entrance, spend the carried arrows, and the HUD shows the volley (two icons, each with its count). Each time both rows are centred within 1 px of 320 and inside the view. The intake helpers move from `spread.spec.ts` into `tests/e2e/intakePage.ts`, shared.
- **Screenshots** (REVIEW_SHOTS=1, `docs/review/025/`): carried arrows, a mixed volley, the fist, before the tube; and the fist and frames on the contact sheet.

## Not dictated by the spec
- The tube slot keeps its place before the tube (above the empty row), so it doesn't jump when the tube is taken.
- The tube slot stays in build mode, above the build bar; only the row gives way.
- The frame is drawn per volley size (1–3 wells) rather than stretched, so it stays sharp vector art.
- The reservoir glow on the old slot goes; the volley's icons say the same thing.
- Counts: the carried count for a carried round, each entrance's count for a volley.

## Risks
- Text at 1.4× is a bigger font, not a scaled one, so its width is measured live for centring.
