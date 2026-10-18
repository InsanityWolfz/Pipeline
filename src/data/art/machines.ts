import { MACHINE_SPRITES, MACHINE_WORK, type PieceView } from '../foundryAssets';
import { PIECES } from '../pieces';
import { JAM_PHASE, jamGlint, MECHANISMS, type Box } from './mechanisms';
import { ellipse, flat, line, path, rect, solid, type Paint, type Shape, type VectorSprite } from './types';

// Machines (020): a carved stone housing with brass trim, a window onto its
// mechanism (src/data/art/mechanisms.ts), a ley crystal on top that powers it and
// glows while it works, and a brass chute on the side it hands items out of. The
// icon of what it makes sits on the top face (render). Drawn round the bottom
// centre of the footprint, in three views: down (chute in front), up (chute at
// the back) and side (chute on the right; left is flipped). A 3x1 machine is a
// long housing across its tiles, or along them in the side view, where the
// mechanism sits in a pit in its long top face.

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
}

const shadow = (rx: number): Shape => ellipse(0, -2, rx, 3.4, { fill: { id: 'ground-shade', alpha: 0.4 } });

/** A housing as wide as `w` px: front face, top face (for the icon) and trim. */
function wideHousing(w: number): Housing {
  const half = w / 2 - 2;
  return {
    size: [w, 44],
    body: [
      shadow(half + 1),
      rect(-half, -26, half * 2, 24, 2, { fill: vertical('rock-light', 'rock', -26, -2), outline: true }),
      path(`M ${-half} -26 L ${-half + 2} -40 L ${half - 2} -40 L ${half} -26 Z`, { fill: vertical('rock-pale', 'rock-light', -40, -26), outline: true }),
      rect(-half - 0.5, -27.2, half * 2 + 1, 2.4, 0.6, solid('brass')),
      ...[-half + 1.5, half - 3.5].map((x) => rect(x, -24, 2, 20, 0.6, solid('brass-dark'))),
    ],
    window: { x: -half + 5, y: -23, w: half * 2 - 10, h: 18 },
    crystal: [-half + 5, -33],
  };
}

/** The 3x1 side view: a housing three tiles deep, its mechanism in a pit in the long top face. */
const LONG_SIDE: Housing = {
  size: [32, 108],
  body: [
    shadow(15),
    rect(-14, -104, 28, 84, 2, { fill: vertical('rock-pale', 'rock-light', -104, -20), outline: true }),
    rect(-14, -22, 28, 20, 2, { fill: vertical('rock-light', 'rock', -22, -2), outline: true }),
    rect(-14.5, -23, 29, 2.4, 0.6, solid('brass')),
    path('M -4 -14 L 0 -10 L 4 -14 M 0 -10 L 0 -6', { stroke: { color: 'rock-dark', width: 0.8 } }),
    ...[-12.5, 10.5].map((x) => rect(x, -102, 2, 80, 0.6, solid('brass-dark'))),
  ],
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
