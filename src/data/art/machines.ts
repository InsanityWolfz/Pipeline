import { MACHINE_SPRITES, MACHINE_WORK, type PieceView } from '../foundryAssets';
import { PIECES } from '../pieces';
import { JAM_PHASE, jamGlint, MECHANISMS, type Box } from './mechanisms';
import { ellipse, flat, line, path, rect, solid, trim, type Paint, type Shape, type VectorSprite } from './types';

// Machines (020): a carved stone housing with brass trim, a window onto its
// mechanism (src/data/art/mechanisms.ts), a ley crystal on top that powers it and
// glows while it works, and a brass chute on the side it hands items out of. The
// icon of what it makes sits on the top face (render). Drawn round the bottom
// centre of the footprint, in three views: down (chute in front), up (chute at
// the back) and side (chute on the right; left is flipped). A 3x1 machine is a
// long housing across its tiles, or along them in the side view, where the
// mechanism sits in a pit in its long top face. 079: a light touch to match the pushed look: the front face's gradient
// runs diagonally from its lit top left, a rim light on the lit edges, a soft shade inside the right and bottom edges,
// a soft contact shadow, and brass glints on the band, posts, chute and window frame. The designs don't change.

type Footprint = '1x1' | '3x1';

const vertical = (top: string, bottom: string, y0: number, y1: number): Paint => ({ linear: [0, y0, 0, y1], stops: [{ at: 0, color: top }, { at: 1, color: bottom }] });

interface Housing {
  readonly size: readonly [number, number];
  /** Back and front: the housing's stone, under the mechanism. */
  readonly body: readonly Shape[];
  /** The mechanism's window. */
  readonly window: Box;
  /** Where the ley crystal stands. */
  readonly crystal: readonly [number, number];
  /** 079: the rim's lit edges and the brass glints' (band and posts), as polylines (x, y, ...): each kind one stroke. */
  readonly rims: readonly (readonly number[])[];
  readonly glints: readonly (readonly number[])[];
}

/** 079: a soft contact shadow, fading out from under the housing (was a flat ellipse). */
const shadow = (rx: number): Shape => ellipse(0, -2, rx, 4.2, { fill: { radial: [0, -2, rx], stops: [{ at: 0, color: { id: 'ground-shade', alpha: 0.45 } }, { at: 1, color: { id: 'ground-shade', alpha: 0 } }] } });

/** 079: the light touch (the pushed vector look): a rim on the lit edges, brass glints, a soft inner shade. */
const RIM = { id: 'snow', alpha: 0.55 } as const;
/**
 * Polylines (x, y, ...) as one stroke of `width` in `ink`: the rims (0.6 px snow) and the brass glints (0.5 px
 * brass-light) each bake as a single shape a frame, which keeps the foundry frames' bake within 079's 20%.
 */
const strokes = (segs: readonly (readonly number[])[], width: number, ink: typeof RIM | typeof GLINT): Shape =>
  path(segs.map((pts) => pts.map((v, i) => (i % 2 === 0 ? `${i === 0 ? 'M' : 'L'} ${v}` : `${v}`)).join(' ')).join(' '), trim(ink, width));
const GLINT = { id: 'brass-light', alpha: 0.9 } as const;
const SHADE = { id: 'rock-dark', alpha: 0.35 } as const;
/** A front face's gradient, diagonal from its top left (lit) to its bottom right. */
const diagonal = (x0: number, y0: number, x1: number, y1: number): Paint => ({ linear: [x0, y0, x1, y1], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] });
/** The soft shade inside a front face's right and bottom edges. */
const innerShade = (x0: number, y0: number, x1: number, y1: number): Shape[] => [line([x1 - 0.9, y0 + 1.5, x1 - 0.9, y1 - 0.9, x0 + 1.5, y1 - 0.9], 1, SHADE)];
/** A brass post, and its lit left edge. */
const post = (x: number, y: number, h: number): Shape => rect(x, y, 2, h, 0.6, solid('brass-dark'));
const postGlint = (x: number, y: number, h: number): number[] => [x + 0.4, y + 0.6, x + 0.4, y + h - 0.6];

/** A housing as wide as `w` px: front face, top face (for the icon) and trim. */
function wideHousing(w: number): Housing {
  const half = w / 2 - 2;
  return {
    size: [w, 44],
    body: [
      shadow(half + 1),
      rect(-half, -26, half * 2, 24, 2, { fill: diagonal(-half, -26, half, -2), outline: true }),
      ...innerShade(-half, -26, half, -2),
      path(`M ${-half} -26 L ${-half + 2} -40 L ${half - 2} -40 L ${half} -26 Z`, { fill: vertical('rock-pale', 'rock-light', -40, -26), outline: true }),
      rect(-half - 0.5, -27.2, half * 2 + 1, 2.4, 0.6, solid('brass')),
      ...[-half + 1.5, half - 3.5].map((x) => post(x, -24, 20)),
    ],
    window: { x: -half + 5, y: -23, w: half * 2 - 10, h: 18 },
    crystal: [-half + 5, -33],
    rims: [
      [-half + 0.6, -24.5, -half + 0.6, -3.5],
      [-half + 0.7, -26.6, -half + 2.4, -39.3, half - 2.6, -39.3],
    ],
    glints: [[-half + 0.2, -26.8, half - 0.2, -26.8], ...[-half + 1.5, half - 3.5].map((x) => postGlint(x, -24, 20))],
  };
}

/** The 3x1 side view: a housing three tiles deep, its mechanism in a pit in the long top face. */
const LONG_SIDE: Housing = {
  size: [32, 108],
  body: [
    shadow(15),
    rect(-14, -104, 28, 84, 2, { fill: vertical('rock-pale', 'rock-light', -104, -20), outline: true }),
    rect(-14, -22, 28, 20, 2, { fill: diagonal(-14, -22, 14, -2), outline: true }),
    ...innerShade(-14, -22, 14, -2),
    rect(-14.5, -23, 29, 2.4, 0.6, solid('brass')),
    path('M -4 -14 L 0 -10 L 4 -14 M 0 -10 L 0 -6', { stroke: { color: 'rock-dark', width: 0.8 } }),
    ...[-12.5, 10.5].map((x) => post(x, -102, 80)),
  ],
  rims: [
    [-13.4, -24.4, -13.4, -102.4, 12.4, -103.4],
    [-13.4, -20.5, -13.4, -3.5],
  ],
  glints: [[-14.3, -22.6, 14.3, -22.6], ...[-12.5, 10.5].map((x) => postGlint(x, -102, 80))],
  window: { x: -10, y: -80, w: 20, h: 40 },
  crystal: [-8, -96],
};

const HOUSINGS: Readonly<Record<Footprint, Readonly<Record<PieceView, Housing>>>> = {
  '1x1': { down: wideHousing(32), up: wideHousing(32), side: wideHousing(32) },
  '3x1': { down: wideHousing(96), up: wideHousing(96), side: LONG_SIDE },
};

/** The brass chute on the side the machine hands items out of. */
function chute(h: Housing, view: PieceView): Shape[] {
  const [w] = h.size;
  if (view === 'down') return [rect(-4, -5, 8, 5, 1, solid('brass')), ellipse(0, -1.4, 2.6, 1, flat('ink'))];
  if (view === 'up') return [rect(-4, -h.size[1], 8, 6, 1, solid('brass-dark')), ellipse(0, -h.size[1] + 1.2, 2.6, 1, flat('ink'))];
  const y = h === LONG_SIDE ? -64 : -17;
  return [rect(w / 2 - 5, y, 5, 9, 1, solid('brass')), ellipse(w / 2 - 0.8, y + 4.5, 1, 2.6, flat('ink'))];
}

/** 079: the chute's lit edge (its top, or its left in the side view). */
function chuteGlint(h: Housing, view: PieceView): number[] {
  const [w] = h.size;
  if (view === 'down') return [-3.2, -4.6, 3.2, -4.6];
  if (view === 'up') return [-3.2, -h.size[1] + 0.4, 3.2, -h.size[1] + 0.4];
  const y = h === LONG_SIDE ? -64 : -17;
  return [w / 2 - 4.6, y + 0.8, w / 2 - 4.6, y + 8.2];
}

/** The ley crystal that powers it: dim while still, glowing (and pulsing with the loop) while it works. */
function crystal([x, y]: readonly [number, number], glow: number): Shape[] {
  return [
    ellipse(x, y + 0.6, 3, 1.2, solid('rock-dark')),
    path(`M ${x - 2} ${y} L ${x - 1.2} ${y - 5} L ${x} ${y - 7} L ${x + 1.2} ${y - 5} L ${x + 2} ${y} Z`, {
      fill: { linear: [x, y, x, y - 7], stops: [{ at: 0, color: 'cyan-deep' }, { at: 1, color: glow > 0 ? 'cyan-glow' : 'cyan' }] },
      outline: true,
      ...(glow > 0 ? { glow: { color: 'cyan-glow', blur: 2 + 4 * glow } } : {}),
    }),
  ];
}

/** The window's recess, the mechanism inside, and the window's brass frame. */
function windowed(b: Box, mechanism: readonly Shape[]): Shape[] {
  return [
    rect(b.x, b.y, b.w, b.h, 1.6, { fill: vertical('ink', 'rock-dark', b.y, b.y + b.h) }),
    ...mechanism,
    rect(b.x, b.y, b.w, b.h, 1.6, { stroke: { color: 'brass-dark', width: 1.1 } }),
  ];
}

type State = { kind: 'idle' } | { kind: 'jammed' } | { kind: 'working'; t: number };

function machine(id: string, view: PieceView, state: State): Shape[] {
  const def = PIECES[id];
  if (def?.kind !== 'machine') throw new Error(`'${id}' is not a machine`);
  const mech = MECHANISMS[id];
  if (!mech) throw new Error(`No mechanism for '${id}'`);
  const h = HOUSINGS[def.footprint][view];
  const t = state.kind === 'working' ? state.t : state.kind === 'jammed' ? JAM_PHASE : 0;
  const glow = state.kind === 'working' ? 0.6 + 0.4 * Math.sin(state.t * Math.PI * 2) : 0;
  return [
    ...(view === 'up' ? chute(h, view) : []),
    ...h.body,
    ...windowed(h.window, [...mech(h.window, t), ...(state.kind === 'jammed' ? [jamGlint(h.window)] : [])]),
    ...crystal(h.crystal, glow),
    ...(view === 'up' ? [] : chute(h, view)),
    // 079: the rim on the lit edges, and the brass catching the light: band, posts, chute and the window's frame.
    strokes(h.rims, 0.6, RIM),
    strokes([...h.glints, chuteGlint(h, view), [h.window.x - 0.3, h.window.y + h.window.h - 1.4, h.window.x - 0.3, h.window.y + 1.4, h.window.x + 1.4, h.window.y - 0.3, h.window.x + h.window.w - 1.4, h.window.y - 0.3]], 0.5, GLINT),
    ...(state.kind === 'working' ? [line([h.window.x + 2, h.window.y + 1, h.window.x + h.window.w - 2, h.window.y + 1], 0.6, { id: 'cyan-glow', alpha: 0.4 * glow })] : []),
  ];
}

const sprite = (key: string, h: Housing, frames: readonly (readonly Shape[])[]): VectorSprite => ({ key, size: h.size, anchor: [h.size[0] / 2, h.size[1]], frames });

/** Every machine's idle, jammed and working frames in every view. */
export const MACHINE_SPRITES_VECTOR: readonly VectorSprite[] = Object.entries(MACHINE_SPRITES).flatMap(([id, views]) =>
  Object.entries(views).flatMap(([v, look]) => {
    const view = v as PieceView;
    const def = PIECES[id];
    if (def?.kind !== 'machine') throw new Error(`'${id}' is not a machine`);
    const h = HOUSINGS[def.footprint][view];
    const working = Array.from({ length: MACHINE_WORK.frames }, (_, i) => machine(id, view, { kind: 'working', t: i / MACHINE_WORK.frames }));
    return [sprite(look.idle, h, [machine(id, view, { kind: 'idle' })]), sprite(look.jammed, h, [machine(id, view, { kind: 'jammed' })]), sprite(look.working.key, h, working)];
  }),
);
