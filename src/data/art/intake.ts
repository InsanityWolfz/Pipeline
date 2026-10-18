import { INTAKE_SPRITES } from '../foundryAssets';
import { ellipse, flat, path, rect, solid, type Shape, type VectorSprite } from './types';

// The foundry intake (019): a waterslide-sized pipe built into the centre of the
// north wall, matching the tube the player carries: a cyan body with dark ring
// bands and brass collars, a highlight along its top. It rises from a wide flared
// mouth across the three mouth tiles at floor level, up the wall face and out of
// sight. Dormant it is grey-cyan; attuned, cyan. World px around the anchor, the
// middle of the mouth's bottom edge (the line between the wall and the floor).

/** The pipe's body: half-width, where it leaves the flare, and where it turns into the wall (up the wall row and the wall shown above it). */
const BODY = { half: 20, bottom: -11, top: -72 } as const;
/** The flare: half-width at the floor and where it narrows into the body. */
const FLARE = { half: 50, neck: -11 } as const;

/** The three inlet ports in the flare, one over each mouth tile (x offsets from the middle tile). */
export const INTAKE_INLETS = [-32, 0, 32] as const;

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
  ...INTAKE_INLETS.flatMap((x) => [ellipse(x, -4.5, 10, 3.6, solid('ink')), ellipse(x, -5.2, 7, 2, flat('cyan-deep'))]),
];

const frame = (key: string, shapes: Shape[]): VectorSprite => ({ key, size: [112, 86], anchor: [56, 80], frames: [shapes] });

/** The pipe, dormant (grey-cyan) and attuned (cyan). Its rings, gauge and pulses are drawn live over it (IntakeView). */
export const INTAKE_SPRITES_VECTOR: readonly VectorSprite[] = [
  frame(INTAKE_SPRITES.dormant, [...body('dormant', 'dormant-dark', 'rock-pale'), ...flare('dormant', 'dormant-dark', 'brass-dark')]),
  frame(INTAKE_SPRITES.attuned, [...body('cyan', 'cyan-deep', 'cyan-glow'), ...flare('cyan', 'cyan-deep', 'brass')]),
];

/**
 * The live lights on the pipe, px from the anchor:
 * - `bands`: the dark ring bands up the body; on attuning they light one by one (in time with the tube's attune), and stay lit.
 * - `gauge`: a column of small rings up the middle of the body, lit from the bottom in proportion to the reservoir.
 * - `pulse`: a ring of light that runs up the body into the wall as each item goes in.
 */
export const INTAKE_LOOK = {
  bands: { ys: [-17, -29, -41, -53, -65], height: 3, half: BODY.half, dark: 'dormant-dark', darkAlpha: 0.85, lit: 'cyan-glow', litAlpha: 0.5 },
  gauge: { x: 0, bottom: -15, step: 5, half: 7, height: 2.4, dark: 'cyan-deep', darkAlpha: 0.7, lit: 'snow', litAlpha: 1 },
  pulse: { from: FLARE.neck, to: BODY.top, half: BODY.half + 2, height: 3, color: 'cyan-glow' },
} as const;
