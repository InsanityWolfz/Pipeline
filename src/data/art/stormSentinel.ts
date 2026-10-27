import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, rect, solid } from './types';

// The storm sentinel (065, draft for Shaun's review): a squat turret of the builders' storm-works, a slate drum banded in
// brass on four stubby iron feet, an iron lightning rod rising from its crown with a cyan tip, and a big brass-ringed
// lens on its face that it calls strikes down through. The rod's tip and the lens charge (glow) as it calls. Light
// from the top left; world px round the feet.

const drum = { linear: [-11, -30, 11, -6] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.4, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const glass = { radial: [-1, -20, 5] as const, stops: [{ at: 0, color: 'cyan-glow' }, { at: 0.6, color: 'cyan' }, { at: 1, color: 'cyan-deep' }] };

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
    path('M -11 -6 L -11 -26 Q 0 -32 11 -26 L 11 -6 Q 0 -2 -11 -6 Z', { fill: drum, outline: true }),
    path('M -11 -10 Q 0 -6 11 -10', { stroke: { color: 'brass', width: 1.6 } }),
    path('M -11 -24 Q 0 -20 11 -24', { stroke: { color: 'brass', width: 1.2 } }),
    ellipse(0, -27, 9, 3, { fill: 'storm-light', outline: true }),
    rect(-2, -30, 4, 3, 0.8, solid('brass-dark')),
    // Side on, its lens looks out to the side it faces, foreshortened.
    ...(lens ? [ellipse(side ? 6.5 : 0, -17, side ? 3.6 : 6.5, 6.5, { fill: 'brass', outline: true }), ellipse(side ? 7 : 0, -17, side ? 2.6 : 4.8, 4.8, { fill: glass })] : [line([0, -24, 0, -9], 1, 'brass-dark', false)]),
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
    rect(-2.5, -36, 5, 2, 0.6, solid('brass')),
    rect(-2, -44, 4, 1.6, 0.6, solid('brass')),
    path('M -1.6 -50 L 0 -55 L 1.6 -50 Z', { fill: 'iron-light', outline: true }),
  ],
};

/** The rod's tip and the lens, charging as it calls: a glow part. */
const charge = (lens: boolean, side = false): EnemyPart => ({
  id: 'charge',
  role: 'glow',
  pivot: [0, -30],
  shapes: [ellipse(0, -53, 2, 2, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 5 } }), ...(lens ? [ellipse(side ? 6.5 : -1, -18, side ? 1.4 : 2.4, 2.4, { fill: { id: 'snow', alpha: 0.85 }, glow: { color: 'cyan', blur: 4 } })] : [])],
});

/** Its call: a crackle of sparks round the rod's tip, grown by the pose's `charge`. */
const sparks: EnemyPart = {
  id: 'sparks',
  role: 'charge',
  pivot: [0, -53],
  shapes: [ellipse(0, -53, 6, 6, { fill: { radial: [0, -53, 6], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: { id: 'cyan-glow', alpha: 0.8 } }, { at: 1, color: { id: 'cyan', alpha: 0 } }] }, glow: { color: 'cyan', blur: 6 } })],
};

export const STORM_SENTINEL_RIG: EnemyRigDef = legacyRig({
  id: 'storm-sentinel',
  scale: 1,
  box: { size: [48, 76], anchor: [24, 68] },
  hip: [0, -6],
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
    // Its call: it braces and its rod crackles, flickering, while its circle waits.
    windup: [
      { sink: 1, charge: 0.8, glow: 1 },
      { sink: 1, charge: 1.1, glow: 0.75 },
    ],
    // The strike lands: a flash off its rod.
    swipe: [
      { sink: 0.5, charge: 1.6, glow: 1, scaleY: 1.04 },
      { charge: 0.6, glow: 0.7 },
    ],
    recover: [{ glow: 0.25 }],
    hit: [{ lean: -0.15, bob: 1, glow: 0.8 }],
  },
});
