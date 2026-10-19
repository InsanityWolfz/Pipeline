import { HOLLOWS } from '../data/hollows';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { itemDef } from '../data/items';
import { altarState, canOffer } from '../sim/altar';
import { count } from '../sim/inventory';
import type { SimState } from '../sim/state';
import type { RestorePanelModel } from './researchRows';

// The altar's offering (034), shown in the 033 restore panel's style: its name, what it
// does, the offering as icons with "have/need", and the Summon row, which works while the
// altar is awake and the offering is carried.

export function offeringModel(sim: SimState, altarId: string): RestorePanelModel {
  const T = HOLLOWS_LOOK.panel;
  const state = altarState(sim, altarId);
  return {
    node: altarId,
    name: T.name,
    effect: T.effect,
    cost: Object.entries(HOLLOWS.arena.offering).map(([itemId, need]) => ({ itemId, icon: itemDef(itemId).icon, have: count(sim.inventory, itemId), need })),
    action: state === 'awake' ? T.action : T.spent,
    enabled: state === 'awake' && canOffer(sim),
  };
}
