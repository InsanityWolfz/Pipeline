import {
  ARMOR_DROP_CHANCE,
  ARMOR_WEIGHTS,
  FIRST_ARMOR_ENEMY,
  HEAVY_CHANCE,
  MIN_DAMAGE,
  UNIDENTIFIED_ARMOR,
  type ArmorWeight,
} from '../data/armor';
import { fixtureInReach } from './claims';
import { count } from './inventory';
import { nextFloat, nextInt } from './rng';
import type { SimState } from './state';

// Armor (010). Drops are carried as unidentified armor (a plain item, so pickups,
// the stash and banking treat it like any other). At the identification bench
// each one rolls light or heavy, an armor value and a name, and joins the
// player's armor list. One piece can be worn: it takes its armor off every hit,
// and heavy armor slows the walk.

export interface ArmorPiece {
  id: number;
  weight: ArmorWeight;
  armor: number;
  name: string;
}

/** Whether an enemy's death drops an unidentified piece. The first Husk ever killed always does. */
export function rollArmorDrop(state: SimState, enemyId: string): boolean {
  if (enemyId === FIRST_ARMOR_ENEMY && !state.firstHuskDropped) {
    state.firstHuskDropped = true;
    return true;
  }
  const chance = ARMOR_DROP_CHANCE[enemyId] ?? 0;
  return chance > 0 && nextFloat(state.rng) < chance;
}

const pick = (state: SimState, list: readonly string[]): string => list[nextInt(state.rng, 0, list.length - 1)] ?? '';

/** Identifies every carried piece at the bench: each rolls a weight, an armor value and a name. */
export function identifyAll(state: SimState): void {
  const n = count(state.inventory, UNIDENTIFIED_ARMOR);
  if (n === 0 || !fixtureInReach(state, 'bench')) return;
  state.inventory[UNIDENTIFIED_ARMOR] = 0;
  for (let i = 0; i < n; i++) {
    const weight: ArmorWeight = nextFloat(state.rng) < HEAVY_CHANCE ? 'heavy' : 'light';
    const w = ARMOR_WEIGHTS[weight];
    const piece: ArmorPiece = {
      id: state.nextArmorId++,
      weight,
      armor: nextInt(state.rng, w.min, w.max),
      name: `${pick(state, w.adjectives)} ${pick(state, w.nouns)}`,
    };
    state.armor.push(piece);
    state.events.identifies.push({ ...piece });
  }
}

/** Wears a piece (or takes armor off, for null) at the bench. Equipping the worn piece takes it off; an unknown id does nothing. */
export function equip(state: SimState, id: number | null): void {
  if (!fixtureInReach(state, 'bench')) return;
  if (id !== null && !state.armor.some((a) => a.id === id)) return;
  const next = id === state.equipped ? null : id;
  if (next === state.equipped) return;
  state.equipped = next;
  state.events.equips.push({ id: next });
}

/** The piece being worn, if any. */
export function worn(state: Pick<SimState, 'armor' | 'equipped'>): ArmorPiece | undefined {
  return state.armor.find((a) => a.id === state.equipped);
}

/** A hit after the worn piece's armor, never below MIN_DAMAGE. */
export function afterArmor(state: Pick<SimState, 'armor' | 'equipped'>, damage: number): number {
  return Math.max(MIN_DAMAGE, damage - (worn(state)?.armor ?? 0));
}

/** Walk speed multiplier from the worn piece's weight. */
export function walkScale(state: Pick<SimState, 'armor' | 'equipped'>): number {
  const piece = worn(state);
  return piece ? ARMOR_WEIGHTS[piece.weight].walkScale : 1;
}
