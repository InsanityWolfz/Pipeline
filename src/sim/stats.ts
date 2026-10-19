import { MIN_DAMAGE_SHARE, ROLL_COOLDOWN_MIN } from '../data/gear';
import { FIRING_WALK_MULTIPLIER, HEALING, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, type HealingTuning } from '../data/player';
import type { SimState } from './state';
import { resolveStat, statOf, YOU } from './statResolve';
import { wornPieces } from './worn';

// The player's stats (036, 037), read through the one stat path (039: resolveStat, scope
// You): armor, max health, field regen (030's rate), walk speed and the roll, and the walk
// while firing (016). The ammo systems read their own numbers from resolveStat by emission.

export { wornPieces, wornRelic } from './worn';

export interface PlayerStats {
  /** Total armor: every worn piece's base armor and armor affixes, and the talents'. */
  armor: number;
  /** MAX_HEALTH plus every max-health affix and talent. */
  maxHealth: number;
  /** Field regen, HP/s: 030's base plus every regen affix and talent (one of 030's rates, never added to another). */
  regen: number;
  /** The walk speed bonus, a fraction: the gear's, capped at MOVE_BONUS_CAP, plus the talents' (037). */
  moveBonus: number;
  /** Walk speed multiplier: heavy armor's slow times (1 + moveBonus). Firing's (016) multiplies on top. */
  walkScale: number;
  /** Ticks after a roll before the next, never below ROLL_COOLDOWN_MIN. */
  rollCooldown: number;
  /** A roll's distance, px, over the same ROLL_TICKS. */
  rollDistance: number;
  /** The walk multiplier while the tube really fires (016's 0.7, eased by Steady Grip). */
  firingWalk: number;
}

/** What stats are made of: the worn gear (036) and the taken talents (037). */
type Worn = Pick<SimState, 'gear' | 'equipped' | 'talents'>;

/** Every stat of the player, through resolveStat. `healing` is 030's tuning unless a test passes its own (its field regen is the base). */
export function playerStats(state: Worn, healing: HealingTuning = HEALING): PlayerStats {
  const move = resolveStat(state, 'move-speed', YOU, 1);
  const baseArmor = wornPieces(state).reduce((n, p) => n + p.baseArmor, 0);
  return {
    armor: statOf(state, 'armor', YOU, baseArmor),
    maxHealth: statOf(state, 'max-health', YOU, MAX_HEALTH),
    regen: statOf(state, 'field-regen', YOU, healing.fieldRegen),
    moveBonus: Math.round(move.adds.reduce((n, c) => n + c.value, 0) * 1e6) / 1e6,
    walkScale: move.final,
    rollCooldown: Math.max(ROLL_COOLDOWN_MIN, statOf(state, 'roll-cooldown', YOU, ROLL_COOLDOWN_TICKS)),
    rollDistance: statOf(state, 'roll-distance', YOU, ROLL_DISTANCE),
    firingWalk: statOf(state, 'firing-walk', YOU, FIRING_WALK_MULTIPLIER),
  };
}

/** A hit after total armor: `damage − armor`, but never below MIN_DAMAGE_SHARE of it, rounded up. */
export function afterArmor(state: Worn, damage: number): number {
  return Math.max(Math.ceil(damage * MIN_DAMAGE_SHARE), damage - playerStats(state).armor);
}

/** Walk speed multiplier from gear. */
export function walkScale(state: Worn): number {
  return playerStats(state).walkScale;
}
