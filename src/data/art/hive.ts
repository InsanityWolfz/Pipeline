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

// The seep: a squat grey stone split across its top, amber caked round the split.
const LIP: Shape[] = [
  shadow(16, 4, -1),
  path('M -16 0 Q -17 -8 -10 -12 Q -1 -15.5 8 -13 Q 16 -9.5 16 0 Z', solid('rock')),
  path('M -12 -9 Q -6 -13.5 2 -13.6 Q 9 -12.8 12 -9.6 Q 4 -10.6 -4 -10 Z', flat('rock-light')),
  path('M 16 0 Q 15.5 -8 10 -11.5 Q 12 -5 9 0 Z', flat('rock-dark')),
  line([-9, -3, -5, -6], 0.8, 'rock-dark'),
  // Crust caked on the stone, left and right of the split.
  path('M -13 -8 Q -11 -11.6 -6 -12.4 L -6.8 -9.8 Q -10.4 -9.2 -13 -8 Z', flat('resin-dark')),
  path('M 6 -12.8 Q 11 -12 13 -8.6 Q 9.6 -9.6 7 -10 Z', flat('resin-dark')),
];

/** The split's mouth, dark where the resin comes up. */
const CRACK: Shape = path('M -8 -10 Q 0 -13.6 8 -10.4 Q 1 -8.4 -8 -10 Z', flat('ink'));

/** The amber welling up out of the split at `k` of full, with `beads` beads on it; `lit` below 1 is dull resin coming back. */
function pool(k: number, beads: number, lit = 1): Shape[] {
  const rx = 8 * k + 1.5;
  const ry = 4.5 * k + 0.8;
  const top = -10.5 - ry * 0.6;
  const spots: readonly (readonly [number, number, number])[] = [
    [-4.4, -1.2, 2.8],
    [4, -0.6, 2.4],
    [0, -3.4, 2.2],
  ];
  return [
    CRACK,
    // The amber mound, its gloss and its glow.
    {
      ...path(`M ${-rx} -10.2 Q ${-rx * 0.9} ${top - ry * 0.5} 0 ${top - ry * 0.6} Q ${rx * 0.9} ${top - ry * 0.5} ${rx} -10.2 Q 0 ${-8.6 + ry * 0.2} ${-rx} -10.2 Z`, {
        fill: { linear: [0, top - ry, 0, -9], stops: AMBER },
        outline: true,
      }),
      ...(lit > 0 ? { glow: { color: 'resin-light', blur: 4 * lit } } : {}),
      alpha: 0.65 + 0.35 * lit,
    },
    ...(lit > 0 ? [ellipse(-rx * 0.35, top - ry * 0.15, rx * 0.32, ry * 0.22, flat({ id: 'snow', alpha: 0.55 * lit }))] : []),
    ...spots.slice(0, beads).flatMap(([x, y, r]) => bead(x * k, top + y * k, r * (0.55 + 0.45 * k), lit < 1)),
    // Drips running down the stone's face.
    ...(k >= 0.8 ? [path('M -5 -9.6 Q -5.6 -6 -5 -3.6', trim('resin', 1.6)), ellipse(-5, -3.2, 1.1, 1.4, flat('resin'))] : []),
    ...(k >= 0.55 && lit >= 1 ? [path('M 5.6 -9.8 Q 6.4 -7 6 -5.4', trim('resin', 1.4)), ellipse(6, -5, 1, 1.2, flat('resin'))] : []),
  ];
}

/** Depleted: the split scraped dry, a few flakes of dark crust left in it. */
const DRY: Shape[] = [CRACK, ...[-4.4, -0.5, 3.8].map((x, i) => ellipse(x, -10.8 + (i % 2) * 0.5, 1.5, 0.7, flat('resin-dark'))), line([-6, -9.6, 6, -9.9], 0.6, 'rock-dark')];

export const RESIN_SEEP = {
  size: [40, 40] as const,
  anchor: [20, 34] as const,
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
