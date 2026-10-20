import { LANDMARK_SPRITES } from '../landmarkAssets';
import { shadow } from './terrain';
import { ellipse, flat, line, path, solid, trim, type Shape, type Stop, type VectorSprite } from './types';

// The Husk Hive (049) in the 016 style: the nest's stones, crusted with Husk resin (the amber of the resin item and of
// a Husk's bindings, 018) and stuck with straw, and the resin seep, amber welling up in a cracked stone lip. The seep
// shows its uses left by its pool and beads, then a dry, cracked crust while depleted, which fills again in
// REGROW_STAGES stages. World px round each anchor, light from the top left.

const AMBER: readonly Stop[] = [
  { at: 0, color: 'resin-light' },
  { at: 0.55, color: 'resin' },
  { at: 1, color: 'resin-dark' },
];

/** A bead of resin with its highlight; `dull` takes the gloss off (resin still welling back). */
function bead(x: number, y: number, r: number, dull = false): Shape[] {
  return [
    ellipse(x, y, r, r * 0.85, { fill: { radial: [x - r * 0.3, y - r * 0.4, r * 1.2], stops: AMBER }, outline: true }),
    ...(dull ? [] : [ellipse(x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.25, flat({ id: 'snow', alpha: 0.7 }))]),
  ];
}

// The seep: a low lip of grey stone split by a crack, amber caked round its rim.
const LIP: Shape[] = [
  shadow(14, 3.4, -1),
  path('M -14 0 Q -14 -5 -9 -7 Q -2 -9.5 6 -8 Q 13 -6.5 14 0 Z', solid('rock')),
  path('M -11 -5 Q -5 -8.5 3 -8 Q 9 -7.5 11 -5 Q 4 -6 -3 -5.6 Z', flat('rock-light')),
  path('M 14 0 Q 13 -5 9 -6.5 Q 10 -3 8 0 Z', flat('rock-dark')),
  // Crust caked on the lip, left and right of the crack.
  path('M -12 -4.4 Q -10 -6.8 -6 -7.2 L -6.6 -5 Q -9.4 -4.6 -12 -4.4 Z', flat('resin-dark')),
  path('M 6 -7.4 Q 10 -6.8 12 -4.6 Q 9.4 -5.2 6.8 -5.4 Z', flat('resin-dark')),
];

/** The crack's mouth, dark where the resin comes up. */
const CRACK: Shape = path('M -7 -4.6 Q 0 -7.6 7 -4.8 Q 1 -3 -7 -4.6 Z', flat('ink'));

/** The amber pool in the crack at `k` of full, with `beads` beads welling over it; `lit` 0 is dull resin coming back. */
function pool(k: number, beads: number, lit = 1): Shape[] {
  const rx = 7 * k + 1;
  const ry = 2.4 * k + 0.6;
  const spots: readonly (readonly [number, number, number])[] = [
    [-3.6, -8.2, 2.1],
    [3.4, -7.8, 1.8],
    [0, -10.6, 1.6],
  ];
  return [
    CRACK,
    { ...ellipse(0, -5, rx, ry, { fill: { linear: [0, -5 - ry, 0, -5 + ry], stops: AMBER } }), ...(lit > 0 ? { glow: { color: 'resin-light', blur: 3 * lit } } : {}), alpha: 0.6 + 0.4 * lit },
    ...(lit > 0 ? [ellipse(-rx * 0.35, -5 - ry * 0.35, rx * 0.35, ry * 0.3, flat({ id: 'resin-light', alpha: 0.9 * lit }))] : []),
    ...spots.slice(0, beads).flatMap(([x, y, r]) => bead(x * k, -5 + (y + 5) * k, r * (0.6 + 0.4 * k), lit < 1)),
    // A drip down the lip's face.
    ...(k >= 0.8 ? [path('M 4.6 -4.4 Q 5.2 -2 4.8 -0.6', trim('resin', 1.4)), ellipse(4.8, -0.4, 0.9, 1.1, flat('resin'))] : []),
  ];
}

/** Depleted: the crack scraped dry, a few flakes of dark crust left in it. */
const DRY: Shape[] = [CRACK, ...[-4, -0.5, 3.4].map((x, i) => ellipse(x, -5.2 + (i % 2) * 0.4, 1.3, 0.6, flat('resin-dark'))), line([-5, -4.4, 5, -4.6], 0.6, 'rock-dark')];

export const RESIN_SEEP = {
  size: [36, 32] as const,
  anchor: [18, 28] as const,
  uses: [
    [...LIP, ...pool(0.55, 1)],
    [...LIP, ...pool(0.8, 2)],
    [...LIP, ...pool(1, 3)],
  ],
  regrow: [
    [...LIP, ...DRY],
    [...LIP, ...pool(0.25, 0, 0)],
    [...LIP, ...pool(0.4, 1, 0.35)],
    [...LIP, ...pool(0.5, 1, 0.7)],
  ],
};

/**
 * A nest stone: a heaped boulder caked in amber resin running down from its top, straw stuck in the crust, one with a
 * dark burrow mouth where the Husks crawl in. `flip` mirrors it.
 */
function hiveStone(flip: number, burrow: boolean): Shape[] {
  const s = flip;
  return [
    shadow(20, 5, -1),
    path(`M ${-19 * s} 0 Q ${-21 * s} -14 ${-12 * s} -24 Q ${-2 * s} -33 ${9 * s} -28 Q ${19 * s} -22 ${19 * s} -9 Q ${19 * s} -2 ${16 * s} 0 Z`, solid('rock')),
    path(`M ${-14 * s} -16 Q ${-12 * s} -25 ${-3 * s} -29 Q ${5 * s} -31 ${10 * s} -26 Q ${2 * s} -24 ${-5 * s} -20 Z`, flat('rock-light')),
    path(`M ${16 * s} 0 Q ${19 * s} -10 ${15 * s} -20 Q ${13 * s} -9 ${8 * s} 0 Z`, flat('rock-dark')),
    // The amber crust over its crown, running down in drips.
    path(
      `M ${-12 * s} -22 Q ${-4 * s} -32 ${8 * s} -28 Q ${15 * s} -25 ${16 * s} -18 L ${13 * s} -15 L ${12 * s} -9 L ${10 * s} -16 L ${4 * s} -18 L ${2 * s} -11 L ${0} -19 L ${-7 * s} -18 L ${-9 * s} -13 L ${-10 * s} -19 Z`,
      { fill: { linear: [0, -32, 0, -10], stops: AMBER }, outline: true },
    ),
    ellipse(-2 * s, -27, 4, 1.4, flat({ id: 'resin-light', alpha: 0.85 })),
    ...[
      [12 * s, -8.4],
      [2 * s, -10.4],
      [-9 * s, -12.4],
    ].map(([x, y]) => ellipse(x ?? 0, y ?? 0, 1.1, 1.4, flat('resin'))),
    // Straw stuck in the crust.
    ...[
      [-6, -24, -10, -30],
      [5, -27, 8, -34],
      [11, -23, 16, -27],
    ].map(([x0, y0, x1, y1]) => line([(x0 ?? 0) * s, y0 ?? 0, (x1 ?? 0) * s, y1 ?? 0], 0.9, 'straw')),
    ...(burrow
      ? [
          path(`M ${-9 * s} 0 Q ${-9 * s} -9 ${-3 * s} -10 Q ${3 * s} -9 ${3 * s} 0 Z`, flat('ink')),
          path(`M ${-9 * s} 0 Q ${-9 * s} -9 ${-3 * s} -10 Q ${3 * s} -9 ${3 * s} 0`, trim('resin-dark', 1.4)),
        ]
      : [line([-6 * s, -6, -1 * s, -3], 0.9, 'rock-dark')]),
  ];
}

const one = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [48, 44], anchor: [24, 40], frames: [shapes] });

/** The nest's stones, by tile hash (LANDMARK_SPRITES.hiveStones). */
export const HIVE_SPRITES_VECTOR: readonly VectorSprite[] = LANDMARK_SPRITES.hiveStones.map((key, i) => one(key, hiveStone(i % 2 === 0 ? 1 : -1, i === 0)));
