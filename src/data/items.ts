import { SPRITES } from './assets';

// Items the player can carry, by kebab-case id.

export interface ItemDef {
  id: string;
  name: string;
  /** Atlas frame for its HUD icon, also drawn for it on the ground. */
  icon: string;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow', icon: SPRITES.iconArrow },
  'husk-resin': { id: 'husk-resin', name: 'Husk resin', icon: SPRITES.itemHuskResin },
  wood: { id: 'wood', name: 'Wood', icon: SPRITES.itemWood },
  stone: { id: 'stone', name: 'Stone', icon: SPRITES.itemStone },
  fiber: { id: 'fiber', name: 'Fiber', icon: SPRITES.itemFiber },
};
