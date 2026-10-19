import { MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_MIN, SLOT_BASE, type AffixKind, type GearPiece, type GearSlot } from '../data/gear';
import { relicDef } from '../data/relics';
import { HEALING, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, type HealingTuning } from '../data/player';
import type { SimState } from './state';

// The player's stats (036): every gear effect goes through playerStats, which 037's
// talents add to. Armor, max health, field regen (030's rate), walk speed and the roll.

export interface PlayerStats {
  /** Total armor: every worn piece's base armor and armor affixes. */
  armor: number;
  /** MAX_HEALTH plus every max-health affix. */
  maxHealth: number;
  /** Field regen, HP/s: 030's base plus every regen affix (one of 030's rates, never added to another). */
  regen: number;
  /** The gear's walk speed bonus, a fraction, capped at MOVE_BONUS_CAP. */
  moveBonus: number;
  /** Walk speed multiplier from gear: heavy armor's slow times (1 + moveBonus). Firing's (016) multiplies on top. */
  walkScale: number;
  /** Ticks after a roll before the next, never below ROLL_COOLDOWN_MIN. */
  rollCooldown: number;
  /** A roll's distance, px, over the same ROLL_TICKS. */
  rollDistance: number;
}

type Worn = Pick<SimState, 'gear' | 'equipped'>;

const SLOTS: readonly GearSlot[] = ['helm', 'body', 'boots', 'trinket'];

function worn(state: Worn): GearPiece[] {
  return SLOTS.flatMap((slot) => state.gear.filter((g) => g.id === state.equipped[slot]));
}

const sum = (pieces: readonly GearPiece[], kind: AffixKind): number =>
  pieces.reduce((n, p) => n + p.affixes.reduce((m, a) => m + (a.kind === kind ? a.value : 0), 0), 0);

/** Floats from tenths and hundredths, rounded back so sums read clean (0.3 + 0.5 is 0.8). */
const clean = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Every stat from what's worn. `healing` is 030's tuning unless a test passes its own (its field regen is the base). */
export function playerStats(state: Worn, healing: HealingTuning = HEALING): PlayerStats {
  const pieces = worn(state);
  const body = pieces.find((p) => p.slot === 'body');
  const feather = body?.relic ? relicDef(body.relic) : null;
  const featherplate = feather?.rule === 'feather' ? feather : null;
  const heavyScale = body?.weight ? SLOT_BASE.body[body.weight].walkScale : 1;
  const moveBonus = Math.min(MOVE_BONUS_CAP, clean(sum(pieces, 'move-speed')));
  const rollDistance = ROLL_DISTANCE + sum(pieces, 'roll-distance');
  return {
    armor: pieces.reduce((n, p) => n + p.baseArmor, 0) + sum(pieces, 'armor'),
    maxHealth: MAX_HEALTH + sum(pieces, 'max-health'),
    regen: clean(healing.fieldRegen + sum(pieces, 'regen')),
    moveBonus,
    walkScale: (featherplate ? featherplate.walkScale : heavyScale) * (1 + moveBonus),
    rollCooldown: Math.max(ROLL_COOLDOWN_MIN, ROLL_COOLDOWN_TICKS - sum(pieces, 'roll-cooldown')),
    rollDistance: featherplate ? rollDistance * featherplate.rollScale : rollDistance,
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
