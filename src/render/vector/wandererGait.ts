import { WANDERER, type WandererView } from '../../data/art/wanderer';
import { WANDERER_MOTION } from '../../data/art/wandererMotion';
import type { FootPose } from './wandererPose';

// The run cycle (075): where the feet go, how the body bobs and squashes, and how the tank rides, at a stride phase.
// Pure. Keyed to distance: each foot is planted through its stance and moves back exactly as the body moves on, so
// it never slides; through its swing it kicks back, lifts and swings through with the knee bent.

const M = WANDERER_MOTION.run;
const R = WANDERER.rig;
const TAU = Math.PI * 2;

/** Half a step's length, style px: the ground the body covers in half a cycle (π radians) at `radPerPx`. */
export const HALF_STEP = Math.PI / M.radPerPx / 2 / WANDERER.scale;

export interface Gait {
  feet: { far: FootPose; near: FootPose };
  /** Hips drop (positive down) and the squash, at this phase. */
  bob: number;
  squash: number;
  /** The tank's bob (up negative) and squash. */
  tank: { bob: number; squash: number };
}

const wrap = (p: number): number => ((p % TAU) + TAU) % TAU;

/** Hip to ankle at rest, style px. */
const HIP_TO_ANKLE = WANDERER.hipHeight + R.ankle;

/** The foot of a leg swung by thigh angle `t` (forward positive) with the knee bent `k`, from the hip. */
function fk(t: number, k: number): [number, number] {
  const kx = Math.sin(t) * R.thigh;
  const ky = Math.cos(t) * R.thigh;
  return [kx + Math.sin(t - k) * R.shin, ky + Math.cos(t - k) * R.shin];
}

/**
 * One leg side on at phase `p` (0: contact, foot forward), stride half-length `s`: x along the walk and y (up
 * negative) from the ground. Stance (0..π): planted, sliding back linearly. Swing (π..2π): the thigh swings through
 * while the knee bends to `kneeBend` and back, so the foot kicks back and lifts, then reaches forward.
 */
export function legAt(p: number, s: number, kneeScale = 1): { x: number; y: number; tilt: number } {
  const q = wrap(p);
  if (q < Math.PI) return { x: s * (1 - (2 * q) / Math.PI), y: 0, tilt: 0 };
  const u = (q - Math.PI) / Math.PI;
  const reach = Math.asin(Math.min(1, s / HIP_TO_ANKLE));
  const bend = M.kneeBend * kneeScale * Math.pow(Math.sin(Math.PI * u), 0.7);
  const [x, y] = fk(-reach * Math.cos(Math.PI * u), bend);
  // Blend out the small gaps at toe-off and contact so the foot leaves and lands exactly where the stance has it.
  const [x0, y0] = fk(-reach, 0);
  const [x1, y1] = fk(reach, 0);
  const fx = x + (1 - u) * (-s - x0) + u * (s - x1);
  const fy = y + (1 - u) * (HIP_TO_ANKLE - y0) + u * (HIP_TO_ANKLE - y1);
  const kick = u < 0.5 ? -M.kickBack * kneeScale * Math.sin(TAU * u) * 0.5 : 0;
  return { x: fx + kick, y: Math.min(0, fy - HIP_TO_ANKLE), tilt: -bend * 0.6 };
}

/**
 * The cycle at stride phase `phase`, `amount` of the way in (0 standing, 1 full stride), at `scale` of the stride and
 * `bobScale` of the bob. Side on the feet stride along x; facing down or up they lift in turn where they stand.
 */
export function gaitAt(view: WandererView, phase: number, amount: number, stance: number, scale = 1, bobScale = 1): Gait {
  const s = HALF_STEP * scale;
  const wave = Math.cos(2 * (wrap(phase) - M.lag));
  const bob = M.bob * bobScale * amount * (0.5 + 0.5 * wave);
  const squash = amount * bobScale * (wave > 0 ? M.contactSquash * wave : M.passingStretch * wave);
  // The tank lags the body's bob a quarter of the bob's cycle.
  const tankWave = Math.cos(2 * (wrap(phase) - M.lag) - Math.PI / 2);
  const T = WANDERER_MOTION.tank;
  const tank = { bob: -T.bob * bobScale * amount * (0.5 - 0.5 * tankWave), squash: T.squash * bobScale * amount * Math.max(0, tankWave) };
  const foot = (p: number, rest: number, side: 1 | -1): FootPose => {
    const leg = legAt(p, s, scale);
    if (view === 'side') return { x: rest * (1 - amount) + leg.x * amount, y: leg.y * amount, tilt: leg.tilt * amount };
    // Facing the camera a stepping foot comes toward it (lower on the screen); facing away, away from it.
    const depth = (view === 'down' ? 1 : -1) * (leg.x / Math.max(1, s)) * 1.2;
    return { x: rest + side * Math.abs(leg.y) * 0.25 * amount, y: (leg.y + depth) * amount, tilt: 0 };
  };
  return {
    feet: { near: foot(phase, stance, 1), far: foot(phase + Math.PI, -stance, -1) },
    bob,
    squash,
    tank,
  };
}
