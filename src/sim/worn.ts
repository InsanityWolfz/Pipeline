import { GEAR_SLOTS, type GearPiece } from '../data/gear';
import { relicDef, type RelicDef, type RelicRule } from '../data/relics';
import type { SimState } from './state';

// What's worn (036): the pieces in slot order and the relic with a given rule, the one
// place either is read, for stats (statResolve.ts) and the relics' rules (relics.ts).

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
