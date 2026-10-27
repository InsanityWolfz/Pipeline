import type { LimbStyle, Shape } from '../../data/art/types';
import { WANDERER, type WandererView } from '../../data/art/wanderer';
import { drawShape, type DrawOpts } from './draw';
import type { Pt } from './affine';
import type { FootPose } from './wandererPose';

// The wanderer's limbs (075): two-segment legs in ranger boots and slim arms in bracers, bent by two-bone IK, and the
// ringed hose clipped at the belt. Drawn in whatever frame the caller set on the canvas.

const R = WANDERER.rig;
const L = WANDERER.limbs;

export function limb(c: CanvasRenderingContext2D, pts: readonly number[], style: LimbStyle, o: DrawOpts, curve = false): void {
  drawShape(c, { kind: 'line', pts, width: style.width, color: style.color, outline: style.outline, curve }, o);
  if (!style.bands) return;
  c.save();
  c.setLineDash([...style.bands.dash]);
  drawShape(c, { kind: 'line', pts, width: style.width, color: style.bands.color, curve }, o);
  c.restore();
}

export function at(c: CanvasRenderingContext2D, p: Pt, s: Shape, o: DrawOpts, turn = 0): void {
  c.save();
  c.translate(p[0], p[1]);
  if (turn) c.rotate(turn);
  drawShape(c, s, o);
  c.restore();
}

/**
 * The joint between `from` and `to` on segments `a` and `b`: of the two places it can bend to, the one `prefer`
 * scores higher. Out of reach, the limb is straight.
 */
export function bend(from: Pt, to: Pt, a: number, b: number, prefer: (p: Pt) => number): Pt {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const p1: Pt = [from[0] + Math.cos(base + off) * a, from[1] + Math.sin(base + off) * a];
  const p2: Pt = [from[0] + Math.cos(base - off) * a, from[1] + Math.sin(base - off) * a];
  return prefer(p1) >= prefer(p2) ? p1 : p2;
}

/** A leg from the hip to the foot: the knee bends forward side on, or sits a little out facing the camera or away. */
export function drawLeg(c: CanvasRenderingContext2D, view: WandererView, hip: Pt, foot: FootPose, near: boolean, side: 1 | -1, o: DrawOpts): void {
  const ankle: Pt = [foot.x, foot.y + R.ankle];
  const knee: Pt =
    view === 'side'
      ? bend(hip, ankle, R.thigh, R.shin, (p) => p[0])
      : [(hip[0] + ankle[0]) / 2 + side * R.kneeOut, (hip[1] + ankle[1]) / 2];
  const leg = near ? L.legNear : L.legFar;
  const boot = near ? L.bootNear : L.bootFar;
  const sx = knee[0] - ankle[0];
  const sy = knee[1] - ankle[1];
  const sl = Math.hypot(sx, sy) || 1;
  const up = (k: number): Pt => [ankle[0] + (sx / sl) * k, ankle[1] + (sy / sl) * k];
  const top = up(R.bootShaft);
  const cuffTop = up(R.bootShaft + R.cuff);
  limb(c, [knee[0], knee[1], ankle[0], ankle[1]], leg, o);
  limb(c, [ankle[0], ankle[1], top[0], top[1]], boot, o);
  limb(c, [top[0], top[1], cuffTop[0], cuffTop[1]], L.cuff, o);
  const shape = view === 'side' ? (near ? WANDERER.boot.front : WANDERER.boot.back) : view === 'down' ? WANDERER.boot.toward : WANDERER.boot.away;
  at(c, [foot.x, foot.y], shape, o, foot.tilt);
  limb(c, [hip[0], hip[1], knee[0], knee[1]], leg, o);
  const wrapTo = up(sl - 0.8);
  const wrapFrom = up(sl - 2.6);
  limb(c, [wrapFrom[0], wrapFrom[1], wrapTo[0], wrapTo[1]], L.wrap, o);
}

/** An arm from the shoulder to the hand: the bone sleeve to the elbow, the bracer with its etched line and rivet, the glove. */
export function drawArm(c: CanvasRenderingContext2D, view: WandererView, shoulder: Pt, hand: Pt, near: boolean, o: DrawOpts): void {
  const out = Math.sign(shoulder[0]) || 1;
  const elbow = bend(shoulder, hand, R.upperArm, R.forearm, (p) => (view === 'side' ? p[1] - p[0] * 0.6 : view === 'down' ? p[1] + out * p[0] * 0.8 : p[1] - out * p[0] * 0.4));
  const bracer = near ? L.bracerNear : L.bracerFar;
  limb(c, [shoulder[0], shoulder[1], elbow[0], elbow[1]], near ? L.sleeveNear : L.sleeveFar, o);
  limb(c, [elbow[0], elbow[1], hand[0], hand[1]], bracer, o);
  // The etched line down the bracer, and a brass rivet by the elbow.
  const fx = hand[0] - elbow[0];
  const fy = hand[1] - elbow[1];
  const fl = Math.hypot(fx, fy) || 1;
  const along = (k: number): Pt => [elbow[0] + (fx / fl) * k, elbow[1] + (fy / fl) * k];
  const e0 = along(1.6);
  const e1 = along(Math.max(1.7, fl - 2.2));
  limb(c, [e0[0], e0[1] - 0.4, e1[0], e1[1] - 0.4], L.etch, o);
  at(c, along(1), WANDERER.rivet, o);
  at(c, hand, WANDERER.hand, o);
}

/** The hose: tank outlet → belt clip → tube rear, as two cubics joined smoothly at the clip. */
export interface HosePath {
  a: readonly [Pt, Pt, Pt, Pt];
  b: readonly [Pt, Pt, Pt, Pt];
}

export function hosePath(from: Pt, sag: Pt, clip: Pt, rearBend: Pt, rear: Pt): HosePath {
  const c1: Pt = [from[0] + sag[0], from[1] + sag[1]];
  const inTo: Pt = [clip[0] - (rearBend[0] - clip[0]) * 0.35, clip[1] - (rearBend[1] - clip[1]) * 0.35];
  const outOf: Pt = [clip[0] * 2 - inTo[0], clip[1] * 2 - inTo[1]];
  return { a: [from, c1, inTo, clip], b: [clip, outOf, rearBend, rear] };
}

const cubic = ([p0, p1, p2, p3]: readonly [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t;
  const k0 = u * u * u;
  const k1 = 3 * u * u * t;
  const k2 = 3 * u * t * t;
  const k3 = t * t * t;
  return [k0 * p0[0] + k1 * p1[0] + k2 * p2[0] + k3 * p3[0], k0 * p0[1] + k1 * p1[1] + k2 * p2[1] + k3 * p3[1]];
};

/** A point `u` of the way along the hose (0 at the tank, 1 at the tube), by halves. */
export const hoseAt = (h: HosePath, u: number): Pt => (u < 0.5 ? cubic(h.a, u * 2) : cubic(h.b, u * 2 - 1));

export function drawHose(c: CanvasRenderingContext2D, h: HosePath, style: LimbStyle, flow: number, o: DrawOpts): void {
  const pts = (q: readonly [Pt, Pt, Pt, Pt]) => q.flatMap((p) => [p[0], p[1]]);
  c.save();
  c.lineDashOffset = -flow;
  limb(c, pts(h.a), style, o, true);
  limb(c, pts(h.b), style, o, true);
  c.restore();
}
