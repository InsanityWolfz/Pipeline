import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { glassInlay, rimOf, stormVein } from './enemyLook';
import { ellipse, line, path, type Shape } from './types';

// The thunderhawk (065, draft for Shaun's review): a storm bird construct of the old builders, slate plates on a brass
// frame, its swept wings veined with ley lightning that flares as it marks its dive. It flies: its body rides well above
// its shadow, swooping low along the dive (the pose's `bob`) and climbing away after. Its wings beat about the
// shoulders (the arm roles). Light from the top left; world px round the feet (its shadow).
// 076: the Storm-works look: slate plates on the brass frame with a pale storm rim, storm-glass at the wing joints,
// its wing veins violet lightning (its eyes stay ley cyan). Its wind-up folds its wings and climbs, rears up with the
// wings swept high and the tail fanned, and at the peak flares its wings, veins blazing, beak down the line. The dive
// stretches.

/** Its body's height over its shadow, px. */
const CY = -34;

const slate = { linear: [-10, CY - 8, 10, CY + 8] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.45, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const wingFill = { linear: [0, CY - 14, 0, CY + 6] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 11, 2.6, { fill: { id: 'ground-shade', alpha: 0.26 } })] };

/** A lightning vein along a wing: a jagged violet line with a white core and a glow. */
const vein = (pts: readonly number[]): Shape[] => stormVein(pts, 0.9);

/** A swept wing from the shoulder at (sx, sy), reaching `dir` × 20 px out and back (side: behind it). */
const wing = (id: string, role: 'arm-back' | 'arm-front', sx: number, sy: number, dir: number, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: [sx, sy],
  shapes: [
    path(`M ${sx} ${sy} Q ${sx + dir * 10} ${sy - 14} ${sx + dir * 22} ${sy - 10} L ${sx + dir * 17} ${sy - 5} L ${sx + dir * 20} ${sy - 2} L ${sx + dir * 12} ${sy + 1} L ${sx + dir * 14} ${sy + 4} Q ${sx + dir * 6} ${sy + 4} ${sx} ${sy + 3} Z`, { fill: wingFill, outline: true, rim: rimOf('storm') }),
    line([sx + dir * 2, sy - 1, sx + dir * 9, sy - 9, sx + dir * 20, sy - 9.5], 1.2, 'brass', false),
    ...vein([sx + dir * 4, sy + 1, sx + dir * 8, sy - 4, sx + dir * 11, sy - 2, sx + dir * 16, sy - 7]),
    ...glassInlay(sx + dir * 2.5, sy - 1, 1.6),
  ],
});

/** The vein glow: violet lightning sparking on the wings, brighter as it winds up. */
const sparkGlow = (pts: readonly (readonly [number, number])[]): EnemyPart => ({
  id: 'glow',
  role: 'glow',
  pivot: [0, CY],
  shapes: pts.map(([x, y]) => ellipse(x, y, 1.4, 1.4, { fill: 'snow', glow: { color: 'storm-glow', blur: 5 } })),
});

/** Side view (facing right): a slate body on a brass keel, its head and hooked beak ahead, a forked tail behind. */
const sideBody: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, CY],
  shapes: [
    path(`M -14 ${CY - 1} L -20 ${CY - 4} L -18 ${CY + 1} L -21 ${CY + 4} L -12 ${CY + 3} Z`, { fill: 'storm-dark', outline: true }),
    ellipse(0, CY, 12, 6, { fill: slate, outline: true, rim: rimOf('storm') }),
    line([-9, CY + 4, 9, CY + 4], 1.4, 'brass-dark', false),
    ellipse(11, CY - 3, 5, 4.5, { fill: slate, outline: true, rim: rimOf('storm') }),
    path(`M 15 ${CY - 4} L 20 ${CY - 2} L 16 ${CY} Z`, { fill: 'brass', outline: true }),
    ellipse(12.5, CY - 4, 1.2, 1.2, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    ellipse(-3, CY - 3, 4, 1.4, { fill: { id: 'storm-pale', alpha: 0.7 } }),
  ],
};

/** Front or back view: the body face-on, its head (and beak, in front) on top, its tail fanned below. */
const faceBody = (front: boolean): EnemyPart => ({
  id: 'body',
  role: 'body',
  pivot: [0, CY],
  shapes: [
    path(`M -4 ${CY + 6} L -6 ${CY + 13} L 0 ${CY + 10} L 6 ${CY + 13} L 4 ${CY + 6} Z`, { fill: 'storm-dark', outline: true }),
    ellipse(0, CY, 7, 8, { fill: slate, outline: true, rim: rimOf('storm') }),
    line([-5, CY + 3, 5, CY + 3], 1.2, 'brass-dark', false),
    ellipse(0, CY - 8, 5, 4.5, { fill: slate, outline: true, rim: rimOf('storm') }),
    ...(front
      ? [
          path(`M -1.8 ${CY - 7} L 0 ${CY - 2.5} L 1.8 ${CY - 7} Z`, { fill: 'brass', outline: true }),
          ellipse(-2.4, CY - 9, 1.1, 1.1, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
          ellipse(2.4, CY - 9, 1.1, 1.1, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
        ]
      : [line([0, CY - 4, 0, CY + 6], 1, 'brass', false)]),
    ellipse(-2.5, CY - 3, 2.5, 1.4, { fill: { id: 'storm-pale', alpha: 0.6 } }),
  ],
});

export const THUNDERHAWK_RIG: EnemyRigDef = {
  id: 'thunderhawk',
  scale: 1,
  box: { size: [76, 86], anchor: [38, 74] },
  hip: [0, CY],
  tells: { windup: { part: { side: 'wing-near', down: 'wing-right', up: 'wing-right' }, at: { side: [-21, CY - 11], down: [27, CY - 11], up: [27, CY - 11] } } },
  views: {
    side: [ground, wing('wing-far', 'arm-back', -2, CY - 2, -1), sideBody, wing('wing-near', 'arm-front', 1, CY - 1, -1), sparkGlow([[-8, CY - 5], [12.5, CY - 4]])],
    down: [ground, wing('wing-left', 'arm-back', -5, CY - 1, -1), wing('wing-right', 'arm-front', 5, CY - 1, 1, true), faceBody(true), sparkGlow([[-11, CY - 6], [11, CY - 6]])],
    up: [ground, faceBody(false), wing('wing-left', 'arm-back', -5, CY - 1, -1), wing('wing-right', 'arm-front', 5, CY - 1, 1, true), sparkGlow([[-11, CY - 6], [11, CY - 6]])],
  },
  poses: {
    // It hangs in the wind, wings beating slowly.
    idle: [{ bob: -1, armBack: 0.15, armFront: 0.15, glow: 0.4 }],
    // Its circling flight: a full wing beat over four frames.
    walk: [
      { bob: -1.5, armBack: 0.45, armFront: 0.45, glow: 0.4 },
      { bob: -1, armBack: 0.1, armFront: 0.1, glow: 0.5 },
      { bob: -0.5, armBack: -0.35, armFront: -0.35, glow: 0.4 },
      { bob: -1, armBack: 0.05, armFront: 0.05, glow: 0.3 },
    ],
    // 076: gather (wings fold in and it climbs), coil (rearing up with the wings swept high, tail fanned), peak (wings
    // flared, veins blazing, beak down the line; render trembles it). The dive stretches.
    windup: [
      { bob: -5, armBack: -0.45, armFront: -0.45, squash: -0.06, glow: 0.6 },
      { bob: -4, lean: -0.3, armBack: 0.95, armFront: 0.95, squash: -0.08, glow: 0.9 },
      { bob: -3, lean: 0.18, armBack: 1.1, armFront: 1.1, squash: 0.06, glow: 1 },
    ],
    // The dive: wings folded back, swooping down at the ground, stretched.
    swipe: [
      { bob: 14, lean: 0.3, armBack: -0.6, armFront: -0.6, squash: -0.12, glow: 0.9 },
      { bob: 18, lean: 0.35, armBack: -0.7, armFront: -0.7, squash: -0.08, glow: 0.8 },
    ],
    // The climb away: low still, beating hard to rise.
    recover: [{ bob: 8, lean: -0.15, armBack: 0.55, armFront: 0.55, glow: 0.5 }],
    // Knocked tumbling in the air.
    hit: [{ bob: -1, lean: -0.45, armBack: -0.3, armFront: 0.4, squash: 0.06, glow: 1 }],
    // It tumbles further, wings askew; then catches the air.
    stagger: [
      { bob: 0, lean: -1, armBack: -0.6, armFront: 0.8, squash: 0.08, glow: 0.6 },
      { bob: -1, lean: -0.25, armBack: 0.3, armFront: 0.1, glow: 0.5 },
    ],
    // Its wings fold and it drops toward its shadow as it dissolves.
    death: [{ bob: 12, lean: 0.45, armBack: -0.75, armFront: -0.75, squash: -0.1, glow: 0.2 }],
  },
};
