import { WANDERER_FEEL, type WandererSchemeId, type WandererView } from '../data/art/wanderer';
import { WANDERER_MOTION } from '../data/art/wandererMotion';
import { IDLE_SPEED, TICK_RATE } from '../data/config';
import type { Rarity } from '../data/gear';
import { DYING_TICKS, HIT_INVULN_TICKS, WALK_SPEED } from '../data/player';
import { MELEE } from '../data/combat';
import type { Facing, PlayerState } from '../sim/player';
import type { TubeState } from '../sim/tube';
import { isRolling } from '../sim/movement';
import { nextSpinRate, strideRate, type WandererClocks } from './vector/wandererMotion';

// The wanderer's clocks (075), kept from sim state frame by frame for the pure motion (wandererMotion.ts): when
// moving and firing started and stopped, each recent shot, the stride's phase and the barrel's spin, by sim tick; the
// roll, hit and KO straight from the sim's own counters; real ms for idle life. No rules: it only reads.

const M = WANDERER_MOTION;
const FEEL = WANDERER_FEEL;

/** How far out a punch (023) is, 0..1, from the sim's melee cooldown: full on its tick, easing back over `FEEL.jab.ticks`. */
export function jabOf(tube: Pick<TubeState, 'meleeCooldown'>): number {
  if (tube.meleeCooldown <= 0) return 0;
  const t = (MELEE.cooldownTicks - tube.meleeCooldown) / FEEL.jab.ticks;
  return t >= 1 ? 0 : 1 - t * t;
}

/** What the view shows this frame, beside the sim's state. */
export interface ClockInput {
  p: PlayerState;
  tube: TubeState;
  hasTube: boolean;
  attuned: boolean;
  attuning: number | null;
  trim: Rarity | null;
  scheme: WandererSchemeId;
  tick: number;
  ms: number;
  dtMs: number;
  facing: Facing;
  aim: number;
  /** World px the feet moved since last frame. */
  moved: number;
}

export class PlayerClocks {
  private movingSince: number | null = null;
  private stoppedAt: number | null = null;
  private firingSince: number | null = null;
  private ceasedAt: number | null = null;
  private shotTicks: number[] = [];
  private shotCount = 0;
  private lastTick = -1;
  private stride = 0;
  private spin = 0;
  private spinRate = 0;
  private flow = 0;

  next(i: ClockInput): WandererClocks {
    const { p, tube, tick } = i;
    const rolling = isRolling(p);
    const heavy = i.hasTube && tube.firing;
    const moving = !rolling && Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
    const fresh = tick !== this.lastTick;
    const ticks = this.lastTick < 0 ? 1 : Math.max(0, Math.min(M.maxTicks, tick - this.lastTick));
    this.lastTick = tick;
    if (moving && this.movingSince === null) this.movingSince = tick;
    if (!moving && this.movingSince !== null) {
      this.movingSince = null;
      this.stoppedAt = tick;
    }
    if (heavy && this.firingSince === null) this.firingSince = tick;
    if (!heavy && this.firingSince !== null) {
      this.firingSince = null;
      this.ceasedAt = tick;
    }
    if (fresh && heavy && tube.shotCount > 0) {
      this.shotTicks = [tick, ...this.shotTicks.filter((t) => tick - t < M.pulseFrames)];
      this.shotCount += 1;
    }
    for (let k = 0; k < ticks; k++) {
      this.spinRate = nextSpinRate(this.spinRate, heavy);
      this.spin = (this.spin + this.spinRate * M.spin.rate) % (Math.PI * 2);
    }
    // Side on, walking against the facing strides backward.
    const back = i.facing === 'left' ? p.vx > 0 : i.facing === 'right' ? p.vx < 0 : false;
    if (moving) this.stride += Math.min(i.moved, M.maxStep) * strideRate(heavy) * (back ? -1 : 1);
    this.flow += i.dtMs * (heavy ? FEEL.flow.firing : FEEL.flow.idle);
    const view: WandererView = i.facing === 'up' || i.facing === 'down' ? i.facing : 'side';
    return {
      view,
      flip: i.facing === 'left',
      aim: i.aim,
      scheme: i.scheme,
      trim: i.trim,
      hasTube: i.hasTube,
      attuned: i.attuned,
      attuning: i.attuning,
      ms: i.ms,
      stride: this.stride,
      speed: (Math.hypot(p.vx, p.vy) * TICK_RATE) / WALK_SPEED,
      moving: this.movingSince === null ? null : tick - this.movingSince,
      stopped: this.stoppedAt === null || this.movingSince !== null ? null : tick - this.stoppedAt,
      firing: this.firingSince === null ? null : tick - this.firingSince,
      ceased: this.ceasedAt === null || this.firingSince !== null ? null : tick - this.ceasedAt,
      shots: this.shotTicks.map((t) => tick - t),
      shotCount: this.shotCount,
      spin: this.spin,
      roll: rolling ? p.rollTick : null,
      hit: p.hurtTicks > 0 ? HIT_INVULN_TICKS - p.hurtTicks : null,
      ko: p.dying > 0 ? DYING_TICKS - p.dying : null,
      jab: rolling || p.dying > 0 ? 0 : jabOf(tube),
      flow: this.flow,
    };
  }
}
