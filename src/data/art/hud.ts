import { SPRITES } from '../assets';
import { TUTORIAL_SPRITES } from '../foundryAssets';
import { CRAFT_MENU_LAYOUT, PICKER_LAYOUT } from '../hudLayout';
import { ellipse, line, path, rect, solid, trim, type Paint, type Shape, type VectorSprite } from './types';

// The HUD and menus (020): rune-carved stone tablets with brass corners, dark
// wells for icons and counts, and the hotbar slot ringed in cyan like the tube.
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

// The hotbar slot (44x24): a tablet with the loaded ammo's well, ringed in cyan; the glow over it while it fires from the reservoir.
const HUD_SLOT: Shape[] = [...tablet(44, 24), well(3, 3, 38, 18), ring(3, 3, 38, 18, 1.1, 0.8, 1.5)];
const HUD_SLOT_GLOW: Shape[] = [ring(2, 2, 40, 20, 2, 1, 5)];

// An ammo strip cell (24x28): a small tablet with a well, and the cyan ring that marks the selected one.
const AMMO_CELL: Shape[] = [...tablet(24, 28), well(3, 3, 18, 22)];
const AMMO_SELECT: Shape[] = [ring(2, 2, 20, 24, 1.6, 1, 3)];

// The health bar (52x8): stone with brass ends round the well the fill is drawn in (x 2-49, y 2-5).
const HEALTH: Shape[] = [
  rect(0, 0, 52, 8, 2, { fill: vertical('carve', 'carve-dark', 0, 8), outline: true }),
  rect(2, 2, 48, 4, 1, { fill: 'ink' }),
  rect(0, 0, 2.4, 8, 1, solid('brass')),
  rect(49.6, 0, 2.4, 8, 1, solid('brass')),
];

// The crafting menu (196x252): a big tablet with a rune course along its top; its rows are dark wells,
// lit with a cyan rim under the cursor and a brass flash when pressed.
const CRAFT_PANEL: Shape[] = tablet(CRAFT_MENU_LAYOUT.width, CRAFT_MENU_LAYOUT.height, { runes: true });
const ROW = { w: PICKER_LAYOUT.rowWidth, h: PICKER_LAYOUT.rowHeight } as const;
const row = (rim: Shape[]): Shape[] => [well(0.5, 0.5, ROW.w - 1, ROW.h - 1), ...rim];
const CRAFT_ROW = row([]);
const CRAFT_ROW_HOVER = row([ring(0.5, 0.5, ROW.w - 1, ROW.h - 1, 1, 0.9, 2), rect(2, 2, ROW.w - 4, ROW.h - 4, 1.4, { fill: { id: 'cyan', alpha: 0.08 } })]);
// The press flash lies over a row, so it's only a rim and a faint wash: what's in the row shows through.
const CRAFT_ROW_PRESS: Shape[] = [rect(0.5, 0.5, ROW.w - 1, ROW.h - 1, 2, { stroke: { color: 'brass', width: 1.4 } }), rect(2, 2, ROW.w - 4, ROW.h - 4, 1.4, { fill: { id: 'brass', alpha: 0.18 } })];
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

// A key prompt's cap (11x11): a little stone key with a brass rim; the letter is drawn over it.
const KEY_CAP: Shape[] = [
  rect(0.5, 1.5, 10, 9, 2, { fill: 'carve-dark', outline: true }),
  rect(0.5, 0.5, 10, 8.5, 2, { fill: vertical('carve-light', 'carve', 0.5, 9), stroke: { color: 'brass', width: 0.7 } }),
];

// The objective tick (9x9): a ley check mark.
const TICK: Shape[] = [{ ...line([1.2, 4.8, 3.6, 7.4, 7.8, 1.4], 1.6, 'cyan-glow', true), glow: { color: 'cyan', blur: 3 } }];

export const HUD_SPRITES_VECTOR: readonly VectorSprite[] = [
  sprite(SPRITES.hudSlot, [44, 24], HUD_SLOT),
  sprite(SPRITES.hudSlotGlow, [44, 24], HUD_SLOT_GLOW),
  sprite(SPRITES.hudAmmoCell, [24, 28], AMMO_CELL),
  sprite(SPRITES.hudAmmoSelect, [24, 28], AMMO_SELECT),
  sprite(SPRITES.hudHealth, [52, 8], HEALTH),
  sprite(SPRITES.craftPanel, [CRAFT_MENU_LAYOUT.width, CRAFT_MENU_LAYOUT.height], CRAFT_PANEL),
  sprite(SPRITES.craftRow, [ROW.w, ROW.h], CRAFT_ROW),
  sprite(SPRITES.craftRowHover, [ROW.w, ROW.h], CRAFT_ROW_HOVER),
  sprite(SPRITES.craftRowPress, [ROW.w, ROW.h], CRAFT_ROW_PRESS),
  sprite(SPRITES.craftArrow, [7, 5], CRAFT_ARROW),
  { key: SPRITES.crosshair, size: [11, 11], anchor: [5.5, 5.5], frames: [CROSSHAIR] },
  sprite(TUTORIAL_SPRITES.keyCap, [11, 11], KEY_CAP),
  sprite(TUTORIAL_SPRITES.tick, [9, 9], TICK),
];
