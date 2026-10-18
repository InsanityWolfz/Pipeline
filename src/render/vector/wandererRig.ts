import type { LimbStyle, Part, Shape } from '../../data/art/types';
import { TUBE_PARTS, WANDERER, type WandererView } from '../../data/art/wanderer';
import { OUTLINE_WIDTH } from '../../data/art/style';
import { drawShape, drawShapes, type DrawOpts } from './draw';

// Poses and draws the wanderer (016) onto a canvas whose origin is at the feet,
// in world px. Pure canvas: PlayerView feeds it sim state each frame, and the
// contact sheet feeds it fixed poses. Every pose number is render-side feel.

export interface WandererPose {
  view: WandererView;
  /** Mirror for facing left (side view). */
  flip: boolean;
  /** The tube's angle in the view's local frame, radians (0 = right, down is positive). */
  aim: number;
  /** Upper body lean from the hips, radians (negative leans back, away from the aim). */
  lean: number;
  /** Hips drop this far, style-test px. */
  crouch: number;
  /** Feet this far either side of the centre. */
  stance: number;
  /** Whole body shoved back along x by this much. */
  push: number;
  /** The tube slides back along its axis by this much. */
  kick: number;
  /** Walk cycle, radians; 0 when still. */
  stride: number;
  /** Stride size 0..1 (0 standing). */
  stepping: number;
  /** Cloak trail swing, radians. */
  flap: number;
  /** Hose band and tank bubble travel, px. */
  flow: number;
  /** Face glow opacity 0..1. */
  glow: number;
  hasTube: boolean;
  /** Attuned to the foundry: the hose, tank and rings run cyan. */
  attuned: boolean;
  /** While attuning, 0..1: the rings light up one by one. */
  attuning: number | null;
  /** Muzzle glow strength 0..1. */
  muzzle: number;
}

export const REST_POSE: WandererPose = {
  view: 'down',
  flip: false,
  aim: Math.PI / 2,
  lean: 0,
  crouch: 0,
  stance: 5,
  push: 0,
  kick: 0,
  stride: 0,
  stepping: 0,
  flap: 0,
  flow: 0,
  glow: 0.85,
  hasTube: true,
  attuned: true,
  attuning: null,
  muzzle: 0.6,
};

type Pt = readonly [number, number];

const rotate = ([x, y]: Pt, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

function limb(c: CanvasRenderingContext2D, pts: readonly number[], style: LimbStyle, o: DrawOpts, curve = false): void {
  drawShape(c, { kind: 'line', pts, width: style.width, color: style.color, outline: style.outline, curve }, o);
  if (!style.bands) return;
  c.save();
  c.setLineDash([...style.bands.dash]);
  drawShape(c, { kind: 'line', pts, width: style.width, color: style.bands.color, curve }, o);
  c.restore();
}

function drawPart(c: CanvasRenderingContext2D, p: Part | undefined, o: DrawOpts, turn = 0): void {
  if (!p) return;
  if (turn === 0) return drawShapes(c, p.shapes, o);
  c.save();
  c.translate(p.pivot[0], p.pivot[1]);
  c.rotate(turn);
  c.translate(-p.pivot[0], -p.pivot[1]);
  drawShapes(c, p.shapes, o);
  c.restore();
}

/** Draws the wanderer with its feet at the canvas origin; `pxPerUnit` is canvas px per world px. */
export function drawWanderer(c: CanvasRenderingContext2D, pose: WandererPose, pxPerUnit: number): void {
  const S = WANDERER.scale;
  const def = WANDERER.views[pose.view];
  const parts = new Map(def.parts.map((p) => [p.id, p]));
  const o: DrawOpts = { outline: OUTLINE_WIDTH / S, blurScale: pxPerUnit * S };
  const hipY = -WANDERER.hipHeight + pose.crouch;
  // A point on the tube (gun-local) in hip-local px.
  const gun = (p: Pt): [number, number] => {
    const [x, y] = rotate([p[0] - pose.kick, p[1]], pose.aim);
    return [x + def.gunPivot[0], y + def.gunPivot[1]];
  };
  const lit = pose.attuned && pose.attuning === null;

  c.save();
  c.scale(pose.flip ? -S : S, S);
  c.translate(pose.push, 0);
  drawLegs(c, pose, def.feet, hipY, o);
  c.translate(0, hipY);
  c.rotate(pose.lean);
  for (const step of def.order) {
    switch (step) {
      case '@legs':
        break;
      case '@window':
        if (pose.hasTube && def.window) drawPart(c, parts.get(pose.attuned ? def.window.lit : def.window.dormant), o);
        break;
      case '@bubble':
        if (pose.hasTube && def.window && pose.attuned) {
          c.save();
          c.translate(0, -(pose.flow * 0.3) % def.window.rise);
          drawShape(c, def.window.bubble, o);
          c.restore();
        }
        break;
      case '@glow':
        if (def.glow && pose.glow > 0) {
          c.save();
          c.globalAlpha *= pose.glow;
          drawShape(c, def.glow, o);
          c.restore();
        }
        break;
      case '@far-arm': {
        const end = pose.hasTube ? gun(TUBE_PARTS.frontGrip) : ([def.shoulders.far[0] - 1, def.shoulders.far[1] + 13] as const);
        limb(c, [...def.shoulders.far, end[0], end[1]], WANDERER.limbs.sleeveFar, o);
        hand(c, end, o);
        break;
      }
      case '@near-arm':
        nearArm(c, def.shoulders.near, pose.hasTube ? gun(TUBE_PARTS.rearGrip) : [def.shoulders.near[0] + 1, def.shoulders.near[1] + 14], o);
        break;
      case '@hose': {
        if (!pose.hasTube) break;
        const rear = gun(TUBE_PARTS.rear);
        const back = rotate([-10, 0], pose.aim);
        const [fx, fy] = def.hose.from;
        const pts = [fx, fy, fx + def.hose.sag[0], fy + def.hose.sag[1], rear[0] + back[0], rear[1] + back[1] + 6, rear[0], rear[1]];
        const style = pose.attuned ? WANDERER.limbs.hose : WANDERER.limbs.hoseDormant;
        c.save();
        if (pose.attuned) c.lineDashOffset = -pose.flow;
        limb(c, pts, style, o, true);
        c.restore();
        break;
      }
      case '@tube':
        if (pose.hasTube) drawTube(c, def.gunPivot, pose, lit, o);
        break;
      default:
        drawPart(c, parts.get(step), o, step === def.trail ? pose.flap : 0);
    }
  }
  c.restore();
}

function hand(c: CanvasRenderingContext2D, at: Pt, o: DrawOpts): void {
  c.save();
  c.translate(at[0], at[1]);
  drawShape(c, WANDERER.hand, o);
  c.restore();
}

/** The near arm: a wide sleeve to the elbow, then a wrapped forearm and glove at `grip`. */
function nearArm(c: CanvasRenderingContext2D, shoulder: Pt, grip: Pt, o: DrawOpts): void {
  const [sx, sy] = shoulder;
  const ex = (sx + grip[0]) / 2 + 1;
  const ey = (sy + grip[1]) / 2 + 1;
  limb(c, [ex, ey, grip[0], grip[1]], WANDERER.limbs.forearm, o);
  const sleeve: Shape = {
    kind: 'path',
    d: [['M', sx - 2, sy - 3], ['Q', sx + 7, sy - 1, ex + 3, ey + 2], ['L', ex - 3, ey + 3], ['Q', sx - 4, sy + 6, sx - 2, sy - 3], ['Z']],
    fill: WANDERER.limbs.sleeveNear.color,
    outline: true,
  };
  drawShape(c, sleeve, o);
  hand(c, grip, o);
}

function drawLegs(c: CanvasRenderingContext2D, pose: WandererPose, feet: number, hipY: number, o: DrawOpts): void {
  const swing = Math.sin(pose.stride) * pose.stepping;
  const lift = (s: number): number => -Math.max(0, s) * 2.5 * pose.stepping;
  const spread = pose.stance - 5 + feet;
  const [backX, frontX, backLift, frontLift] =
    pose.view === 'side'
      ? [-spread + swing * 4, spread + 1 - swing * 4, lift(-Math.sin(pose.stride)), lift(Math.sin(pose.stride))]
      : [-spread, spread, lift(Math.sin(pose.stride)), lift(-Math.sin(pose.stride))];
  const leg = (x: number, l: number, style: LimbStyle, boot: Shape, kneeX: number): void => {
    limb(c, [kneeX, hipY + 12, x, -3 + l], style, o);
    c.save();
    c.translate(x, l);
    drawShape(c, boot, o);
    c.restore();
  };
  leg(backX, backLift, WANDERER.limbs.legBack, WANDERER.boot.back, -2);
  leg(frontX, frontLift, WANDERER.limbs.legFront, WANDERER.boot.front, 2);
}

function drawTube(c: CanvasRenderingContext2D, pivot: Pt, pose: WandererPose, lit: boolean, o: DrawOpts): void {
  c.save();
  c.translate(pivot[0], pivot[1]);
  c.rotate(pose.aim);
  c.translate(-pose.kick, 0);
  drawShapes(c, TUBE_PARTS.housing, o);
  drawShapes(c, pose.attuned || pose.attuning !== null ? TUBE_PARTS.barrel.lit : TUBE_PARTS.barrel.dormant, o);
  TUBE_PARTS.rings.forEach((x, i) => {
    const n = TUBE_PARTS.rings.length;
    const ring =
      pose.attuning !== null
        ? pose.attuning >= (i + 1) / (n + 1)
          ? TUBE_PARTS.ring.glowing
          : TUBE_PARTS.ring.dormant
        : lit
          ? TUBE_PARTS.ring.lit
          : TUBE_PARTS.ring.dormant;
    c.save();
    c.translate(x, 0);
    drawShape(c, ring, o);
    c.restore();
  });
  drawShape(c, lit ? TUBE_PARTS.muzzle.lit : TUBE_PARTS.muzzle.dormant, o);
  if (lit && pose.muzzle > 0) {
    c.save();
    c.globalAlpha *= pose.muzzle;
    drawShape(c, TUBE_PARTS.muzzleGlow, o);
    c.restore();
  }
  c.restore();
}
