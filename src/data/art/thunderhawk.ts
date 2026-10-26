import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, type Shape } from './types';

// The thunderhawk (065, draft for Shaun's review): a storm bird construct of the old builders, slate plates on a brass
// frame, its swept wings veined with ley lightning that flares as it marks its dive. It flies: its body rides well above
// its shadow, swooping low along the dive (the pose's `bob`) and climbing away after. Its wings beat about the
// shoulders (the arm roles). Light from the top left; world px round the feet (its shadow).

/** Its body's height over its shadow, px. */
const CY = -34;

const slate = { linear: [-10, CY - 8, 10, CY + 8] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.45, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const wingFill = { linear: [0, CY - 14, 0, CY + 6] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 11, 2.6, { fill: { id: 'ground-shade', alpha: 0.26 } })] };

/** A lightning vein along a wing: a jagged cyan line with a glow. */
const vein = (pts: readonly number[]): Shape => line(pts, 0.9, 'vein', false);

/** A swept wing from the shoulder at (sx, sy), reaching `dir` × 20 px out and back (side: behind it). */
const wing = (id: string, role: 'arm-back' | 'arm-front', sx: number, sy: number, dir: number, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: [sx, sy],
  shapes: [
    path(`M ${sx} ${sy} Q ${sx + dir * 10} ${sy - 14} ${sx + dir * 22} ${sy - 10} L ${sx + dir * 17} ${sy - 5} L ${sx + dir * 20} ${sy - 2} L ${sx + dir * 12} ${sy + 1} L ${sx + dir * 14} ${sy + 4} Q ${sx + dir * 6} ${sy + 4} ${sx} ${sy + 3} Z`, { fill: wingFill, outline: true }),
    line([sx + dir * 2, sy - 1, sx + dir * 9, sy - 9, sx + dir * 20, sy - 9.5], 1.2, 'brass', false),
    vein([sx + dir * 4, sy + 1, sx + dir * 8, sy - 4, sx + dir * 11, sy - 2, sx + dir * 16, sy - 7]),
  ],
});

/** The vein glow: lightning running the wings and its eye, brighter as it winds up. */
const sparkGlow = (pts: readonly (readonly [number, number])[]): EnemyPart => ({
  id: 'glow',
  role: 'glow',
  pivot: [0, CY],
  shapes: pts.map(([x, y]) => ellipse(x, y, 1.3, 1.3, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 4 } })),
});

/** Side view (facing right): a slate body on a brass keel, its head and hooked beak ahead, a forked tail behind. */
const sideBody: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, CY],
  shapes: [
    path(`M -14 ${CY - 1} L -20 ${CY - 4} L -18 ${CY + 1} L -21 ${CY + 4} L -12 ${CY + 3} Z`, { fill: 'storm-dark', outline: true }),
    ellipse(0, CY, 12, 6, { fill: slate, outline: true }),
    line([-9, CY + 4, 9, CY + 4], 1.4, 'brass-dark', false),
    ellipse(11, CY - 3, 5, 4.5, { fill: slate, outline: true }),
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
    ellipse(0, CY, 7, 8, { fill: slate, outline: true }),
    line([-5, CY + 3, 5, CY + 3], 1.2, 'brass-dark', false),
    ellipse(0, CY - 8, 5, 4.5, { fill: slate, outline: true }),
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
  box: { size: [68, 76], anchor: [34, 66] },
  hip: [0, CY],
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
      { bob: -2, armBack: 0.45, armFront: 0.45, glow: 0.4 },
      { bob: -1, armBack: 0.1, armFront: 0.1, glow: 0.5 },
      { bob: 0, armBack: -0.35, armFront: -0.35, glow: 0.4 },
      { bob: -1, armBack: 0.05, armFront: 0.05, glow: 0.3 },
    ],
    // Marking its dive: wings raised high, lightning flaring down them.
    windup: [{ bob: -3, armBack: 0.7, armFront: 0.7, glow: 1 }],
    // The dive: wings folded back, swooping down at the ground.
    swipe: [
      { bob: 14, lean: 0.3, armBack: -0.6, armFront: -0.6, glow: 0.9 },
      { bob: 18, lean: 0.35, armBack: -0.7, armFront: -0.7, glow: 0.8 },
    ],
    // The climb away: low still, beating hard to rise.
    recover: [{ bob: 8, lean: -0.15, armBack: 0.55, armFront: 0.55, glow: 0.5 }],
    hit: [{ bob: -1, lean: -0.3, armBack: -0.2, armFront: 0.3, glow: 1 }],
    death: DEATH_POSES,
  },
};
