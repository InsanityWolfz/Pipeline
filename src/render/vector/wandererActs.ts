import type { WandererView } from '../../data/art/wanderer';
import { WANDERER, WANDERER_FEEL } from '../../data/art/wanderer';
import { WANDERER_MOTION } from '../../data/art/wandererMotion';
import type { WandererPose } from './wandererPose';

// The roll and the KO (075): big moves that take the whole figure, laid over the pose the rest of the motion made.
// Pure, keyed to the sim's own counters (the roll's tick, the KO's frames), so nothing waits on them.

const M = WANDERER_MOTION;
const R = WANDERER.rig;
const TAU = Math.PI * 2;

export type Overlay = Partial<WandererPose>;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/**
 * The roll at its tick `r` (1..18): frames 1–2 tuck, 3–15 turn, 16–18 land and stretch back out. Side on it's a
 * full forward somersault about the tucked body's centre; facing down or up a tucked tumble, wobbling, the cape
 * wrapping round.
 */
export function rollPose(r: number, view: WandererView, base: WandererPose): Overlay {
  const RL = M.roll;
  const tuck = r <= RL.tuckEnd ? r / RL.tuckEnd : r <= RL.turnEnd ? 1 : clamp01((18 - r) / 3);
  const turning = clamp01((r - RL.tuckEnd - 1) / (RL.turnEnd - RL.tuckEnd - 1));
  const landing = r > RL.turnEnd ? r - RL.turnEnd : 0;
  const squash = landing > 0 ? RL.land * (1 - (landing - 1) / 1.5) : r <= RL.tuckEnd ? RL.tuck * tuck : view === 'side' ? RL.tuck : RL.tumble;
  // The feet pull up under the hips as it tucks.
  const pulled = (x: number) => ({ x: x * (1 - tuck) + Math.sign(x || 1) * 2 * tuck, y: -7 * tuck, tilt: 0 });
  const feet = { far: pulled(base.feet.far.x), near: pulled(base.feet.near.x) };
  const common: Overlay = { tuck, crouch: RL.crouch * tuck, squash, feet, kick: 0, flash: null, shimmer: base.shimmer, jab: 0 };
  if (view === 'side') {
    return { ...common, lean: 0.5 * tuck, turn: TAU * turning, turnAt: RL.centre, cape: { trail: 0.4 * tuck, sway: 0, tail: 0.5 * Math.sin(Math.PI * turning) }, hoodTail: 0.6 * tuck };
  }
  const wobble = RL.wobble * Math.sin(TAU * turning) * tuck;
  return {
    ...common,
    lean: 0,
    turn: wobble,
    turnAt: RL.centre,
    cape: { trail: 0.5 * tuck, sway: -wobble * 1.4, tail: wobble * 1.2 },
    hoodTail: wobble,
  };
}

/**
 * The KO at frame `k` of the 60 (DYING_TICKS), always side on: it staggers back (0–10), its knees buckle to a kneel
 * (10–24), it topples back to lie flat (24–36, landing squashed, the tube dropping beside it), then lies still while
 * the face glow gutters out (by 48). PlayerView fades it over the last third, as before.
 */
export function koPose(k: number, base: WandererPose): Overlay {
  const K = M.ko;
  const stagger = smooth(k / K.stagger);
  const kneel = smooth((k - K.stagger) / (K.kneel - K.stagger));
  const fallT = clamp01((k - K.kneel) / (K.flat - K.kneel));
  const fall = fallT * fallT;
  const sinceFlat = k - K.flat;
  const land = sinceFlat >= 0 && sinceFlat < K.settleFrames ? K.land * Math.cos((Math.PI / 2) * (sinceFlat / K.settleFrames) * 1.4) * (1 - sinceFlat / K.settleFrames) : 0;
  const lean = (K.lean * stagger + (K.kneelLean - K.lean) * kneel) * (1 - fall);
  const crouch = K.kneelCrouch * kneel;
  const hipY = WANDERER.hipHeight - crouch;
  // Kneeling: the front foot planted ahead, the back knee down behind; falling, the legs straighten out from the hip.
  const kneelFeet = { far: { x: -7, y: 0, tilt: -0.6 }, near: { x: 6, y: 0, tilt: 0 } };
  const reach = -hipY + (R.thigh + R.shin) * 0.98 - R.ankle;
  const lying = { far: { x: 0.5, y: reach, tilt: 0 }, near: { x: 2, y: reach, tilt: 0 } };
  const mix = (a: { x: number; y: number; tilt: number }, b: { x: number; y: number; tilt: number }, f: number, start: { x: number; y: number; tilt: number }) => {
    const ax = start.x + (a.x - start.x) * kneel;
    const ay = start.y + (a.y - start.y) * kneel;
    return { x: ax + (b.x - ax) * f, y: ay + (b.y - ay) * f, tilt: a.tilt * (1 - f) };
  };
  let glow = base.glow * (1 - 0.35 * clamp01(k / K.flat));
  if (k >= K.flat) glow = k >= K.out ? 0 : WANDERER_FEEL.glow.rest * (1 - (k - K.flat) / (K.out - K.flat)) * (k % 4 < 2 ? 1 : 0.25);
  return {
    view: 'side',
    lean,
    crouch,
    push: 0,
    shove: 0,
    squash: -K.stretch * stagger * (1 - kneel) + land,
    turn: (-Math.PI / 2) * fall,
    turnAt: WANDERER.hipHeight - K.kneelCrouch,
    feet: { far: mix(kneelFeet.far, lying.far, fall, base.feet.far), near: mix(kneelFeet.near, lying.near, fall, base.feet.near) },
    // Turned side on from facing down or up, the tube comes level first.
    aim: (base.view === 'side' ? base.aim : 0) + K.dip * stagger,
    kick: 0,
    cape: { trail: -0.2 * fall + 0.25 * stagger, sway: 0, tail: -0.3 * fall },
    hoodTail: -0.4 * fall,
    tubeDrop: smooth((k - K.kneel - 4) / 8),
    flash: null,
    pulses: [],
    jab: 0,
    glow,
    muzzle: k >= K.flat ? 0 : base.muzzle,
  };
}
