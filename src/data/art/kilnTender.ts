import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, rect, solid } from './types';

// The kiln-tender (061, draft for Shaun's review): a small domed kiln of the old builders on three spindly iron legs,
// fired-clay brick banded in brass, its firebox mouth glowing, a ley-cyan rune on its band (the builders' work), and a
// long brass nozzle on its shoulder that its repair beam pours from in the kiln's orange. Light from the top left;
// world px round the feet.

const clay = { linear: [-10, -36, 10, -10] as const, stops: [{ at: 0, color: 'rust-light' }, { at: 0.55, color: 'rust' }, { at: 1, color: 'rust-dark' }] };
const fire = { radial: [0, -16, 5] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.6, color: 'cinder' }, { at: 1, color: 'flame-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 10, 2.8, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** Spindly iron legs with flat feet. */
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -10],
  shapes: xs.flatMap((x) => [line([x * 0.6, -11, x, -1.5], 2, fill, true), ellipse(x, -1, 2.6, 1.1, { fill: 'iron-dark', outline: true })]),
});

/** The domed kiln: clay brick, a brass band with a cyan rune, a vent cap on top. */
const kiln = (mouth: boolean): EnemyPart => ({
  id: 'kiln',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    path('M -10 -10 Q -12 -26 -6 -33 Q 0 -37 6 -33 Q 12 -26 10 -10 Z', { fill: clay, outline: true }),
    ...[-26, -18].map((y) => line([-10, y, 10, y], 0.8, { id: 'rust-dark', alpha: 0.7 })),
    rect(-11, -22, 22, 3, 1, solid('brass')),
    ellipse(-4, -20.5, 1, 1, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    rect(-3, -38, 6, 4, 1, solid('iron')),
    ...(mouth ? [path('M -5 -10 L -5 -15 Q 0 -19 5 -15 L 5 -10 Z', { fill: 'ink' })] : []),
    ellipse(-5, -31, 3, 1.2, { fill: { id: 'rust-light', alpha: 0.7 } }),
  ],
});

/** Its firebox glowing through the mouth, and the smoke-hole on top: a glow part, brighter as it beams. */
const firebox = (mouth: boolean): EnemyPart => ({
  id: 'fire',
  role: 'glow',
  pivot: [0, -14],
  shapes: [...(mouth ? [path('M -4 -10 L -4 -14 Q 0 -17.5 4 -14 L 4 -10 Z', { fill: fire, glow: { color: 'cinder', blur: 5 } })] : []), ellipse(0, -38.5, 2, 0.8, { fill: 'cinder-light', glow: { color: 'cinder', blur: 4 } })],
});

/** The brass nozzle on its shoulder, pointing ahead (side) or up and out (front, back). */
const nozzle = (side: boolean): EnemyPart => ({
  id: 'nozzle',
  role: 'arm-front',
  pivot: side ? [6, -28] : [7, -28],
  shapes: side
    ? [line([6, -28, 13, -31, 16, -30], 2.4, 'brass', true), ellipse(16.5, -30, 1.8, 1.6, { fill: 'brass-light', outline: true })]
    : [line([7, -28, 11, -33], 2.4, 'brass', true), ellipse(11.5, -34, 1.8, 1.6, { fill: 'brass-light', outline: true })],
});

export const KILN_TENDER_RIG: EnemyRigDef = legacyRig({
  id: 'kiln-tender',
  scale: 1,
  box: { size: [44, 52], anchor: [22, 46] },
  hip: [0, -10],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-5, 5], 'iron-dark'), kiln(false), firebox(false), nozzle(true), legs('legs-near', 'leg-front', [-2], 'iron')],
    down: [ground, legs('legs', 'leg-back', [-7, 0, 7], 'iron'), kiln(true), firebox(true), nozzle(false)],
    up: [ground, legs('legs', 'leg-back', [-7, 0, 7], 'iron'), nozzle(false), kiln(false), firebox(false)],
  },
  poses: {
    idle: [{ glow: 0.5 }],
    walk: [
      { step: 2, lift: 1.5, bob: -1, glow: 0.5 },
      { step: 0, bob: 0, glow: 0.5 },
      { step: -2, lift: 1.5, bob: -1, glow: 0.5 },
      { step: 0, bob: 0, glow: 0.5 },
    ],
    // It braces and aims its nozzle; then pours its beam, its fire roaring.
    windup: [{ sink: 1, armFront: -0.2, glow: 0.85 }],
    swipe: [
      { sink: 1, armFront: -0.25, glow: 1 },
      { sink: 1.5, armFront: -0.2, glow: 0.85 },
    ],
    recover: [{ glow: 0.3 }],
    hit: [{ lean: -0.18, bob: 1, glow: 0.5 }],
  },
});
