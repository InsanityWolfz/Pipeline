import type { Rarity } from '../../data/gear';
import { TUBE_PARTS, WANDERER, WANDERER_FEEL, WANDERER_TRIM, WANDERER_TRIM_FX, type WandererSchemeId, type WandererView } from '../../data/art/wanderer';
import { PLAYER_HIT_FX } from '../../data/assets';
import { WANDERER_MOTION } from '../../data/art/wandererMotion';
import { gaitAt } from './wandererGait';
import { koPose, rollPose, type Overlay } from './wandererActs';
import type { WandererPose } from './wandererPose';

// The wanderer's motion (075): a pure function from clocks to a pose. PlayerView keeps the clocks (from sim state:
// frames since firing started or stopped, since each shot, the roll, hit and KO ticks, the stride phase; and real ms
// for idle life); the contact sheet and the tests sample the same function at fixed times. Anticipation is visual
// only: every clock starts on the tick the sim acts, so nothing here waits.

const M = WANDERER_MOTION;
const R = WANDERER.rig;
const TAU = Math.PI * 2;
/** The hit's pose lasts the sim's own hit pose ticks. */
const HIT_FRAMES = PLAYER_HIT_FX.poseTicks;

export interface WandererClocks {
  view: WandererView;
  flip: boolean;
  aim: number;
  scheme: WandererSchemeId;
  /** The best rarity worn, as the sim reports it (render never ranks rarities). */
  trim: Rarity | null;
  hasTube: boolean;
  attuned: boolean;
  attuning: number | null;
  /** Real ms, for idle life, the glow's pulse and the trim's pulse and shimmer. */
  ms: number;
  /** The stride's phase, radians (PlayerView adds `strideRate` per px moved). */
  stride: number;
  /** Speed as a share of the move speed, 0..1. */
  speed: number;
  /** Frames since a move started (null: standing), and since it stopped (null: moving, or never moved). */
  moving: number | null;
  stopped: number | null;
  /** Frames since firing started (null: not firing), and since it stopped (null: firing, or never fired). */
  firing: number | null;
  ceased: number | null;
  /** Frames since each recent shot, newest first, and how many shots so far (the flash alternates by it). */
  shots: readonly number[];
  shotCount: number;
  /** The barrel flutes' turn (PlayerView adds the spin rate each frame). */
  spin: number;
  /** The sim's roll tick (1..18), frames into a hit, frames into the KO; null when not. */
  roll: number | null;
  hit: number | null;
  ko: number | null;
  /** The punch (023), 0..1. */
  jab: number;
  /** Hose band and bubble travel, px. */
  flow: number;
}

/** Still, unarmed clocks: a standing wanderer. */
export const STILL: WandererClocks = {
  view: 'down',
  flip: false,
  aim: Math.PI / 2,
  scheme: 'cobalt',
  trim: null,
  hasTube: true,
  attuned: true,
  attuning: null,
  ms: 0,
  stride: 0,
  speed: 0,
  moving: null,
  stopped: null,
  firing: null,
  ceased: null,
  shots: [],
  shotCount: 0,
  spin: 0,
  roll: null,
  hit: null,
  ko: null,
  jab: 0,
  flow: 0,
};

/** Back-out ease: 0 → 1 with an overshoot of about 10% (`s` 1.7). */
export const overshoot = (x: number, s: number = M.brace.overshoot): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const t = x - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
};

/** Stride radians per world px: the strafe steps twice as often at half the stride, so its feet stay planted too. */
export const strideRate = (firing: boolean): number => M.run.radPerPx / (firing ? M.strafe.stride : 1);

/** The barrel's spin rate (0..1 of full) a frame on: up over `upFrames` while firing, down over `downFrames` after. */
export const nextSpinRate = (rate: number, firing: boolean): number =>
  firing ? Math.min(1, rate + 1 / M.spin.upFrames) : Math.max(0, rate - 1 / M.spin.downFrames);

/** How far into a stride (0 standing, 1 full): in over `startFrames`, out over the stop's frames. */
function stepping(c: WandererClocks): number {
  if (c.moving !== null) return Math.min(1, (c.moving + 1) / M.run.startFrames);
  if (c.stopped !== null) return Math.max(0, 1 - (c.stopped + 1) / M.stop.frames);
  return 0;
}

/** How braced for firing (0..1): the brace's settle with its overshoot, or its release. */
function braced(c: WandererClocks): number {
  if (c.firing !== null) return overshoot(c.firing / M.brace.settleFrames);
  if (c.ceased !== null) return Math.max(0, 1 - c.ceased / M.brace.releaseFrames);
  return 0;
}

/** The brace's opening dip, px (frames 0..2 of firing). */
export const braceDip = (firing: number | null): number => (firing !== null && firing < M.brace.dipFrames ? M.brace.dip * Math.sin((Math.PI * (firing + 1)) / (M.brace.dipFrames + 1)) : 0);

/** A shot's recoil `t` frames on: the kick's share (1 on the shot, 0 by `frames`), and the squash, recovering through a stretch. */
export function recoil(t: number | undefined): { kick: number; squash: number } {
  const F = M.recoil.frames;
  if (t === undefined || t >= F) return { kick: 0, squash: 0 };
  const half = F / 2;
  const squash = t < half ? M.recoil.squash * (1 - t / half) : -M.recoil.stretch * Math.sin((Math.PI * (t - half)) / half);
  return { kick: (1 - t / F) ** 2, squash };
}

/** The hit's strength `h` frames in: 1 on its first frame, overshooting the other way and back to 0 by its last. */
export const hitWave = (h: number): number => (h >= HIT_FRAMES ? 0 : Math.cos((Math.PI * h) / (HIT_FRAMES * M.hit.swing)) * (1 - h / HIT_FRAMES));

/** What the wanderer is doing, for `ui().player`. */
export function wandererAnim(c: WandererClocks): 'ko' | 'roll' | 'hit' | 'jab' | 'fire' | 'strafe' | 'run' | 'idle' {
  if (c.ko !== null) return 'ko';
  if (c.roll !== null) return 'roll';
  if (c.hit !== null && c.hit < HIT_FRAMES) return 'hit';
  if (c.jab > 0) return 'jab';
  if (c.firing !== null) return c.moving !== null ? 'strafe' : 'fire';
  return c.moving !== null ? 'run' : 'idle';
}

export function wandererMotion(c: WandererClocks): WandererPose {
  const fire = braced(c);
  const step = stepping(c);
  const strafing = c.firing !== null;
  const gait = gaitAt(c.view, c.stride, step, R.restStance + (M.brace.stance - R.restStance) * fire, strafing ? M.strafe.stride : 1, strafing ? M.strafe.bob : 1);
  const still = (1 - step) * (1 - fire);
  // Idle life: a slow breath, and the cape and hood tail swaying, the tails a quarter cycle behind.
  const breath = 0.5 - 0.5 * Math.cos((TAU * c.ms) / M.idle.breathMs);
  const sway = M.idle.sway * Math.sin((TAU * c.ms) / M.idle.swayMs);
  const swayTail = M.idle.sway * Math.sin((TAU * c.ms) / M.idle.swayMs - Math.PI / 2);
  const shot = recoil(c.shots[0]);
  const settle = c.stopped !== null && c.stopped < M.stop.frames ? M.stop.squash * Math.sin((Math.PI * (c.stopped + 1)) / M.stop.frames) : 0;
  const speed = Math.min(1, c.speed) * step;
  const flapAmp = strafing ? M.strafe.flap : M.cape.flap * speed + M.idle.sway * still;
  const wind = strafing ? c.ms * M.cape.wind : 0;
  const flap = flapAmp * Math.sin(2 * c.stride + wind);
  const flapTail = flapAmp * Math.sin(2 * c.stride - Math.PI / 2 + wind);
  const trail = M.cape.run * speed * (strafing ? M.cape.strafeTrail : 1);
  const lean = c.view === 'side' && !strafing ? M.run.lean * speed : 0;
  const glowRest = WANDERER_FEEL.glow.rest + WANDERER_FEEL.glow.pulse * Math.sin(c.ms * WANDERER_FEEL.glow.speed);
  const trimDef = WANDERER_TRIM[c.trim ?? 'none'];
  const P = WANDERER_TRIM_FX.pulse;
  let pose: WandererPose = {
    view: c.view,
    flip: c.flip,
    aim: c.aim,
    scheme: c.scheme,
    trim: c.trim,
    trimPulse: trimDef.pulse ? P.min + (P.max - P.min) * (0.5 + 0.5 * Math.cos((TAU * c.ms) / P.periodMs)) : 1,
    shimmer: trimDef.shimmer ? (c.ms % WANDERER_TRIM_FX.shimmer.periodMs) / WANDERER_TRIM_FX.shimmer.periodMs : null,
    lean: lean + M.brace.lean * fire + M.recoil.lean * shot.kick + c.jab * WANDERER_FEEL.jab.lean,
    crouch: gait.bob + M.brace.crouch * fire + braceDip(c.firing) - M.idle.rise * breath * still,
    push: M.brace.push * fire + c.jab * WANDERER_FEEL.jab.push,
    shove: M.recoil.shove * shot.kick,
    squash: gait.squash + shot.squash + settle + M.idle.squash * (1 - 2 * breath) * still - M.jabStretch * c.jab,
    turn: 0,
    turnAt: 0,
    drop: 0,
    feet: gait.feet,
    kick: M.recoil.kick * shot.kick,
    cape: { trail, sway: sway * still + flap, tail: swayTail * still + flapTail + trail * M.cape.tailTrail },
    hoodTail: (swayTail * still + flapTail) * M.cape.hood + trail * M.cape.hoodTrail,
    // Side on, each skirt flap swings with its thigh.
    skirt: c.view === 'side' ? { front: M.skirt.share * Math.atan2(gait.feet.near.x, M.skirt.reach), back: M.skirt.share * Math.atan2(gait.feet.far.x, M.skirt.reach) } : { front: 0, back: 0 },
    tank: gait.tank,
    flow: c.flow,
    spin: c.spin,
    flash: c.shots[0] !== undefined && c.shots[0] < M.flashFrames ? { frame: c.shots[0], angle: (c.shotCount % 2) * TUBE_PARTS.flash.alternate + (c.shots[0] === 1 ? TUBE_PARTS.flash.turn : 0) } : null,
    pulses: c.shots.filter((t) => t < M.pulseFrames).map((t) => t / M.pulseFrames),
    windowFlare: Math.max(0, ...c.shots.map((t) => 1 - t / M.windowFlareFrames)),
    glow: c.shots[0] !== undefined && c.shots[0] < M.glowFlareFrames ? WANDERER_FEEL.glow.shot : glowRest,
    hasTube: c.hasTube,
    attuned: c.attuned,
    attuning: c.attuning,
    muzzle: c.shots[0] !== undefined && c.shots[0] < M.glowFlareFrames ? WANDERER_FEEL.muzzle.shot : WANDERER_FEEL.muzzle.rest,
    jab: c.jab,
    tuck: 0,
    tubeDrop: 0,
  };
  if (c.hit !== null && c.hit < HIT_FRAMES) pose = applyHit(pose, c.hit);
  const overlay: Overlay | null = c.ko !== null ? koPose(c.ko, pose) : c.roll !== null ? rollPose(c.roll, c.view, pose) : null;
  const out = overlay ? { ...pose, ...overlay } : pose;
  // The squash scales about the feet: set the feet down where they'd land unsquashed, so they stay planted.
  if (out.turn !== 0 || out.squash === 0) return out;
  const plant = (f: WandererPose['feet']['far']) => ({ ...f, x: f.x / (1 + out.squash) });
  return { ...out, feet: { far: plant(out.feet.far), near: plant(out.feet.near) } };
}

/** The hit (the first PLAYER_HIT_FX.poseTicks ticks of hit invulnerability): snapped back and squashed on its first frame, the cape and hood tail flicked forward. */
function applyHit(p: WandererPose, h: number): WandererPose {
  const w = hitWave(h);
  const H = M.hit;
  // Away from the aim: back, side on; facing the camera or away, to the side.
  const away = p.view === 'side' ? -1 : 1;
  return {
    ...p,
    lean: p.lean + away * H.lean * w,
    squash: p.squash + H.squash * Math.max(0, w),
    push: p.push + H.push * w,
    cape: { ...p.cape, trail: p.cape.trail - H.flick * w, tail: p.cape.tail - H.flick * w },
    hoodTail: p.hoodTail - H.flick * H.hoodFlick * w,
    glow: h < H.glowFrames ? H.glow : p.glow,
  };
}
