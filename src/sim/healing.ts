import { TICK_RATE, TILE_SIZE } from '../data/config';
import { HEAL_RATE_STEP, HEALING, type HealingTuning, type HealSource } from '../data/player';
import { OVERWORLD, OVERWORLD_ROOM, type SpringDef } from '../data/overworld';
import { FOUNDRY_ROOM } from '../data/rooms';
import { inSafeZone } from './population';
import type { SimState } from './state';
import { tileCentre } from './tiles';
import { playerStats } from './stats';

// Healing only in safe spots (030): fast in a claimed pylon's safe zone and in a Ley
// Spring's pool, a fast fill in the foundry, and field regen anywhere (0 until gear,
// 036, and talents raise it). Rates never stack: the highest that applies heals. Health
// stays whole, up to the stats' max (036); the fraction builds up in the player's state
// a tick at a time, in HEAL_RATE_STEP parts of an HP·tick so gear's 0.3 HP/s adds up exactly.

export interface HealRate {
  source: HealSource;
  /** HP per second. */
  rate: number;
}

/** Ties between equal rates go to the first in this order. */
const ORDER: readonly HealSource[] = ['foundry', 'pylon', 'spring', 'regen'];

/** Healing builds up in these parts of an HP·tick (one per HEAL_RATE_STEP), so rates in whole steps add up exactly. */
const CARRY_PARTS = Math.round(1 / HEAL_RATE_STEP);

/**
 * The field regen stat, HP/s: the one place it's read, through `playerStats` (036: gear's regen affixes; 037's
 * talents add there). `tuning` is the data's unless a test passes its own (its field regen is the base).
 */
export function fieldRegen(state: SimState, tuning: HealingTuning = HEALING): number {
  return playerStats(state, tuning).regen;
}

/** The spring whose pool holds a feet point, or null. Springs are in the overworld only. */
export function springAt(roomId: string, x: number, y: number): SpringDef | null {
  if (roomId !== OVERWORLD_ROOM) return null;
  return (
    OVERWORLD.springs.find((s) => {
      const c = tileCentre(s);
      return Math.hypot(x - c.x, y - c.y) <= s.radius * TILE_SIZE;
    }) ?? null
  );
}

/** Every healing rate that applies where the player stands. */
export function healingRates(state: SimState, tuning: HealingTuning = HEALING): HealRate[] {
  const { player: p, roomId } = state;
  const rates: HealRate[] = [{ source: 'regen', rate: fieldRegen(state, tuning) }];
  if (roomId === FOUNDRY_ROOM) rates.push({ source: 'foundry', rate: tuning.foundry });
  if (inSafeZone(state, roomId, p.x, p.y)) rates.push({ source: 'pylon', rate: tuning.pylon });
  if (springAt(roomId, p.x, p.y)) rates.push({ source: 'spring', rate: tuning.spring });
  return rates;
}

/** The highest rate above 0, or null: rates never add up. */
export function strongest(rates: readonly HealRate[]): HealRate | null {
  let best: HealRate | null = null;
  for (const r of [...rates].sort((a, b) => ORDER.indexOf(a.source) - ORDER.indexOf(b.source))) {
    if (r.rate > 0 && (!best || r.rate > best.rate)) best = r;
  }
  return best;
}

/**
 * One tick of healing, after the KO check. Nothing heals while dying, at max health (the stats', 036), or for
 * `afterHitDelay` ticks from a hit (the hit's own tick first: a delay of N pauses exactly N ticks).
 * `healing` names the source raising health this tick (whole points or the fraction toward the
 * next), and `heals` events mark it starting and stopping. `tuning` is the data's unless a test passes its own.
 */
export function stepHealing(state: SimState, tuning: HealingTuning = HEALING): void {
  const p = state.player;
  const max = playerStats(state).maxHealth;
  const waiting = p.lastHitTick !== null && state.tick - p.lastHitTick < tuning.afterHitDelay;
  const best = p.dying > 0 || p.health >= max || waiting ? null : strongest(healingRates(state, tuning));
  if (best) {
    const whole = TICK_RATE * CARRY_PARTS;
    p.healCarry += Math.round(best.rate * CARRY_PARTS);
    const gained = Math.min(Math.floor(p.healCarry / whole), max - p.health);
    p.health += gained;
    p.healCarry -= gained * whole;
    if (p.health >= max) p.healCarry = 0;
  } else p.healCarry = 0;
  const now = best?.source ?? null;
  if (now === p.healing) return;
  if (p.healing) state.events.heals.push({ source: p.healing, kind: 'stop' });
  if (now) state.events.heals.push({ source: now, kind: 'start' });
  p.healing = now;
}
