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
  /** 076: a glow part (eyes, runes) that rides the head's turn and lift instead of the body's. */
  readonly follows?: 'head';
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
  /**
   * 076: squash about the feet (as 075's): positive squashes, negative stretches. Height scales by (1 − squash) and
   * width by (1 + squash), so the feet stay planted.
   */
  readonly squash?: number;
  /** 076: the head's own turn about its pivot (the view's first head part's), radians (positive tips toward the facing), and its lift, px (negative is up). Every head part, and glow parts that follow it, turn together. */
  readonly head?: number;
  readonly headLift?: number;
  /** 076: the legs' own turns about their pivots, radians (a leg kicked up in a stagger, legs folding in a death). */
  readonly legBack?: number;
  readonly legFront?: number;
  /** 076: the body (everything but the legs and ground) shifted toward the facing, px: a lunge, a recoil. */
  readonly shift?: number;
  /** 076: the arms drawn apart, px: the back arm moved back (or left) and the front arm forward (or right); negative draws them together. */
  readonly spread?: number;
  /** 076: both arms (and what they hold: a shield, a hammer, a staff) raised, px. */
  readonly raise?: number;
}

/** `turn`, `lob`, `throw` and `block` (034) only where an enemy has them (the Bulwark); `stun`, `dig` and `step` (035) likewise; `roar`, `brace` and `stomp` (041) the Bulwark's; `spray`, `flood` and `vent` (060) the Forgewright's; `blink`, `call` and `chain` (064) the Conductor's. */
export type EnemyPoseName = 'idle' | 'walk' | 'windup' | 'stagger' | 'swipe' | 'recover' | 'hit' | 'death' | 'turn' | 'lob' | 'throw' | 'block' | 'stun' | 'dig' | 'step' | 'roar' | 'brace' | 'stomp' | 'spray' | 'flood' | 'vent' | 'blink' | 'call' | 'chain';

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
  /**
   * Frames for each pose; a pose's anim plays these in order. `recover` only where the enemy has one. 076: a wind-up
   * strip (WINDUP_STRIPS: `windup` and the bosses' other attacks) is gather, coil (1 or 2 frames) and peak, shown by
   * the wind-up's progress; `stagger` is reel and recover (not for bosses); `death` is the one struck frame.
   */
  readonly poses: Readonly<Partial<Record<EnemyPoseName, readonly EnemyPose[]>>>;
  /**
   * 076: the part each wind-up strip throws (claw, fist, hammer, staff, plate, head) and a point on it, style px in
   * the part's own coordinates, per view: its coil and peak carry it well clear of where it rests, so the tell reads.
   */
  readonly tells?: Readonly<Partial<Record<EnemyPoseName, { readonly part: string | Readonly<Record<'side' | 'down' | 'up', string>>; readonly at: Readonly<Record<'side' | 'down' | 'up', readonly [number, number]>> }>>>;
}
