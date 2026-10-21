import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// The overworld's standing things (017), in the style test's look: trees with sun
// on their canopies, rounded boulders, ruin stones and walls, the ruined gatehouse over
// the foundry's stairs (053), and broken columns. World px around each anchor,
// which sits at the bottom centre of the tile it stands on.

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({
  key,
  size,
  anchor,
  frames: [shapes],
});

export const shadow = (rx: number, ry: number, y = -3): Shape => ellipse(0, y, rx, ry, { fill: { id: 'ground-shade', alpha: 0.3 } });

/** A canopy of overlapping circles, drawn dark to light so the sun sits on its top left. */
export function canopy(circles: readonly (readonly [number, number, number])[]): Shape[] {
  return [
    ...circles.map(([x, y, r]) => ellipse(x, y, r + 0.75, r + 0.75, flat('ink'))),
    ...circles.map(([x, y, r]) => ellipse(x, y, r, r, flat('leaf-dark'))),
    ...circles.map(([x, y, r]) => ellipse(x - 1.2, y - 1.8, r - 1.8, r - 1.8, flat('leaf'))),
    ...circles.map(([x, y, r]) => ellipse(x - 3, y - 4.2, r * 0.5, r * 0.45, flat('leaf-light'))),
    ...circles.map(([x, y, r]) => ellipse(x - 4.2, y - 6, r * 0.18, r * 0.15, flat('leaf-pale'))),
  ];
}

export const trunk = (h: number): Shape[] => [
  path(`M -5.4 0 Q -3.6 -1.2 -3.6 ${-h} L 3.6 ${-h} Q 3.6 -1.2 6 0 Z`, solid('wood')),
  rect(0.6, -h, 3, h - 0.6, 1.2, flat('wood-dark')),
  rect(-3, -h + 1.2, 1.2, h * 0.65, 0.6, flat('wood-light')),
];

/** Trees: three shapes, picked per tile so a grove never repeats in step. */
export const TREES: readonly VectorSprite[] = [
  sprite('ow-tree-0', [56, 72], [28, 68], [shadow(18, 5), ...trunk(18), ...canopy([[0, -34, 17], [-13, -27, 11], [13, -27, 11], [-8, -43, 11], [8, -43, 11], [0, -48, 10]])]),
  sprite('ow-tree-1', [52, 64], [26, 60], [shadow(15, 4.5), ...trunk(14), ...canopy([[0, -28, 15], [-11, -22, 10], [11, -23, 10], [-5, -38, 10], [6, -37, 9]])]),
  sprite('ow-tree-2', [60, 78], [30, 74], [shadow(19, 5.5), ...trunk(20), ...canopy([[0, -38, 18], [-14, -31, 12], [14, -30, 12], [-9, -48, 12], [9, -49, 11], [0, -56, 10]])]),
];

/** A rounded boulder, light on its top left, with a crack. */
export function boulder(k: number): Shape[] {
  const pts = (list: readonly (readonly [number, number])[]): string => {
    const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
    const n = list.length;
    const start = mid(list[n - 1] ?? [0, 0], list[0] ?? [0, 0]);
    let d = `M ${start[0] * k} ${start[1] * k}`;
    for (let i = 0; i < n; i++) {
      const p = list[i] ?? [0, 0];
      const m = mid(p, list[(i + 1) % n] ?? [0, 0]);
      d += ` Q ${p[0] * k} ${p[1] * k} ${m[0] * k} ${m[1] * k}`;
    }
    return `${d} Z`;
  };
  return [
    shadow(15 * k, 4 * k, -1),
    path(pts([[-15, 0], [-16, -7], [-9, -14], [1, -16], [11, -13], [16, -6], [13, 0]]), solid('rock')),
    path(pts([[13, 0], [16, -6], [11, -8], [6, -3], [3, 0]]), flat('rock-dark')),
    path(pts([[-11, -7], [-7, -13], [2, -14.5], [9, -11.5], [6, -7], [-4, -5.5]]), flat('rock-light')),
    path(pts([[-7.5, -10], [-3.5, -12], [0.5, -12], [-2.5, -10]]), flat('rock-pale')),
    path(`M ${-1 * k} ${-5.5 * k} L ${1.2 * k} ${-2.5 * k} L 0 0`, { stroke: { color: 'rock-dark', width: 0.9 } }),
  ];
}

export const ROCKS: readonly VectorSprite[] = [
  sprite('ow-rock-0', [40, 30], [20, 27], boulder(1.15)),
  sprite('ow-rock-1', [36, 26], [18, 23], boulder(0.9)),
];

/** A ruin block: a squared stone, its top worn, moss on one corner and a faint rune. */
export const RUIN_STONE = sprite('ow-ruin-stone', [36, 44], [18, 40], [
  shadow(15, 4, -1),
  rect(-14, -26, 28, 26, 3, solid('rock')),
  rect(-14, -32, 28, 10, 3, solid('rock-light')),
  rect(6, -26, 8, 26, 2, flat('rock-dark')),
  ellipse(-9, -31, 6, 2.4, flat('grass-light')),
  path('M -4 -16 L 0 -10 L 4 -16', { stroke: { color: { id: 'cyan-deep', alpha: 0.7 }, width: 1.2 } }),
]);

/** A length of the shrine's wall: rune-carved blocks with a lit top. */
export const RUIN_WALL = sprite('ow-ruin-wall', [34, 52], [17, 48], [
  shadow(16, 4, -1),
  rect(-16, -34, 32, 34, 2, solid('rock')),
  rect(-16, -42, 32, 10, 2, solid('rock-light')),
  line([-16, -18, 16, -18], 1, 'rock-dark'),
  line([0, -32, 0, -18], 1, 'rock-dark'),
  line([-8, -18, -8, 0], 1, 'rock-dark'),
  line([8, -18, 8, 0], 1, 'rock-dark'),
  ellipse(-10, -41, 5, 2, flat('moss-tuft')),
]);

/** A lit crystal on a pillar's cap: a cut stone of ley light, glowing so the entrance shows from afar. */
const beacon = (x: number, y: number): Shape[] => [
  ellipse(x, y + 2, 15, 6, { fill: { id: 'cyan', alpha: 0.35 }, glow: { color: 'cyan-glow', blur: 18 } }),
  path(`M ${x} ${y - 22} L ${x + 9} ${y - 6} L ${x} ${y + 4} L ${x - 9} ${y - 6} Z`, { ...solid('cyan'), glow: { color: 'cyan-glow', blur: 12 } }),
  path(`M ${x} ${y - 22} L ${x + 9} ${y - 6} L ${x} ${y - 4} Z`, flat('cyan-glow')),
];

/** A tall rune pillar of the gatehouse, its ley rune lit, centred on `x`. */
const gatePillar = (x: number): Shape[] => [
  rect(x - 14, -252, 28, 252, 4, solid('rock-light')),
  rect(x + 4, -252, 10, 252, 3, flat('rock')),
  rect(x - 18, -262, 36, 14, 3, solid('rock')),
  rect(x - 18, -16, 36, 16, 3, solid('rock')),
  line([x, -232, x, -40], 1.6, { id: 'cyan', alpha: 0.9 }),
  path(`M ${x - 6} -200 L ${x} -192 L ${x + 6} -200 M ${x - 6} -150 L ${x} -142 L ${x + 6} -150 M ${x - 6} -100 L ${x} -92 L ${x + 6} -100`, { stroke: { color: 'cyan', width: 1.4 }, glow: { color: 'cyan', blur: 4 } }),
  ...beacon(x, -270),
];

/**
 * The foundry's entrance (017; 053, D.2: "make it really obvious that it's like a big thing"): a ruined gatehouse of
 * the lost civilisation over the whole 9 × 5 tile footprint round the stairs, its broken facade carved with ley runes,
 * two tall rune pillars with lit crystals that show from afar, and a great arch whose doorway glows with ley light
 * from below, steps going down into it. Anchored at the bottom centre of the door tile; it covers the ruin's blocks.
 */
export const ENTRANCE = sprite('ow-entrance', [340, 330], [170, 300], [
  ellipse(0, -2, 168, 24, { fill: { id: 'ground-shade', alpha: 0.3 } }),
  // Rubble and moss round its foot.
  rect(-150, -24, 34, 24, 4, solid('rock')),
  rect(118, -20, 30, 20, 4, solid('rock')),
  ellipse(-146, -4, 10, 4, flat('moss-tuft')),
  // The facade: a broken wall of cut stone, its top fallen away in steps, with its lit courses.
  path('M -136 0 L -136 -178 L -112 -178 L -112 -196 L -70 -196 L -70 -214 L -20 -214 L -12 -222 L 30 -222 L 30 -206 L 76 -206 L 76 -190 L 104 -190 L 112 -170 L 136 -170 L 136 0 Z', solid('rock')),
  path('M -136 -178 L -112 -178 L -112 -196 L -70 -196 L -70 -214 L -20 -214 L -12 -222 L 30 -222 L 30 -206 L 76 -206 L 76 -190 L 104 -190 L 112 -170 L 136 -170 L 136 -160 L -136 -160 Z', flat('rock-light')),
  line([-136, -120, 136, -120], 1, 'rock-dark'),
  line([-136, -80, 136, -80], 1, 'rock-dark'),
  line([-136, -40, 136, -40], 1, 'rock-dark'),
  line([-96, -160, -96, -120], 1, 'rock-dark'),
  line([88, -120, 88, -80], 1, 'rock-dark'),
  line([-80, -80, -80, -40], 1, 'rock-dark'),
  line([96, -40, 96, 0], 1, 'rock-dark'),
  // Carved ley bands either side of the arch.
  path('M -112 -140 L -96 -132 L -80 -140 L -64 -132 M 64 -132 L 80 -140 L 96 -132 L 112 -140', { stroke: { color: 'cyan', width: 1.4 }, glow: { color: 'cyan', blur: 5 } }),
  // The great arch.
  rect(-54, -168, 108, 168, 10, solid('rock-light')),
  ellipse(0, -166, 54, 26, solid('rock-light')),
  rect(-40, -150, 80, 150, 8, flat('hood-dark')),
  ellipse(0, -150, 40, 20, flat('hood-dark')),
  // The doorway lit from below: ley light rising out of the stairs.
  rect(-36, -146, 72, 146, 8, {
    fill: { linear: [0, 0, 0, -146], stops: [{ at: 0, color: { id: 'cyan-glow', alpha: 0.95 } }, { at: 0.45, color: { id: 'cyan', alpha: 0.55 } }, { at: 1, color: { id: 'hood-dark', alpha: 0 } }] },
    glow: { color: 'cyan-glow', blur: 16 },
  }),
  // Steps going down, each edge lit.
  rect(-34, -12, 68, 8, 1, flat('rock-dark')),
  rect(-30, -26, 60, 8, 1, { fill: 'rock-dark', alpha: 0.8 }),
  rect(-26, -40, 52, 8, 1, { fill: 'rock-dark', alpha: 0.6 }),
  rect(-22, -54, 44, 8, 1, { fill: 'rock-dark', alpha: 0.4 }),
  line([-34, -12, 34, -12], 1.2, { id: 'cyan-glow', alpha: 0.9 }),
  line([-30, -26, 30, -26], 1.2, { id: 'cyan-glow', alpha: 0.7 }),
  line([-26, -40, 26, -40], 1.2, { id: 'cyan-glow', alpha: 0.5 }),
  // The keystone and its rune.
  rect(-14, -196, 28, 26, 3, solid('rock')),
  path('M -7 -190 L 0 -178 L 7 -190', { stroke: { color: 'cyan-glow', width: 2 }, glow: { color: 'cyan', blur: 6 } }),
  // Light spilling out over the ground in front.
  ellipse(0, 4, 44, 9, { fill: { id: 'cyan-glow', alpha: 0.35 }, glow: { color: 'cyan', blur: 10 } }),
  ...gatePillar(-118),
  ...gatePillar(118),
  ellipse(-60, -214, 12, 4, flat('moss-tuft')),
  ellipse(124, -170, 9, 3, flat('moss-tuft')),
]);

/** A broken column in the ruin field. */
export const COLUMN = sprite('ow-column', [28, 60], [14, 56], [
  shadow(11, 3.5, -1),
  rect(-10, -6, 20, 6, 2, solid('rock')),
  rect(-7, -44, 14, 39, 2, solid('rock-light')),
  rect(2, -44, 5, 39, 2, flat('rock')),
  path('M -7 -44 L -3 -50 L 1 -45 L 5 -49 L 7 -44 Z', solid('rock-light')),
]);

/** Every standing overworld sprite, for the vector catalog. */
export const TERRAIN_SPRITES: readonly VectorSprite[] = [...TREES, ...ROCKS, RUIN_STONE, RUIN_WALL, ENTRANCE, COLUMN];
