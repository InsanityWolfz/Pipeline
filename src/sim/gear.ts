import {
  AFFIXES,
  ARMOR_DROP_CHANCE,
  FIRST_ARMOR_ENEMY,
  GEAR_NAMES,
  GEAR_SLOTS,
  HEAVY_CHANCE,
  RARITIES,
  RELIC_AFFIXES,
  RELIC_CHANCE,
  SLOT_BASE,
  SLOT_WEIGHTS,
  UNIDENTIFIED_ARMOR,
  type Affix,
  type AffixKind,
  type GearPiece,
  type GearSlot,
  type GearWeight,
  type Rarity,
} from '../data/gear';
import { RELICS } from '../data/relics';
import { fixtureInReach } from './claims';
import { count } from './inventory';
import { nextFloat, nextInt, type RngState } from './rng';
import { playerStats } from './stats';
import type { SimState } from './state';

// Gear (036, replacing 010's single armor piece). Drops are carried as unidentified
// gear (a plain item, so pickups, the stash and banking treat it like any other). At
// the identification bench each one rolls into a piece: a relic, or a slot, a body
// weight, base armor, a rarity and its affixes, and a name. One piece per slot can be
// worn, changed only at the bench. What worn gear does is in stats.ts and relics.ts.

export type { GearPiece } from '../data/gear';

/** Whether an enemy's death drops an unidentified piece. The first Husk ever killed always does. */
export function rollArmorDrop(state: SimState, enemyId: string): boolean {
  if (enemyId === FIRST_ARMOR_ENEMY && !state.firstHuskDropped) {
    state.firstHuskDropped = true;
    return true;
  }
  const chance = ARMOR_DROP_CHANCE[enemyId] ?? 0;
  return chance > 0 && nextFloat(state.rng) < chance;
}

const pick = <T>(rng: RngState, list: readonly T[]): T => {
  const item = list[nextInt(rng, 0, list.length - 1)];
  if (item === undefined) throw new Error('pick from an empty list');
  return item;
};

/** One key by its relative weight. */
function weighted<K extends string>(rng: RngState, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let roll = nextFloat(rng) * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('no weights');
  return last[0];
}

/** `n` affixes of different kinds, each picked evenly from those left, valued in its range. */
function rollAffixes(rng: RngState, n: number): Affix[] {
  const left = Object.keys(AFFIXES) as AffixKind[];
  const out: Affix[] = [];
  for (let i = 0; i < n && left.length > 0; i++) {
    const kind = left.splice(nextInt(rng, 0, left.length - 1), 1)[0];
    if (!kind) break;
    const d = AFFIXES[kind];
    // A whole number of steps, rounded so tenths and hundredths stay exact.
    out.push({ kind, value: Math.round(nextInt(rng, d.min, d.max) * d.step * 1000) / 1000 });
  }
  return out;
}

const baseRange = (slot: GearSlot, weight: GearWeight | null) => (slot === 'body' ? SLOT_BASE.body[weight ?? 'light'] : SLOT_BASE[slot]);

/** Rolls one identified piece, in the spec's order: relic?, slot, body weight, base armor, rarity, affixes, name. */
export function rollPiece(rng: RngState, id: number): GearPiece {
  if (nextFloat(rng) < RELIC_CHANCE) {
    const relic = pick(rng, RELICS);
    const base = baseRange(relic.slot, relic.weight);
    return {
      id,
      slot: relic.slot,
      rarity: 'relic',
      weight: relic.weight,
      baseArmor: nextInt(rng, base.min, base.max),
      affixes: rollAffixes(rng, RELIC_AFFIXES),
      relic: relic.id,
      name: relic.name,
    };
  }
  const slot = weighted(rng, SLOT_WEIGHTS);
  const weight: GearWeight | null = slot === 'body' ? (nextFloat(rng) < HEAVY_CHANCE ? 'heavy' : 'light') : null;
  const base = baseRange(slot, weight);
  const baseArmor = nextInt(rng, base.min, base.max);
  const rarity = weighted(rng, { common: RARITIES.common.chance, fine: RARITIES.fine.chance, rare: RARITIES.rare.chance } satisfies Partial<Record<Rarity, number>>);
  const affixes = rollAffixes(rng, RARITIES[rarity].affixes);
  const names = slot === 'body' ? GEAR_NAMES.body[weight ?? 'light'] : GEAR_NAMES[slot];
  const name = `${pick(rng, names.adjectives)} ${pick(rng, names.nouns)}`;
  return { id, slot, rarity, weight, baseArmor, affixes, relic: null, name };
}

/** Identifies every carried piece at the bench. Each identify event carries the whole piece. */
export function identifyAll(state: SimState): void {
  const n = count(state.inventory, UNIDENTIFIED_ARMOR);
  if (n === 0 || !fixtureInReach(state, 'bench')) return;
  state.inventory[UNIDENTIFIED_ARMOR] = 0;
  for (let i = 0; i < n; i++) {
    const piece = rollPiece(state.rng, state.nextGearId++);
    state.gear.push(piece);
    state.events.identifies.push(structuredClone(piece));
  }
}

/** An equip request: wear a piece (or take it off, if it's worn), or take a slot off. */
export type EquipRequest = { id: number } | { slot: GearSlot; id: null };

/** No piece in any slot. */
export const NOTHING_WORN: Readonly<Record<GearSlot, number | null>> = { helm: null, body: null, boots: null, trinket: null };

/**
 * Changes what's worn, only at the bench: a piece replaces whatever its slot wore, the worn piece comes off, and
 * `{ slot, id: null }` empties a slot. An unknown id does nothing. Equipping never heals; a lower max clamps health.
 */
export function equip(state: SimState, req: EquipRequest): void {
  if (!fixtureInReach(state, 'bench')) return;
  let slot: GearSlot;
  let next: number | null;
  if (req.id === null) {
    if (!('slot' in req)) return;
    slot = req.slot;
    next = null;
  } else {
    const piece = state.gear.find((g) => g.id === req.id);
    if (!piece) return;
    slot = piece.slot;
    next = state.equipped[slot] === piece.id ? null : piece.id;
  }
  if (state.equipped[slot] === next) return;
  state.equipped = { ...state.equipped, [slot]: next };
  state.events.equips.push({ slot, id: next });
  state.player.health = Math.min(state.player.health, playerStats(state).maxHealth);
}

/** The pieces being worn, in slot order. */
export function wornPieces(state: Pick<SimState, 'gear' | 'equipped'>): GearPiece[] {
  return GEAR_SLOTS.flatMap((slot) => {
    const piece = state.gear.find((g) => g.id === state.equipped[slot]);
    return piece ? [piece] : [];
  });
}
