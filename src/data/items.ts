import { SPRITES } from './assets';

// Items the player can carry, by kebab-case id.

/** Raw materials are gathered or dropped, parts are hand-crafted, ammo loads into the tube, armor waits to be identified (010). */
export type ItemKind = 'raw' | 'part' | 'ammo' | 'armor';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Atlas frame for its HUD icon, also drawn for it on the ground. */
  icon: string;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow', kind: 'ammo', icon: SPRITES.iconArrow },
  bomb: { id: 'bomb', name: 'Bomb', kind: 'ammo', icon: SPRITES.iconBomb },
  'ley-bolt': { id: 'ley-bolt', name: 'Ley bolt', kind: 'ammo', icon: SPRITES.iconLeyBolt },
  'husk-resin': { id: 'husk-resin', name: 'Husk resin', kind: 'raw', icon: SPRITES.itemHuskResin },
  wood: { id: 'wood', name: 'Wood', kind: 'raw', icon: SPRITES.itemWood },
  stone: { id: 'stone', name: 'Stone', kind: 'raw', icon: SPRITES.itemStone },
  fiber: { id: 'fiber', name: 'Fiber', kind: 'raw', icon: SPRITES.itemFiber },
  'ley-crystal': { id: 'ley-crystal', name: 'Ley crystal', kind: 'raw', icon: SPRITES.itemLeyCrystal },
  shaft: { id: 'shaft', name: 'Shaft', kind: 'part', icon: SPRITES.itemShaft },
  arrowhead: { id: 'arrowhead', name: 'Arrowhead', kind: 'part', icon: SPRITES.itemArrowhead },
  rope: { id: 'rope', name: 'Rope', kind: 'part', icon: SPRITES.itemRope },
  casing: { id: 'casing', name: 'Casing', kind: 'part', icon: SPRITES.itemCasing },
  fuse: { id: 'fuse', name: 'Fuse', kind: 'part', icon: SPRITES.itemFuse },
  'ley-shard': { id: 'ley-shard', name: 'Ley shard', kind: 'part', icon: SPRITES.itemLeyShard },
  'unidentified-armor': { id: 'unidentified-armor', name: 'Unidentified armor', kind: 'armor', icon: SPRITES.itemUnidentifiedArmor },
  /** The Pylon Warden's machine part (009); E at the foundry intake spends one to open its side entrances (024). */
  'warden-core': { id: 'warden-core', name: 'Warden core', kind: 'part', icon: SPRITES.itemWardenCore },
};

export function itemDef(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item '${id}'`);
  return def;
}
