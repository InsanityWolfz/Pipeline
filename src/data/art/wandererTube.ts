import { ellipse, flat, rect, solid, type Paint, type Shape } from './types';
import { lit, TONES } from './wandererLook';

// The tube (016, 075), in gun-local style px: the grip at the origin, pointing along +x. Its silhouette is 016's: the
// brass housing, the cyan barrel with four rings that light in order as it attunes, and the muzzle. 075 adds three
// etched flutes that roll round the barrel as it spins, a leather sling to the near shoulder and the muzzle flash.

const barrelPaint = (light: string, mid: string, dark: string): Paint => ({
  linear: [0, -4, 0, 4],
  stops: [
    { at: 0, color: light },
    { at: 0.4, color: mid },
    { at: 1, color: dark },
  ],
});

/** A four-point star, `r` long and `w` wide at its waist, for the muzzle flash. */
const star = (r: number, w: number, fill: string): Shape => ({
  kind: 'path',
  d: [['M', r, 0], ['Q', w, w, 0, r], ['Q', -w, w, -r, 0], ['Q', -w, -w, 0, -r], ['Q', w, -w, r, 0], ['Z']],
  fill,
  glow: { color: 'cyan', blur: 4 },
});

export const TUBE_PARTS = {
  housing: [
    rect(-9, -5, 15, 10, 3, { fill: lit(TONES.brass, -9, -5, 6, 5), outline: true }),
    rect(-9, 1.5, 15, 3.5, 1.8, flat('brass-dark')),
    rect(-7, -4, 5, 1.6, 0.8, flat('brass-light')),
    rect(12, 4, 4, 6, 1, solid('strap')),
  ],
  barrel: {
    lit: [rect(4, -4, 26, 8, 4, { fill: barrelPaint('cyan-glow', 'cyan', 'cyan-deep'), outline: true })],
    dormant: [rect(4, -4, 26, 8, 4, { fill: barrelPaint('rock-light', 'dormant', 'dormant-dark'), outline: true })],
  },
  ring: {
    lit: rect(-1.2, -4.6, 2.4, 9.2, 1, solid('cyan-deep')),
    dormant: rect(-1.2, -4.6, 2.4, 9.2, 1, solid('dormant-dark')),
    glowing: rect(-1.2, -4.6, 2.4, 9.2, 1, { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 4 } }),
  },
  /** Ring positions along the barrel, rear first: they light in this order as the tube attunes. */
  rings: [8, 13.5, 19, 24.5],
  /** 075: the etched flutes, drawn between the rings round a barrel this far either side of its axis, and their ink. */
  flutes: { count: 3, radius: 3.1, width: 0.7, from: 5, to: 29, lit: 'cyan-deep', dormant: 'dormant-dark' },
  muzzle: { lit: rect(28, -5.5, 6, 11, 2, solid('cyan-deep')), dormant: rect(28, -5.5, 6, 11, 2, solid('dormant-dark')) },
  muzzleGlow: ellipse(32.5, 0, 1.8, 3.2, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 4 } }),
  /** 075: the muzzle flash's three frames at `at` (gun-local): a full star, a smaller one turned 45°, a fading ring. */
  flash: {
    at: [36, 0],
    frames: [
      [star(9, 2.2, 'cyan'), star(5.5, 1.3, 'cyan-glow')],
      [star(6, 1.6, 'cyan'), star(3.5, 1, 'cyan-glow')],
      [ellipse(0, 0, 5, 5, { stroke: { color: { id: 'cyan-glow', alpha: 0.6 }, width: 1.2 }, glow: { color: 'cyan', blur: 3 } })],
    ] as readonly (readonly Shape[])[],
    /** Frame 1 turns this far past frame 0; odd shots start this far round from even ones. */
    turn: Math.PI / 4,
    alternate: Math.PI / 8,
  },
  /** 075: the sling runs from here on the housing to the near shoulder, sagging this far. */
  sling: { at: [-5, -4.5], sag: 3, width: 1.3, color: 'strap' },
  /** Where the hose joins, and the hands hold, in gun-local px. */
  rear: [-7, 2],
  frontGrip: [15, 5],
  rearGrip: [-1, 5],
} as const;
