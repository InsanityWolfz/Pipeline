import type { Rarity } from '../../data/gear';
import { WANDERER, WANDERER_SCHEME, type WandererSchemeId, type WandererView } from '../../data/art/wanderer';

// The wanderer's pose (016, 075): everything the rig needs to draw one frame. wandererMotion.ts makes it from clocks;
// the rig (wandererRig.ts) draws it. Style px and radians.

/** A foot's place in the figure's frame (the ground at y 0, up negative) and its tilt. */
export interface FootPose {
  x: number;
  y: number;
  tilt: number;
}

export interface WandererPose {
  view: WandererView;
  /** Mirror for facing left (side view). */
  flip: boolean;
  /** The tube's angle in the view's local frame, radians (0 = right, down is positive). */
  aim: number;
  /** 075: the colour scheme and the trim (the best rarity worn, from the sim), its pulse strength and the shimmer's run along the hem. */
  scheme: WandererSchemeId;
  trim: Rarity | null;
  trimPulse: number;
  shimmer: number | null;
  /** Upper body lean from the hips, radians (negative leans back, away from the aim). */
  lean: number;
  /** Hips drop this far. */
  crouch: number;
  /** Whole figure shoved along x; the shoulders shoved back this much more. */
  push: number;
  shove: number;
  /** 075: squash (positive) or stretch (negative) about the feet, keeping the area: height × (1 − s), width × (1 + s). */
  squash: number;
  /** 075: the whole figure turned about `turnAt` px above the feet (a somersault, a tumble, the KO's fall), and lowered `drop` px. */
  turn: number;
  turnAt: number;
  drop: number;
  /** 075: where each foot is set down (the rig bends the knees to reach). */
  feet: { far: FootPose; near: FootPose };
  /** The tube slides back along its axis by this much. */
  kick: number;
  /** 075: the cape's trail (blown back) and sway, its tails' extra swing, the hood's tail, the skirt's flaps. */
  cape: { trail: number; sway: number; tail: number };
  hoodTail: number;
  skirt: { front: number; back: number };
  /** 075: the tank's bob in its harness (up negative) and squash. */
  tank: { bob: number; squash: number };
  /** Hose band and tank bubble travel, px. */
  flow: number;
  /** 075: the barrel flutes' turn; the muzzle flash's frame and angle, or none; each hose pulse's place, tank (0) to tube (1); the tank window's flare. */
  spin: number;
  flash: { frame: number; angle: number } | null;
  pulses: number[];
  windowFlare: number;
  /** Face glow opacity 0..1. */
  glow: number;
  hasTube: boolean;
  /** Attuned to the foundry: once attuning finishes, the hose, tank window, barrel and rings run cyan. */
  attuned: boolean;
  /** While attuning, 0..1: the rings light up one by one. */
  attuning: number | null;
  /** Muzzle glow strength 0..1. */
  muzzle: number;
  /** A punch (023), 0..1 (1 fully out): the tube thrusts along its aim, or empty-handed the near fist drives out. */
  jab: number;
  /** 075: tucked for a roll, 0..1: the tube pulled in to the chest. */
  tuck: number;
  /** 075: the KO's tube, 0 held to 1 lying on the ground beside the body. */
  tubeDrop: number;
  /** 050 (F): the hose's sag swings this far sideways, px (the title's wind); 0 when absent. */
  hoseSway?: number;
}

const restFeet = (stance: number): { far: FootPose; near: FootPose } => ({ far: { x: -stance, y: 0, tilt: 0 }, near: { x: stance, y: 0, tilt: 0 } });

/** Standing still, facing the camera, tube lit. */
export const REST_POSE: WandererPose = {
  view: 'down',
  flip: false,
  aim: Math.PI / 2,
  scheme: WANDERER_SCHEME,
  trim: null,
  trimPulse: 1,
  shimmer: null,
  lean: 0,
  crouch: 0,
  push: 0,
  shove: 0,
  squash: 0,
  turn: 0,
  turnAt: 0,
  drop: 0,
  feet: restFeet(WANDERER.rig.restStance),
  kick: 0,
  cape: { trail: 0, sway: 0, tail: 0 },
  hoodTail: 0,
  skirt: { front: 0, back: 0 },
  tank: { bob: 0, squash: 0 },
  flow: 0,
  spin: 0,
  flash: null,
  pulses: [],
  windowFlare: 0,
  glow: 0.85,
  hasTube: true,
  attuned: true,
  attuning: null,
  muzzle: 0.6,
  jab: 0,
  tuck: 0,
  tubeDrop: 0,
};
