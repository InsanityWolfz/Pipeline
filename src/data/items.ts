import { SPRITES } from './assets';

// Items the player can carry, by kebab-case id.

export interface ItemDef {
  id: string;
  name: string;
  /** Atlas frame for its HUD icon. */
  icon: string;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow', icon: SPRITES.iconArrow },
};
