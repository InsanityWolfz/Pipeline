import { GEAR_SLOTS, MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_MIN, SLOT_BASE, type AffixKind, type GearPiece } from '../data/gear';
import { relicDef, type RelicDef, type RelicRule } from '../data/relics';
import { FIRING_WALK_MULTIPLIER, HEALING, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, type HealingTuning } from '../data/player';
import { ammoDef, lobAmmo } from '../data/ammo';
import { COLD, HOMING, STAR } from '../data/tags';
import type { AmmoScope } from '../data/talents';
import type { SimState } from './state';
import { talentTotals, type TalentTotals } from './talentEffects';

// The player's stats (036): every gear and talent (037) effect goes through playerStats.
// Armor, max health, field regen (030's rate), walk speed and the roll; the walk while
// firing (016); and the numbers 029's ammo systems read.

/** A base ammo (its tagged rounds share its numbers). */
export type BaseAmmo = Exclude<AmmoScope, 'all'>;

/** What the ammo systems read (029), after talents (037). */
export interface AmmoStats {
  /** Damage multiplier by base ammo: 1 plus its lane's and the all-ammo bonuses, added. */
  damage: Record<BaseAmmo, number>;
  /** Fire-rate bonus by base ammo, a fraction: its lane's and the all-ammo bonuses (Overpressure's ramp adds on top, keystones.ts). */
  fireRate: Record<BaseAmmo, number>;
  /** Cold hits to freeze, and the freeze's ticks (a boss's own shorter freeze too). */
  freezeHits: number;
  freezeTicks: number;
  bossFreezeTicks: number;
  /** A bomb's blast radius, px (whole). */
  blastRadius: number;
  /** A bomb's flight time multiplier. */
  lobTime: number;
  /** A homing round's turn cap, degrees a tick. */
  homingTurn: number;
  /** Shards a star round bursts into. */
  starShards: number;
}

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
  /** The ammo systems' numbers (029) after talents. */
  ammo: AmmoStats;
}

/** What stats are made of: the worn gear (036) and, where the state has them, the taken talents (037). */
type Worn = Pick<SimState, 'gear' | 'equipped'> & Partial<Pick<SimState, 'talents'>>;

/** The pieces being worn, in slot order: the one place what's worn is read. */
export function wornPieces(state: Worn): GearPiece[] {
  return GEAR_SLOTS.flatMap((slot) => {
    const piece = state.gear.find((g) => g.id === state.equipped[slot]);
    return piece ? [piece] : [];
  });
}

/** The worn relic with this rule, or null. */
export function wornRelic<R extends RelicRule>(state: Worn, rule: R): Extract<RelicDef, { rule: R }> | null {
  for (const piece of wornPieces(state)) {
    if (!piece.relic) continue;
    const def = relicDef(piece.relic);
    if (def.rule === rule) return def as Extract<RelicDef, { rule: R }>;
  }
  return null;
}

const sum = (pieces: readonly GearPiece[], kind: AffixKind): number =>
  pieces.reduce((n, p) => n + p.affixes.reduce((m, a) => m + (a.kind === kind ? a.value : 0), 0), 0);

/** Floats from tenths and hundredths, rounded back so sums read clean (0.3 + 0.5 is 0.8). */
const clean = (v: number): number => Math.round(v * 1e6) / 1e6;

/** The ammo numbers after talents. */
function ammoStats(t: TalentTotals): AmmoStats {
  const per = (bonus: Record<AmmoScope, number>, base: number) => ({
    arrow: clean(base + bonus.arrow + bonus.all),
    bomb: clean(base + bonus.bomb + bonus.all),
    'ley-bolt': clean(base + bonus['ley-bolt'] + bonus.all),
  });
  return {
    damage: per(t.damage, 1),
    fireRate: per(t.fireRate, 0),
    freezeHits: Math.max(1, COLD.stacksToFreeze - t.freezeHits),
    freezeTicks: COLD.freezeTicks + t.freezeTicks,
    bossFreezeTicks: COLD.bossFreezeTicks + t.freezeTicks,
    blastRadius: Math.round(lobAmmo('bomb').burstRadius * (1 + t.blastRadius)),
    lobTime: clean(1 - t.lobTime),
    homingTurn: clean(HOMING.turnDegrees * (1 + t.homingTurn)),
    starShards: STAR.shards + t.starShards,
  };
}

/**
 * Every stat from what's worn and the talents taken. The gear's move bonus is capped (036); talents' move speed adds
 * past it. `healing` is 030's tuning unless a test passes its own (its field regen is the base).
 */
export function playerStats(state: Worn, healing: HealingTuning = HEALING): PlayerStats {
  const pieces = wornPieces(state);
  const t = talentTotals(state.talents ?? []);
  const body = pieces.find((p) => p.slot === 'body');
  const featherplate = wornRelic(state, 'feather');
  const heavyScale = body?.weight ? SLOT_BASE.body[body.weight].walkScale : 1;
  const moveBonus = clean(Math.min(MOVE_BONUS_CAP, sum(pieces, 'move-speed')) + t.moveSpeed);
  const rollDistance = ROLL_DISTANCE + sum(pieces, 'roll-distance');
  return {
    armor: pieces.reduce((n, p) => n + p.baseArmor, 0) + sum(pieces, 'armor') + t.armor,
    maxHealth: MAX_HEALTH + sum(pieces, 'max-health') + t.maxHealth,
    regen: clean(healing.fieldRegen + sum(pieces, 'regen') + t.regen),
    moveBonus,
    walkScale: (featherplate ? featherplate.walkScale : heavyScale) * (1 + moveBonus),
    rollCooldown: Math.max(ROLL_COOLDOWN_MIN, ROLL_COOLDOWN_TICKS - sum(pieces, 'roll-cooldown')),
    rollDistance: featherplate ? rollDistance * featherplate.rollScale : rollDistance,
    firingWalk: clean(FIRING_WALK_MULTIPLIER + t.firingWalk),
    ammo: ammoStats(t),
  };
}

/** A per-base-ammo stat for a round (a tagged round reads its base's). */
export function ofBase<T>(rec: Readonly<Record<BaseAmmo, T>>, ammoId: string): T {
  const base = ammoDef(ammoId).base;
  if (base !== 'arrow' && base !== 'bomb' && base !== 'ley-bolt') throw new Error(`No ammo stats for '${base}'`);
  return rec[base];
}

/** A hit after total armor: `damage − armor`, but never below MIN_DAMAGE_SHARE of it, rounded up. */
export function afterArmor(state: Worn, damage: number): number {
  return Math.max(Math.ceil(damage * MIN_DAMAGE_SHARE), damage - playerStats(state).armor);
}

/** Walk speed multiplier from gear. */
export function walkScale(state: Worn): number {
  return playerStats(state).walkScale;
}
