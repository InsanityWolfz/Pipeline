import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, type Shape } from './types';

// The cinder mote (061, draft for Shaun's review): a floating ember of the old forges held in a little cage of cooled
// slag, three bent bars between a cap and a ring, with a ley rivet of the builders' work on top. The ember breathes
// as it drifts and blazes up as it swells to burst (render swells the whole sprite with its wind-up). It floats: its
// shadow lies well below it. Light from the top left; world px round the feet.

const CY = -20;
const ember = { radial: [-1.5, CY - 1.5, 7.5] as const, stops: [{ at: 0, color: 'snow' }, { at: 0.3, color: 'cinder-light' }, { at: 0.7, color: 'cinder' }, { at: 1, color: 'flame-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 6.5, 2, { fill: { id: 'ground-shade', alpha: 0.28 } })] };

/** The ember itself, glowing through the bars. */
const core: EnemyPart = { id: 'ember', role: 'body', pivot: [0, CY], shapes: [ellipse(0, CY, 6.5, 6.5, { fill: ember, glow: { color: 'cinder', blur: 6 } })] };

/** The swell's blaze: a hot halo round the ember, shown at the pose's `charge`. */
const blaze: EnemyPart = {
  id: 'blaze',
  role: 'charge',
  pivot: [0, CY],
  shapes: [ellipse(0, CY, 10, 10, { fill: { radial: [0, CY, 10], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.6, color: { id: 'cinder', alpha: 0.6 } }, { at: 1, color: { id: 'flame-dark', alpha: 0 } }] }, glow: { color: 'cinder-light', blur: 8 } })],
};

/** A bent slag bar from the cap to the ring, bowed out by `bow` px. */
const bar = (x: number, bow: number): Shape => line([x * 0.45, CY - 9, x + bow, CY - 3, x + bow, CY + 3, x * 0.55, CY + 9], 2.2, 'ash-dark', true);

/** The cage: a slag cap with the brass-ringed ley rivet, the bars, and the ring under the ember, lit on its top left. */
const cage = (xs: readonly number[]): EnemyPart => ({
  id: 'cage',
  role: 'head',
  pivot: [0, CY],
  shapes: [
    ...xs.map((x) => bar(x, Math.sign(x) * 1.5)),
    path(`M -5 ${CY - 8} Q 0 ${CY - 13} 5 ${CY - 8} Q 0 ${CY - 10} -5 ${CY - 8} Z`, { fill: 'ash', outline: true }),
    ellipse(0, CY - 11, 1.6, 1.6, { fill: 'brass', outline: true }),
    ellipse(0, CY - 11.2, 0.7, 0.7, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    ellipse(0, CY + 9, 5, 1.8, { fill: 'ash-dark', outline: true }),
    ellipse(-1.5, CY + 8.6, 2.2, 0.6, { fill: 'ash-light' }),
    line([-6.5, CY - 4, -5.5, CY - 7], 0.9, 'ash-pale'),
  ],
});

/** Sparks drifting off the ember: a glow part, brighter as it swells. */
const sparks: EnemyPart = {
  id: 'sparks',
  role: 'glow',
  pivot: [0, CY],
  shapes: [ellipse(4, CY - 12, 0.9, 0.9, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 } }), ellipse(-3, CY - 15, 0.7, 0.7, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 } })],
};

export const CINDER_MOTE_RIG: EnemyRigDef = {
  id: 'cinder-mote',
  scale: 1,
  box: { size: [44, 48], anchor: [22, 42] },
  hip: [0, CY],
  views: {
    side: [ground, blaze, core, cage([-6, 2, 7]), sparks],
    down: [ground, blaze, core, cage([-7, 0, 7]), sparks],
    up: [ground, blaze, core, cage([-7, 0, 7]), sparks],
  },
  poses: {
    idle: [{ bob: -2, glow: 0.6 }],
    walk: [
      { bob: -3, lean: 0.08, glow: 0.6 },
      { bob: -2, lean: 0.1, glow: 0.8 },
      { bob: -1, lean: 0.08, glow: 0.6 },
      { bob: -2, lean: 0.06, glow: 0.4 },
    ],
    // The swell: the ember blazes, flickering between two frames.
    windup: [
      { bob: -2, charge: 0.9, glow: 1 },
      { bob: -2.5, charge: 1.15, glow: 0.8 },
    ],
    // The burst's first flash (it's gone the same tick; render shows the burst).
    swipe: [
      { charge: 1.5, glow: 1, scaleY: 1.1 },
      { charge: 1.8, glow: 1, alpha: 0.6 },
    ],
    hit: [{ bob: -1, lean: -0.25, scaleY: 0.9, glow: 1 }],
    death: DEATH_POSES,
  },
};
