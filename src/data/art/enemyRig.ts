import type { Part } from './types';

// Enemy rigs (016): parts by role, posed per animation frame, baked into frames at
// boot under the old atlas frame names (husk-walk-side/0 and so on).

/** What moves a part: legs stride, arms swing about their pivot, the body bobs and leans. */
export type EnemyRole =
  | 'ground'
  | 'leg-back'
  | 'leg-front'
  | 'body'
  | 'head'
  | 'arm-back'
  | 'arm-front'
  /** Shown at `glow` strength (eyes, charge light). */
  | 'glow'
  /** Grows with `charge` (a Wisp's orb forming). */
  | 'charge';

export interface EnemyPart extends Part {
  readonly role: EnemyRole;
  /** Arm turns are mirrored (the right arm of a front or back view). */
  readonly mirror?: boolean;
}

/** One frame's pose. Every field is optional; missing ones rest at 0 (or 1 for `alpha`, `scaleY`, `glow`). */
export interface EnemyPose {
  /** Body bob, px (negative is up). */
  readonly bob?: number;
  /** Body lean about the hip, radians (positive tips toward the facing). */
  readonly lean?: number;
  /** Arm turns about their pivots, radians. */
  readonly armBack?: number;
  readonly armFront?: number;
  /** Legs stride, px: the front leg forward, the back one back. */
  readonly step?: number;
  /** Feet lift, px, alternating by the sign of `step`. */
  readonly lift?: number;
  /** Whole figure sinks this far and squashes (deaths, slams). */
  readonly sink?: number;
  readonly scaleY?: number;
  /** Whole figure tips over (deaths), radians. */
  readonly tilt?: number;
  readonly alpha?: number;
  readonly glow?: number;
  readonly charge?: number;
}

export type EnemyPoseName = 'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' | 'death';

export interface EnemyRigDef {
  /** The `anims` key in src/data/enemies.ts. */
  readonly id: string;
  /** Style px to world px. */
  readonly scale: number;
  /** Frame box in world px and where the feet sit in it (bottom centre-ish). */
  readonly box: { readonly size: readonly [number, number]; readonly anchor: readonly [number, number] };
  /** The body leans about this point, style px from the feet. */
  readonly hip: readonly [number, number];
  readonly views: Readonly<Record<'side' | 'down' | 'up', readonly EnemyPart[]>>;
  /** Frames for each pose; a pose's anim plays these in order. `recover` only where the enemy has one. */
  readonly poses: Readonly<Partial<Record<EnemyPoseName, readonly EnemyPose[]>>>;
}

/** Four death frames shared by every enemy: sink, squash, tip and fade. */
export const DEATH_POSES: readonly EnemyPose[] = [
  { sink: 1, scaleY: 0.92, tilt: 0.1, alpha: 1, glow: 0.6 },
  { sink: 3, scaleY: 0.78, tilt: 0.28, alpha: 0.85, glow: 0.3 },
  { sink: 5, scaleY: 0.62, tilt: 0.45, alpha: 0.6, glow: 0.1 },
  { sink: 7, scaleY: 0.5, tilt: 0.55, alpha: 0.3, glow: 0 },
];
