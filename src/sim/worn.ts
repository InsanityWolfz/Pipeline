import { GEAR_SLOTS, RARITY_ORDER, type GearPiece, type Rarity } from '../data/gear';
import { relicDef, type RelicDef, type RelicRule } from '../data/relics';
import type { SimState } from './state';

// What's worn (036): the pieces in slot order and the relic with a given rule, the one
// place either is read, for stats (statResolve.ts) and the relics' rules (relics.ts).
//
// A piece is never changed in place once it exists: statResolve.ts keeps the lines in play
// while the same pieces (by reference) and talents stay, so a change to a piece's affixes,
// relic or name must make a new piece object, or those lines go stale.
//
// 075: the best rarity worn, for the cloak's trim; render reads it from getState() and never ranks rarities itself.

/** What's worn: the gear and the slots. */
type Gear = Pick<SimState, 'gear' | 'equipped'>;

/** The pieces being worn, in slot order. */
export function wornPieces(state: Gear): GearPiece[] {
  return GEAR_SLOTS.flatMap((slot) => {
    const piece = state.gear.find((g) => g.id === state.equipped[slot]);
    return piece ? [piece] : [];
  });
}

/** The worn relic with this rule, or null. */
export function wornRelic<R extends RelicRule>(state: Gear, rule: R): Extract<RelicDef, { rule: R }> | null {
  for (const piece of wornPieces(state)) {
    if (!piece.relic) continue;
    const def = relicDef(piece.relic);
    if (def.rule === rule) return def as Extract<RelicDef, { rule: R }>;
  }
  return null;
}

/** 075: the highest rarity among the worn pieces by RARITY_ORDER, or null with nothing worn. */
export function wornRarity(state: Gear): Rarity | null {
  let best: Rarity | null = null;
  for (const piece of wornPieces(state)) if (best === null || RARITY_ORDER.indexOf(piece.rarity) > RARITY_ORDER.indexOf(best)) best = piece.rarity;
  return best;
}
