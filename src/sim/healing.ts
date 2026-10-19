import { TICK_RATE, TILE_SIZE } from '../data/config';
import { HEALING, MAX_HEALTH, type HealSource } from '../data/player';
import { OVERWORLD, OVERWORLD_ROOM, type SpringDef } from '../data/overworld';
import { FOUNDRY_ROOM } from '../data/rooms';
import { inSafeZone } from './population';
import type { SimState } from './state';
import { tileCentre } from './tiles';

// Healing only in safe spots (030): fast in a claimed pylon's safe zone and in a Ley
// Spring's pool, a fast fill in the foundry, and field regen anywhere (0 until gear
// and talents raise it). Rates never stack: the highest that applies heals. Health
// stays whole; the fraction builds up in the player's state a tick at a time.

export interface HealRate {
  source: HealSource;
  /** HP per second. */
  rate: number;
}

/** Ties between equal rates go to the first in this order. */
const ORDER: readonly HealSource[] = ['foundry', 'pylon', 'spring', 'regen'];

/** The field regen stat, HP/s: the one place it's read, so gear (036) and talents (037) can add to it (they bring the state in). */
export function fieldRegen(): number {
  return HEALING.fieldRegen;
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
export function healingRates(state: SimState): HealRate[] {
  const { player: p, roomId } = state;
  const rates: HealRate[] = [{ source: 'regen', rate: fieldRegen() }];
  if (roomId === FOUNDRY_ROOM) rates.push({ source: 'foundry', rate: HEALING.foundry });
  if (inSafeZone(state, roomId, p.x, p.y)) rates.push({ source: 'pylon', rate: HEALING.pylon });
  if (springAt(roomId, p.x, p.y)) rates.push({ source: 'spring', rate: HEALING.spring });
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
 * One tick of healing, after the KO check. Nothing heals while dying, at max health or
 * while `healDelay` runs after a hit. `healing` names the source raising health this tick
 * (whole points or the fraction toward the next), and `heals` events mark it starting and stopping.
 */
export function stepHealing(state: SimState): void {
  const p = state.player;
  if (p.healDelay > 0) p.healDelay -= 1;
  const best = p.dying > 0 || p.health >= MAX_HEALTH || p.healDelay > 0 ? null : strongest(healingRates(state));
  if (best) {
    p.healCarry += best.rate;
    const gained = Math.min(Math.floor(p.healCarry / TICK_RATE), MAX_HEALTH - p.health);
    p.health += gained;
    p.healCarry -= gained * TICK_RATE;
    if (p.health >= MAX_HEALTH) p.healCarry = 0;
  } else p.healCarry = 0;
  const now = best?.source ?? null;
  if (now === p.healing) return;
  if (p.healing) state.events.heals.push({ source: p.healing, kind: 'stop' });
  if (now) state.events.heals.push({ source: now, kind: 'start' });
  p.healing = now;
}
