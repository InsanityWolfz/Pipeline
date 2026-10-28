import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { cinderSeam, rimOf, rivets } from './enemyLook';
import { ellipse, line, path, type Shape } from './types';

// The cinder mote (061, draft for Shaun's review): a floating ember of the old forges held in a little cage of cooled
// slag, three bent bars between a cap and a ring, with a ley rivet of the builders' work on top. The ember breathes
// as it drifts and blazes up as it swells to burst (render swells the whole sprite with its wind-up). It floats: its
// shadow lies well below it. Light from the top left; world px round the feet.
// 076: the Forge constructs look: the cage is sooty iron with brass rivets and cinder glowing in its seams; the ley
// rivet stays cyan. Its wind-up: the cage contracts and the ember dims, the ember swells and flickers (today's swell
// scale kept), and at the peak the bars bow out round a white-hot core.

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
  shapes: [ellipse(0, CY, 13, 13, { fill: { radial: [0, CY, 13], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.6, color: { id: 'cinder', alpha: 0.6 } }, { at: 1, color: { id: 'flame-dark', alpha: 0 } }] }, glow: { color: 'cinder-light', blur: 8 } })],
};

/** A bent iron bar from the cap to the ring, bowed out by `bow` px, sooty, lit along its outer edge. */
const bar = (x: number, bow: number): Shape[] => [
  line([x * 0.45, CY - 9, x + bow, CY - 3, x + bow, CY + 3, x * 0.55, CY + 9], 2.3, 'iron-dark', true),
  line([x * 0.45 - 0.4, CY - 8.5, x + bow - 0.5, CY - 3, x + bow - 0.5, CY + 2], 0.7, x < 0 ? 'iron-light' : 'iron'),
];

/** The cage: a slag cap with the brass-ringed ley rivet, the bars, and the ring under the ember, lit on its top left. */
const cage = (xs: readonly number[]): EnemyPart => ({
  id: 'cage',
  role: 'head',
  pivot: [0, CY],
  shapes: [
    ...xs.flatMap((x) => bar(x, Math.sign(x) * 1.5)),
    path(`M -5 ${CY - 8} Q 0 ${CY - 13} 5 ${CY - 8} Q 0 ${CY - 10} -5 ${CY - 8} Z`, { fill: { linear: [-5, CY - 12, 5, CY - 8], stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'ash-dark' }] }, outline: true, rim: rimOf('forge') }),
    ...cinderSeam([-3.5, CY - 8.6, 3.5, CY - 8.6], 0.5),
    ellipse(0, CY - 11, 1.6, 1.6, { fill: 'brass', outline: true }),
    ellipse(0, CY - 11.2, 0.7, 0.7, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    ellipse(0, CY + 9, 5, 1.8, { fill: { linear: [-5, CY + 7, 5, CY + 11], stops: [{ at: 0, color: 'iron' }, { at: 1, color: 'ash-dark' }] }, outline: true, rim: rimOf('forge') }),
    ...rivets([[-3.5, CY + 9], [3.5, CY + 9]], 0.6),
    ellipse(-1.5, CY + 8.4, 1.6, 0.5, { fill: 'iron-light' }),
  ],
});

/** Sparks drifting off the ember: a glow part, brighter as it swells. */
const sparks: EnemyPart = {
  id: 'sparks',
  role: 'glow',
  follows: 'head',
  pivot: [0, CY],
  shapes: [ellipse(4, CY - 12, 0.9, 0.9, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 } }), ellipse(-3, CY - 15, 0.7, 0.7, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 } })],
};

export const CINDER_MOTE_RIG: EnemyRigDef = {
  id: 'cinder-mote',
  scale: 1,
  box: { size: [64, 62], anchor: [32, 54] },
  hip: [0, CY],
  tells: { windup: { part: 'cage', at: { side: [0, CY - 11], down: [0, CY - 11], up: [0, CY - 11] } } },
  views: {
    side: [ground, blaze, core, cage([-6, 2, 7]), sparks],
    down: [ground, blaze, core, cage([-7, 0, 7]), sparks],
    up: [ground, blaze, core, cage([-7, 0, 7]), sparks],
  },
  poses: {
    idle: [{ bob: -2, glow: 0.6 }],
    walk: [
      { bob: -2.5, lean: 0.08, glow: 0.6 },
      { bob: -2, lean: 0.1, glow: 0.8 },
      { bob: -1.5, lean: 0.08, glow: 0.6 },
      { bob: -2, lean: 0.06, glow: 0.4 },
    ],
    // 076: gather (the cage contracts and the ember dims), coil (the ember swells, flickering over two frames), peak
    // (the bars bow out round a white-hot core; render trembles it and swells the whole sprite as before).
    windup: [
      { bob: 0, squash: -0.1, charge: 0, glow: 0.25 },
      { bob: -6, charge: 0.9, glow: 1 },
      { bob: -6.5, charge: 1.15, glow: 0.8 },
      { bob: -10, squash: 0.08, charge: 1.45, glow: 1 },
    ],
    // The burst's first flash (it's gone the same tick; render shows the burst).
    swipe: [
      { charge: 1.5, glow: 1, squash: -0.1 },
      { charge: 1.8, glow: 1, alpha: 0.6 },
    ],
    // The cage rattles and the ember sputters.
    hit: [{ bob: -1, lean: -0.25, head: 0.3, squash: 0.1, glow: 0.3 }],
    // Knocked spinning; then righting itself.
    stagger: [
      { bob: -1, lean: -1.1, head: -0.5, squash: 0.06, glow: 0.4 },
      { bob: -2, lean: 0.35, head: 0.2, glow: 0.6 },
    ],
    // Killed, it flares white as its burst goes (the burst plays as before).
    death: [{ bob: -2, charge: 1.6, squash: -0.12, head: -0.3, glow: 1 }],
  },
};
