import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { BRASS, glassInlay, litRect, rimOf, rivets, stormVein } from './enemyLook';
import { ellipse, line, path, rect, solid } from './types';

// The storm sentinel (065, draft for Shaun's review): a squat turret of the builders' storm-works, a slate drum banded in
// brass on four stubby iron feet, an iron lightning rod rising from its crown with a cyan tip, and a big brass-ringed
// lens on its face that it calls strikes down through. The rod's tip and the lens charge (glow) as it calls. Light
// from the top left; world px round the feet.
// 076: the Storm-works look: the slate drum rimmed in pale storm light, brass bands and rivets, a storm-glass lens and
// rod tip, its charge violet. Its wind-up settles low, stretches the drum tall as the rod tip and lens charge (two
// frames), and crackles at the peak. Its strike flashes violet off the rod.

const drum = { linear: [-11, -30, 11, -6] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.4, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const glass = { radial: [-1, -20, 5] as const, stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 13, 3.4, { fill: { id: 'ground-shade', alpha: 0.32 } })] };

/** Stubby iron feet. */
const feet = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [0, -4],
  shapes: xs.map((x) => rect(x - 2.5, -6, 5, 5.5, 1.5, { fill, outline: true })),
});

/** The drum: slate in brass bands, a crown cap, and (in front) its lens. */
const body = (lens: boolean, side = false): EnemyPart => ({
  id: 'drum',
  role: 'body',
  pivot: [0, -16],
  shapes: [
    path('M -11 -6 L -11 -26 Q 0 -32 11 -26 L 11 -6 Q 0 -2 -11 -6 Z', { fill: drum, outline: true, rim: rimOf('storm') }),
    path('M -11 -10 Q 0 -6 11 -10', { stroke: { color: 'brass', width: 1.6 } }),
    path('M -11 -24 Q 0 -20 11 -24', { stroke: { color: 'brass', width: 1.2 } }),
    ...rivets([[-8, -9], [8, -9]], 0.6),
    ...stormVein([-9, -14, -6, -12.5, -7, -10.8], 0.5),
    ellipse(0, -27, 9, 3, { fill: { linear: [-9, -30, 9, -24], stops: [{ at: 0, color: 'storm-pale' }, { at: 1, color: 'storm' }] }, outline: true }),
    rect(-2, -30, 4, 3, 0.8, solid('brass-dark')),
    // Side on, its lens looks out to the side it faces, foreshortened.
    ...(lens ? [ellipse(side ? 6.5 : 0, -17, side ? 3.6 : 6.5, 6.5, { fill: { linear: [-6, -23, 6, -11], stops: [{ at: 0, color: 'brass-light' }, { at: 0.45, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }), ellipse(side ? 7 : 0, -17, side ? 2.6 : 4.8, 4.8, { fill: glass })] : [line([0, -24, 0, -9], 1, 'brass-dark', false), ...glassInlay(0, -16, 2.4)]),
    ellipse(-6, -22, 2.5, 1.2, { fill: { id: 'storm-pale', alpha: 0.6 } }),
  ],
});

/** The lightning rod from its crown: an iron shaft, brass collars and a cyan tip. */
const rod: EnemyPart = {
  id: 'rod',
  role: 'head',
  pivot: [0, -30],
  shapes: [
    line([0, -29, 0, -50], 2.2, 'iron', true),
    line([-0.5, -30, -0.5, -49], 0.6, 'iron-light'),
    litRect(-2.5, -36, 5, 2, 0.6, BRASS, 'storm'),
    litRect(-2, -44, 4, 1.6, 0.6, BRASS, 'storm'),
    ...glassInlay(0, -52.5, 2.4),
  ],
};

/** The rod's tip and the lens, charging as it calls: a glow part. */
const charge = (lens: boolean, side = false): EnemyPart => ({
  id: 'charge',
  role: 'glow',
  follows: 'head',
  pivot: [0, -30],
  shapes: [ellipse(0, -53, 2, 2, { fill: 'snow', glow: { color: 'storm-glow', blur: 5 } }), ...(lens ? [ellipse(side ? 6.5 : -1, -18, side ? 1.4 : 2.4, 2.4, { fill: { id: 'snow', alpha: 0.85 }, glow: { color: 'storm-glow', blur: 4 } })] : [])],
});

/** Its call: a crackle of sparks round the rod's tip, grown by the pose's `charge`. */
const sparks: EnemyPart = {
  id: 'sparks',
  role: 'charge',
  pivot: [0, -53],
  shapes: [ellipse(0, -53, 6, 6, { fill: { radial: [0, -53, 6], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: { id: 'storm-pale', alpha: 0.8 } }, { at: 1, color: { id: 'storm-glow', alpha: 0 } }] }, glow: { color: 'storm-glow', blur: 6 } })],
};

export const STORM_SENTINEL_RIG: EnemyRigDef = {
  id: 'storm-sentinel',
  scale: 1,
  box: { size: [60, 84], anchor: [30, 76] },
  hip: [0, -6],
  tells: { windup: { part: 'rod', at: { side: [0, -55], down: [0, -55], up: [0, -55] } } },
  views: {
    side: [ground, feet('feet-far', 'leg-back', [-6, 6], 'iron-dark'), body(true, true), rod, charge(true, true), sparks, feet('feet-near', 'leg-front', [-3], 'iron')],
    down: [ground, feet('feet', 'leg-back', [-7, 7], 'iron'), body(true), rod, charge(true), sparks],
    up: [ground, feet('feet', 'leg-back', [-7, 7], 'iron'), body(false), rod, charge(false), sparks],
  },
  poses: {
    idle: [{ glow: 0.4 }],
    // A slow, heavy shuffle.
    walk: [
      { step: 1.5, lift: 1, bob: -0.5, glow: 0.4 },
      { step: 0, bob: 0, glow: 0.4 },
      { step: -1.5, lift: 1, bob: -0.5, glow: 0.4 },
      { step: 0, bob: 0, glow: 0.4 },
    ],
    // 076: gather (it settles low on its feet), coil (the drum stretches tall and the rod tip and lens charge, over two
    // frames), peak (crackling; render trembles it). The strike flashes off its rod.
    windup: [
      { sink: 2, squash: 0.14, charge: 0.2, glow: 0.6 },
      { squash: -0.14, charge: 0.85, glow: 1 },
      { squash: -0.14, charge: 1.1, glow: 0.75 },
      { squash: -0.18, charge: 1.45, glow: 1 },
    ],
    swipe: [
      { sink: 0.5, charge: 1.6, glow: 1, squash: 0.08 },
      { charge: 0.6, glow: 0.7 },
    ],
    recover: [{ glow: 0.25 }],
    // The drum rocks.
    hit: [{ lean: -0.15, tilt: 0.1, head: -0.25, bob: 1, squash: 0.06, glow: 0.8 }],
    // It tips onto two feet; then rocks back down.
    stagger: [
      { tilt: -0.3, head: -0.4, legFront: -0.4, glow: 0.4 },
      { tilt: -0.07, squash: 0.08, glow: 0.4 },
    ],
    // The rod topples.
    death: [{ head: 1.25, headLift: 2, sink: 2, squash: 0.1, glow: 0 }],
  },
};
