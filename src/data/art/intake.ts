import { INTAKE_SPRITES } from '../foundryAssets';
import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// The foundry intake (019): a waterslide-sized pipe built into the centre of the
// north wall, matching the tube the player carries: a cyan body with dark ring
// bands and brass collars, a highlight along its top. It rises from a wide flared
// mouth across the four mouth tiles (060: was three) at floor level, up the wall face and out of
// sight. Dormant it is grey-cyan; attuned, cyan. World px around the anchor, the
// middle of the mouth's bottom edge (the line between the wall and the floor).

/** The pipe's body: half-width, where it leaves the flare, and where it turns into the wall (up the wall row and the wall shown above it). */
const BODY = { half: 20, bottom: -11, top: -72 } as const;
/** The flare: half-width at the floor (060: wide enough for four inlets, 18 px past the outer ones) and where it narrows into the body. */
const FLARE = { half: 66, neck: -11 } as const;

/** The four inlet ports in the flare, one over each mouth tile (x offsets from the mouth's middle, 060), and their height. */
export const INTAKE_INLETS = [-48, -16, 16, 48] as const;
const INLET_Y = -4.5;

const body = (fill: string, shade: string, light: string): Shape[] => [
  // The wall shadow behind it.
  rect(-BODY.half - 3, BODY.top, BODY.half * 2 + 6, BODY.bottom - BODY.top + 2, 0, flat({ id: 'ground-shade', alpha: 0.35 })),
  rect(-BODY.half, BODY.top, BODY.half * 2, BODY.bottom - BODY.top + 1, 0, {
    fill: { linear: [-BODY.half, 0, BODY.half, 0], stops: [{ at: 0, color: light }, { at: 0.35, color: fill }, { at: 1, color: shade }] },
    outline: true,
  }),
  // A highlight running along its top (lit side).
  rect(-BODY.half + 4, BODY.top, 4, BODY.bottom - BODY.top, 2, flat({ id: 'snow', alpha: 0.35 })),
  // A brass collar, then the elbow where it turns back into the wall: its dark opening seen from the front.
  rect(-BODY.half - 2, BODY.top + 3, BODY.half * 2 + 4, 3.4, 1, solid('brass')),
  ellipse(0, BODY.top, BODY.half, 6, { fill: shade, outline: true }),
  ellipse(0, BODY.top + 0.5, BODY.half - 4, 3.6, flat('ink')),
];

const flare = (fill: string, shade: string, rim: string): Shape[] => [
  path(
    `M ${-FLARE.half} 0 Q ${-FLARE.half + 4} ${FLARE.neck * 0.4} ${-BODY.half} ${FLARE.neck} L ${BODY.half} ${FLARE.neck} Q ${FLARE.half - 4} ${FLARE.neck * 0.4} ${FLARE.half} 0 Z`,
    { fill: { linear: [0, FLARE.neck, 0, 0], stops: [{ at: 0, color: fill }, { at: 1, color: shade }] }, outline: true },
  ),
  // The brass collar where the flare meets the body, and the brass lip of the mouth.
  rect(-BODY.half - 2, FLARE.neck - 2, BODY.half * 2 + 4, 3.4, 1, solid('brass')),
  rect(-FLARE.half + 1, -2.4, FLARE.half * 2 - 2, 2.4, 1, solid(rim)),
  // An inlet port over each mouth tile.
  ...INTAKE_INLETS.flatMap((x) => [ellipse(x, INLET_Y, 10, 3.6, solid('ink')), ellipse(x, INLET_Y - 0.7, 7, 2, flat('cyan-deep'))]),
];

const frame = (key: string, shapes: Shape[]): VectorSprite => ({ key, size: [144, 86], anchor: [72, 80], frames: [shapes] });

/**
 * The brass cap (024) seated over a capped side entrance's inlet: a domed lid with a rivet rim, two bolts and a
 * dim ley rune, around its anchor at the inlet's centre.
 */
const CAP: Shape[] = [
  ellipse(0, 1.2, 12, 3.6, flat({ id: 'ground-shade', alpha: 0.35 })),
  ellipse(0, 0, 11.5, 4.2, { fill: { linear: [0, -4, 0, 4], stops: [{ at: 0, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  path('M -8.5 -0.6 Q -8 -7 0 -7.4 Q 8 -7 8.5 -0.6 Q 0 2.2 -8.5 -0.6 Z', {
    fill: { linear: [0, -7.4, 0, 1], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass' }] },
    outline: true,
  }),
  rect(-1.2, -9.4, 2.4, 2.4, 0.6, solid('brass-dark')),
  ...[-9.5, 9.5].map((x) => ellipse(x, 0.6, 0.9, 0.9, solid('brass-dark'))),
  { ...line([-2.4, -3.4, 2.4, -3.4], 0.8, { id: 'cyan', alpha: 0.6 }, true), glow: { color: 'cyan', blur: 2 } },
  path('M -6 -3 Q -5 -6 -1.6 -6.4', { stroke: { color: { id: 'snow', alpha: 0.55 }, width: 0.8 } }),
];

/** Where a cap sits: on its inlet's centre, px from the pipe's anchor (add an INTAKE_INLETS x). */
export const CAP_SEAT_Y = INLET_Y;

/** The pipe, dormant (grey-cyan) and attuned (cyan), and the entrance cap. Its rings, gauges and pulses are drawn live over it (IntakeView). */
export const INTAKE_SPRITES_VECTOR: readonly VectorSprite[] = [
  frame(INTAKE_SPRITES.dormant, [...body('dormant', 'dormant-dark', 'rock-pale'), ...flare('dormant', 'dormant-dark', 'brass-dark')]),
  frame(INTAKE_SPRITES.attuned, [...body('cyan', 'cyan-deep', 'cyan-glow'), ...flare('cyan', 'cyan-deep', 'brass')]),
  { key: INTAKE_SPRITES.cap, size: [28, 16], anchor: [14, 11], frames: [CAP] },
];

/** The colour each entrance's gauge lights in, by the ammo it holds (024). */
export const ENTRANCE_GAUGE_COLORS: Readonly<Record<string, string>> = {
  arrow: 'straw-light',
  bomb: 'cinder',
  'ley-bolt': 'cyan-glow',
  // 029: tagged rounds, their tag's colour.
  'arrow+frost': 'water-light',
  'ley-bolt+homing': 'cyan',
  'ley-bolt+split': 'snow',
  // 038: landmines iron, cluster bombs a hotter ember.
  landmine: 'iron-light',
  'bomb+cluster': 'cinder-light',
  // 039: Frost rounds of every family glow frost, as the frost arrow does.
  'bomb+frost': 'water-light',
  'bomb+frost+cluster': 'water-light',
  'ley-bolt+frost': 'water-light',
  'ley-bolt+frost+homing': 'water-light',
  'ley-bolt+frost+split': 'water-light',
  'landmine+frost': 'water-light',
  // 060: Fire rounds of every family glow flame red, apart from a plain bomb's ember.
  'arrow+fire': 'flame-dark',
  'bomb+fire': 'flame-dark',
  'bomb+fire+cluster': 'flame-dark',
  'ley-bolt+fire': 'flame-dark',
  'ley-bolt+fire+homing': 'flame-dark',
  'ley-bolt+fire+split': 'flame-dark',
  'landmine+fire': 'flame-dark',
};

/**
 * The live lights on the pipe, px from the anchor:
 * - `bands`: the dark ring bands up the body; on attuning they light one by one (in time with the tube's attune), and stay lit.
 * - `gauge`: one column of small rings per entrance (024; 060: four), west to east up the body, each lit from the
 *   bottom in proportion to its entrance's count, in its ammo's colour (`ENTRANCE_GAUGE_COLORS`), with a soft glow.
 * - `pulse`: a ring of light that runs up the body into the wall as each item goes in.
 * - `capLift`: a cap lifting off (024): how far it rises and how long it takes, and the ring of light at its inlet.
 */
export const INTAKE_LOOK = {
  bands: { ys: [-17, -29, -41, -53, -65], height: 3, half: BODY.half, dark: 'dormant-dark', darkAlpha: 0.85, lit: 'cyan-glow', litAlpha: 0.5 },
  gauge: { xs: [-13.5, -4.5, 4.5, 13.5], bottom: -15, step: 5, half: 3.4, height: 2.4, dark: 'cyan-deep', darkAlpha: 0.7, litAlpha: 1, glowAlpha: 0.25, glowPad: 1 },
  pulse: { from: FLARE.neck, to: BODY.top, half: BODY.half + 3, height: 5, color: 'snow' },
  /** An entrance's fire pulse (028): a ring of light up its own gauge column as it fires a round, in its ammo's colour, over `ms`. */
  firePulse: { pad: 2, height: 4, ms: 300 },
  capLift: { rise: 26, ms: 650, ring: 'cyan-glow', ringRadius: 16, ringWidth: 2, ringFrom: 0.4 },
} as const;
