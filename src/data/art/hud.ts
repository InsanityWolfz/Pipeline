import { SPRITES, TUBE_SLOT_FRAMES } from '../assets';
import { TUTORIAL_SPRITES } from '../foundryAssets';
import { BUILD_BAR_LAYOUT, BUILD_PULSE, CRAFT_MENU_LAYOUT, HUD_LAYOUT, PICKER_LAYOUT, tubeSlotWidth } from '../hudLayout';
import { HP_BAR, HUD_HEALTH_LAYOUT, INVENTORY_GRID } from '../hudPanels';
import { ellipse, flat, line, path, rect, solid, trim, type Paint, type Shape, type VectorSprite } from './types';

// The HUD and menus (020): rune-carved stone tablets with brass corners, dark
// wells for icons and counts, and the tube slot ringed in cyan like the tube.
// Fixed-size pieces are drawn here at the sizes the layouts were built round;
// panels that change size are drawn live with the same look (render/tablet.ts,
// TABLET in hudLayout). Drawn from the top-left.

const vertical = (top: string, bottom: string, y0: number, y1: number): Paint => ({ linear: [0, y0, 0, y1], stops: [{ at: 0, color: top }, { at: 1, color: bottom }] });

/** A brass corner bracket at (x, y), its arms pointing along (dx, dy). */
const corner = (x: number, y: number, dx: number, dy: number, arm: number): Shape =>
  ({ ...line([x + dx * arm, y, x, y, x, y + dy * arm], 1.6, 'brass', true) });

/** A stone tablet w x h: ink edge, carved stone, a lit top bevel, and brass corners. `runes` cuts a rune course along its top. */
export function tablet(w: number, h: number, opts: { runes?: boolean; corners?: boolean } = {}): Shape[] {
  const arm = Math.min(5, Math.floor(Math.min(w, h) / 3));
  const runes = opts.runes
    ? Array.from({ length: Math.floor((w - 16) / 12) }, (_, i) => {
        const x = 10 + i * 12;
        return path(`M ${x} 2.6 L ${x + 2} 4.4 L ${x + 4} 2.6 L ${x + 6} 4.4`, trim('carve', 0.7));
      })
    : [];
  return [
    rect(0, 0, w, h, 2, { fill: vertical('carve', 'carve-dark', 0, h), outline: true }),
    line([2, 1.2, w - 2, 1.2], 0.8, { id: 'carve-light', alpha: 0.9 }),
    line([2, h - 1.2, w - 2, h - 1.2], 0.8, { id: 'mortar', alpha: 0.9 }),
    ...runes,
    ...(opts.corners === false ? [] : [corner(1.4, 1.4, 1, 1, arm), corner(w - 1.4, 1.4, -1, 1, arm), corner(1.4, h - 1.4, 1, -1, arm), corner(w - 1.4, h - 1.4, -1, -1, arm)]),
  ];
}

/** A dark carved well inside a tablet. */
const well = (x: number, y: number, w: number, h: number): Shape => rect(x, y, w, h, 1.6, { fill: vertical('ink', 'carve-dark', y, y + h), stroke: { color: 'mortar', width: 0.6 } });

/** A cyan ring like the tube's, round a well. */
const ring = (x: number, y: number, w: number, h: number, width: number, alpha: number, blur: number): Shape =>
  rect(x, y, w, h, 2.4, { stroke: { color: { id: 'cyan', alpha }, width }, glow: { color: 'cyan-glow', blur } });

const sprite = (key: string, size: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor: [0, 0], frames: [shapes] });

// The tube slot (025): a tablet a little bigger than a hotbar cell, with a dark well per round it shows,
// each ringed in cyan like the tube. One frame per count of rounds, up to one per intake entrance.
const UNIT = { w: HUD_LAYOUT.tubeSlot.w, h: HUD_LAYOUT.tubeSlot.h, step: HUD_LAYOUT.tubeSlot.w + HUD_LAYOUT.gap, inset: HUD_LAYOUT.tubeSlot.wellInset } as const;
const tubeSlot = (n: number): Shape[] => [
  ...tablet(tubeSlotWidth(n), UNIT.h),
  ...Array.from({ length: n }, (_, i) => [
    well(i * UNIT.step + UNIT.inset, UNIT.inset, UNIT.w - 2 * UNIT.inset, UNIT.h - 2 * UNIT.inset),
    ring(i * UNIT.step + UNIT.inset, UNIT.inset, UNIT.w - 2 * UNIT.inset, UNIT.h - 2 * UNIT.inset, 1.2, 0.85, 2),
  ]).flat(),
  // Brass studs between the wells, so a volley reads as one slot.
  ...Array.from({ length: n - 1 }, (_, i) => ellipse((i + 1) * UNIT.step - HUD_LAYOUT.gap / 2, UNIT.h / 2, 1.1, 1.1, solid('brass'))),
];

// The fist (16x16, round its centre like the item icons): a rust leather glove curled shut, knuckles to the
// top, the thumb folded across the front, a brass cuff at the wrist, lit from the top left, on a soft shadow.
const FIST: Shape[] = [
  ellipse(0.6, 6.4, 6, 1.4, { fill: { id: 'ink', alpha: 0.3 }, glow: { color: 'ink', blur: 1.5 } }),
  // The curled fingers: four knuckles scalloped along the top.
  path(
    'M -6 2 L -6 -4.2 Q -6 -6.4 -4.5 -6.4 Q -3 -6.4 -3 -5 Q -3 -6.4 -1.5 -6.4 Q 0 -6.4 0 -5 Q 0 -6.4 1.5 -6.4 Q 3 -6.4 3 -5 Q 3 -6.4 4.6 -6.4 Q 6.2 -6.4 6.2 -4.2 L 6 2.4 Q 5.6 4.4 3.4 4.4 L -3.4 4.4 Q -6 4.4 -6 2 Z',
    { fill: { linear: [-5, -6, 5, 4], stops: [{ at: 0, color: 'rust-light' }, { at: 0.5, color: 'rust' }, { at: 1, color: 'rust-dark' }] }, outline: true },
  ),
  ...[-3, 0, 3].map((x) => line([x, -4.8, x, -2], 0.6, 'rust-dark')),
  ...[-4.5, -1.5, 1.5, 4.6].map((x) => ellipse(x - 0.3, -5.4, 0.8, 0.45, { fill: { id: 'snow', alpha: 0.35 } })),
  // The thumb folded across the front of the fingers.
  path('M -6.4 -1.6 Q -3 -2.8 1.8 -1.4 Q 3.8 -0.8 3.2 0.9 Q 2.8 1.9 1 1.7 L -5.8 2.2 Z', { fill: vertical('rust-light', 'rust', -2.8, 2.2), outline: true }),
  line([-5.4, -1.3, -1.4, -1.9], 0.5, { id: 'snow', alpha: 0.45 }),
  // The brass cuff.
  rect(-5, 3.6, 10.6, 3, 1, { fill: vertical('brass-light', 'brass-dark', 3.6, 6.6), outline: true }),
  line([-4.2, 5.1, 4.8, 5.1], 0.5, 'brass-dark'),
];

// A hotbar cell (24x28, also the build bar's): a small tablet with a well, and the cyan ring that marks the selected one.
const AMMO_CELL: Shape[] = [...tablet(24, 28), well(3, 3, 18, 22)];
const AMMO_SELECT: Shape[] = [ring(2, 2, 20, 24, 1.6, 1, 3)];

// The HP bar (031, 152x20): a carved stone frame with brass end caps and studs, a lit top bevel and a rune course
// cut along its foot, round the dark well the fill is drawn in (HUD_HEALTH_LAYOUT.fill).
const HP = HUD_HEALTH_LAYOUT;
const HEALTH: Shape[] = [
  rect(0, 0, HP.frame.w, HP.frame.h, 3, { fill: vertical('carve', 'carve-dark', 0, HP.frame.h), outline: true }),
  line([4, 1.3, HP.frame.w - 4, 1.3], 0.8, { id: 'carve-light', alpha: 0.9 }),
  well(HP.fill.x - 1, HP.fill.y - 1, HP.fill.w + 2, HP.fill.h + 2),
  ...[0, HP.frame.w - 3].map((x) => rect(x, 0, 3, HP.frame.h, 1.4, { fill: vertical('brass-light', 'brass-dark', 0, HP.frame.h), outline: true })),
  ...[1.5, HP.frame.w - 1.5].map((x) => ellipse(x, HP.frame.h / 2, 0.8, 0.8, solid('gold-trim'))),
  ...Array.from({ length: Math.floor((HP.frame.w - 24) / 16) }, (_, i) => path(`M ${12 + i * 16} ${HP.frame.h - 2.4} L ${14 + i * 16} ${HP.frame.h - 1.2} L ${16 + i * 16} ${HP.frame.h - 2.4}`, trim('carve', 0.6))),
];

// Its healing glow (031): soft cyan rings just outside the frame, faded in while the player heals (030).
const G = HP_BAR.glow;
const HEALTH_GLOW: Shape[] = G.rings.map(({ out, width, alpha, blur }) =>
  rect(G.pad - out, G.pad - out, HP.frame.w + 2 * out, HP.frame.h + 2 * out, 3 + out, { stroke: { color: { id: 'cyan-glow', alpha }, width }, glow: { color: G.color, blur } }),
);

// The shield (031, 14x16) beside the bar's armor value: a heater shield of steel with a brass rim and a cyan ley rune.
const SHIELD: Shape[] = [
  path('M 1 1.5 L 13 1.5 L 13 7 Q 13 12.4 7 15.2 Q 1 12.4 1 7 Z', { fill: { linear: [1, 1, 13, 15], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.55, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  path('M 2.4 2.8 L 11.6 2.8 L 11.6 7 Q 11.6 11.4 7 13.7 Q 2.4 11.4 2.4 7 Z', trim('brass', 1)),
  { ...path('M 7 4.4 L 7 11 M 4.6 6.6 L 9.4 6.6', trim('cyan', 1)), glow: { color: 'cyan', blur: 2 } },
  line([3.2, 3.6, 5.6, 3.6], 0.6, { id: 'snow', alpha: 0.6 }),
];

// The at-risk mark (031, 8x8): a rust warning triangle with an ink bar and dot.
const WARN: Shape[] = [
  path('M 4 0.6 L 7.6 7.2 L 0.4 7.2 Z', { fill: vertical('cinder-light', 'rust-light', 0.6, 7.2), outline: true }),
  line([4, 2.8, 4, 4.8], 0.9, 'ink'),
  ellipse(4, 6, 0.5, 0.5, flat('ink')),
];

// The inventory's title card (031); 047's grid panel changes size (a hopper's slots on top), so it's drawn live.
const PANEL_TITLE = INVENTORY_GRID.title;

// The crafting menu (020): a big tablet with a rune course along its top; its rows are dark wells,
// lit with a cyan rim under the cursor and a brass flash when pressed. The other menus' rows
// (picker, pause, site menus) are 184x20; the crafting menu's are taller, for the item names (026).
const CRAFT_PANEL: Shape[] = tablet(CRAFT_MENU_LAYOUT.width, CRAFT_MENU_LAYOUT.height, { runes: true });
const ROW = { w: PICKER_LAYOUT.rowWidth, h: PICKER_LAYOUT.rowHeight } as const;
const RECIPE_ROW = { w: CRAFT_MENU_LAYOUT.rowWidth, h: CRAFT_MENU_LAYOUT.rowHeight } as const;
const row = (r: { w: number; h: number }, rim: Shape[]): Shape[] => [well(0.5, 0.5, r.w - 1, r.h - 1), ...rim];
const hoverRim = (r: { w: number; h: number }): Shape[] => [
  ring(0.5, 0.5, r.w - 1, r.h - 1, 1, 0.9, 2),
  rect(2, 2, r.w - 4, r.h - 4, 1.4, { fill: { id: 'cyan', alpha: 0.08 } }),
];
// The press flash lies over a row, so it's only a rim and a faint wash: what's in the row shows through.
const pressFlash = (r: { w: number; h: number }): Shape[] => [
  rect(0.5, 0.5, r.w - 1, r.h - 1, 2, { stroke: { color: 'brass', width: 1.4 } }),
  rect(2, 2, r.w - 4, r.h - 4, 1.4, { fill: { id: 'brass', alpha: 0.18 } }),
];
const CRAFT_ROW = row(ROW, []);
const CRAFT_ROW_HOVER = row(ROW, hoverRim(ROW));
const CRAFT_ROW_PRESS = pressFlash(ROW);
const CRAFT_ARROW: Shape[] = [path('M 0.5 1.5 L 4 1.5 L 4 0 L 6.8 2.5 L 4 5 L 4 3.5 L 0.5 3.5 Z', solid('brass'))];

// The crosshair (11x11, round its centre): a cyan ring with four ticks, outlined so it reads on any floor.
const CROSSHAIR: Shape[] = [
  ellipse(0, 0, 3.4, 3.4, { stroke: { color: 'ink', width: 2.2 } }),
  ellipse(0, 0, 3.4, 3.4, { stroke: { color: 'cyan-glow', width: 1 } }),
  ...[
    [0, -5.1, 0, -3.3],
    [0, 3.3, 0, 5.1],
    [-5.1, 0, -3.3, 0],
    [3.3, 0, 5.1, 0],
  ].map((pts) => line(pts, 1, 'cyan-glow', true)),
  ellipse(0, 0, 0.6, 0.6, { fill: 'snow' }),
];

// The menu pointer (10x14, round its tip at (0, 0), near the top-left): a pale stone arrow with a cyan edge, outlined like the crosshair (021).
const POINTER: Shape[] = [
  path('M 0 0 L 0 10.6 L 2.7 8.2 L 4.6 12.2 L 6.5 11.3 L 4.6 7.4 L 8 7.4 Z', { fill: vertical('snow', 'rock-pale', 0, 12), outline: true }),
  line([0.9, 1.8, 0.9, 8.4], 0.7, 'cyan-glow'),
];

// A key prompt's cap (11x11): a little stone key with a brass rim; the letter is drawn over it.
const KEY_CAP: Shape[] = [
  rect(0.5, 1.5, 10, 9, 2, { fill: 'carve-dark', outline: true }),
  rect(0.5, 0.5, 10, 8.5, 2, { fill: vertical('carve-light', 'carve', 0.5, 9), stroke: { color: 'brass', width: 0.7 } }),
];

// The build-bar pulse (over a cell, reaching BUILD_PULSE.out px round it, 027): a gold ring with a warm glow and a faint
// wash over the cell's well, so it reads round the cell's own brass corners and outside the cyan selection ring.
const PULSE = BUILD_PULSE;
const BUILD_PULSE_RING: Shape[] = [
  rect(1, 1, PULSE.w - 2, PULSE.h - 2, 3.2, { stroke: { color: 'gold-trim', width: 2 }, glow: { color: 'cinder-light', blur: 4 } }),
  rect(PULSE.inset + 2, PULSE.inset + 2, BUILD_BAR_LAYOUT.cellWidth - 4, BUILD_BAR_LAYOUT.cellHeight - 4, 1.8, { fill: { id: 'sun', alpha: 0.18 } }),
];

// The intake marker (16x20, round its tip at the bottom middle, 027): a gold arrow pointing down, outlined, with a warm
// glow, so it reads over the cyan pipe.
const MARKER: Shape[] = [
  {
    ...path('M -3.6 -19 L 3.6 -19 L 3.6 -9.5 L 7.6 -9.5 L 0 0 L -7.6 -9.5 L -3.6 -9.5 Z', { fill: vertical('sun', 'gold-shade', -19, 0), outline: true }),
    glow: { color: 'cinder-light', blur: 4 },
  },
  line([-2, -17.4, -2, -10.2], 0.8, { id: 'snow', alpha: 0.7 }),
];

// 051 (B.7): the mouse (10x14): a pale body with an ink edge, its two buttons split down the middle, the right one
// lit cyan like the tube, the left one dark.
const MOUSE: Shape[] = [
  rect(0.6, 0.6, 8.8, 12.8, 4.2, { fill: vertical('robe', 'mask', 0, 14), outline: true }),
  path('M 5 0.9 L 5 5.6 L 9.1 5.6 L 9.1 4.4 Q 9.1 0.9 5.6 0.9 Z', { fill: 'cyan', glow: { color: 'cyan-glow', blur: 3 } }),
  path('M 5 0.9 L 5 5.6 L 0.9 5.6 L 0.9 4.4 Q 0.9 0.9 4.4 0.9 Z', flat('carve-light')),
  line([5, 0.9, 5, 5.6], 0.6, 'ink'),
  line([0.9, 5.6, 9.1, 5.6], 0.6, 'ink'),
];

// The objective tick (9x9): a ley check mark.
const TICK: Shape[] = [{ ...line([1.2, 4.8, 3.6, 7.4, 7.8, 1.4], 1.6, 'cyan-glow', true), glow: { color: 'cyan', blur: 3 } }];

export const HUD_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...TUBE_SLOT_FRAMES.map((key, i) => sprite(key, [tubeSlotWidth(i + 1), UNIT.h], tubeSlot(i + 1))),
  { key: SPRITES.hudFist, size: [16, 16], anchor: [8, 8], frames: [FIST] },
  sprite(SPRITES.hudAmmoCell, [24, 28], AMMO_CELL),
  sprite(SPRITES.hudAmmoSelect, [24, 28], AMMO_SELECT),
  sprite(SPRITES.hudHealth, [HP.frame.w, HP.frame.h], HEALTH),
  sprite(SPRITES.hudHealthGlow, [HP.frame.w + 2 * G.pad, HP.frame.h + 2 * G.pad], HEALTH_GLOW),
  sprite(SPRITES.hudShield, [HP.shield.w, HP.shield.h], SHIELD),
  sprite(SPRITES.hudWarn, [8, 8], WARN),
  sprite(SPRITES.inventoryTitle, [PANEL_TITLE.w, PANEL_TITLE.h], tablet(PANEL_TITLE.w, PANEL_TITLE.h)),
  sprite(SPRITES.craftPanel, [CRAFT_MENU_LAYOUT.width, CRAFT_MENU_LAYOUT.height], CRAFT_PANEL),
  sprite(SPRITES.craftRow, [ROW.w, ROW.h], CRAFT_ROW),
  sprite(SPRITES.craftRowHover, [ROW.w, ROW.h], CRAFT_ROW_HOVER),
  sprite(SPRITES.craftRowPress, [ROW.w, ROW.h], CRAFT_ROW_PRESS),
  sprite(SPRITES.craftRecipeRow, [RECIPE_ROW.w, RECIPE_ROW.h], row(RECIPE_ROW, [])),
  sprite(SPRITES.craftRecipeRowHover, [RECIPE_ROW.w, RECIPE_ROW.h], row(RECIPE_ROW, hoverRim(RECIPE_ROW))),
  sprite(SPRITES.craftRecipeRowPress, [RECIPE_ROW.w, RECIPE_ROW.h], pressFlash(RECIPE_ROW)),
  sprite(SPRITES.craftArrow, [7, 5], CRAFT_ARROW),
  { key: SPRITES.crosshair, size: [11, 11], anchor: [5.5, 5.5], frames: [CROSSHAIR] },
  { key: SPRITES.pointer, size: [10, 14], anchor: [1, 1], frames: [POINTER] },
  sprite(TUTORIAL_SPRITES.keyCap, [11, 11], KEY_CAP),
  sprite(TUTORIAL_SPRITES.tick, [9, 9], TICK),
  sprite(SPRITES.hudMouse, [10, 14], MOUSE),
  sprite(SPRITES.buildPulse, [PULSE.w, PULSE.h], BUILD_PULSE_RING),
  { key: TUTORIAL_SPRITES.marker, size: [16, 20], anchor: [8, 20], frames: [MARKER] },
];
