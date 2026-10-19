import { SPRITES } from './assets';
import { ROUND_ICONS, STAGE_SPRITES } from './stageAssets';
import { ROUNDS, roundBase, roundName } from './tags';

// Items the player can carry, by kebab-case id.

/** Raw materials are gathered or dropped, parts are hand-crafted, ammo loads into the tube, armor waits to be identified (010). */
export type ItemKind = 'raw' | 'part' | 'ammo' | 'armor';

/** Where the inventory panel lists an item (031): Raw, Parts, Ammo, Gear or Cores, in that order on the panel. */
export type ItemGroup = 'raw' | 'parts' | 'ammo' | 'gear' | 'cores';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Its group on the inventory panel (031). Every item has one; a data test checks. */
  group: ItemGroup;
  /** Atlas frame for its HUD icon, also drawn for it on the ground. */
  icon: string;
}

const BASE_ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow', kind: 'ammo', group: 'ammo', icon: SPRITES.iconArrow },
  bomb: { id: 'bomb', name: 'Bomb', kind: 'ammo', group: 'ammo', icon: SPRITES.iconBomb },
  'ley-bolt': { id: 'ley-bolt', name: 'Ley bolt', kind: 'ammo', group: 'ammo', icon: SPRITES.iconLeyBolt },
  'husk-resin': { id: 'husk-resin', name: 'Husk resin', kind: 'raw', group: 'raw', icon: SPRITES.itemHuskResin },
  wood: { id: 'wood', name: 'Wood', kind: 'raw', group: 'raw', icon: SPRITES.itemWood },
  stone: { id: 'stone', name: 'Stone', kind: 'raw', group: 'raw', icon: SPRITES.itemStone },
  fiber: { id: 'fiber', name: 'Fiber', kind: 'raw', group: 'raw', icon: SPRITES.itemFiber },
  'ley-crystal': { id: 'ley-crystal', name: 'Ley crystal', kind: 'raw', group: 'raw', icon: SPRITES.itemLeyCrystal },
  /** The frost rune's material (029), gathered at the Frozen Grotto's rime clusters. */
  'rime-shard': { id: 'rime-shard', name: 'Rime shard', kind: 'raw', group: 'raw', icon: STAGE_SPRITES.itemRimeShard },
  shaft: { id: 'shaft', name: 'Shaft', kind: 'part', group: 'parts', icon: SPRITES.itemShaft },
  arrowhead: { id: 'arrowhead', name: 'Arrowhead', kind: 'part', group: 'parts', icon: SPRITES.itemArrowhead },
  rope: { id: 'rope', name: 'Rope', kind: 'part', group: 'parts', icon: SPRITES.itemRope },
  casing: { id: 'casing', name: 'Casing', kind: 'part', group: 'parts', icon: SPRITES.itemCasing },
  fuse: { id: 'fuse', name: 'Fuse', kind: 'part', group: 'parts', icon: SPRITES.itemFuse },
  'ley-shard': { id: 'ley-shard', name: 'Ley shard', kind: 'part', group: 'parts', icon: SPRITES.itemLeyShard },
  'unidentified-armor': { id: 'unidentified-armor', name: 'Unidentified armor', kind: 'armor', group: 'gear', icon: SPRITES.itemUnidentifiedArmor },
  /** The Pylon Warden's machine part (009); E at the foundry intake spends one to open its side entrances (024). Its kind stays a part; the panel lists it under Cores (031). */
  'warden-core': { id: 'warden-core', name: 'Warden core', kind: 'part', group: 'cores', icon: SPRITES.itemWardenCore },
};

/** A tagged round's item (029): named from its tags' prefixes, with its own icon. */
function roundItem(round: string): ItemDef {
  const base = BASE_ITEMS[roundBase(round)];
  if (!base) throw new Error(`No base item for '${round}'`);
  return { id: round, name: roundName(base.name, round), kind: 'ammo', group: 'ammo', icon: ROUND_ICONS[round] ?? base.icon };
}

/** Every item: the hand-written ones, then every legal tagged round (029). */
export const ITEMS: Readonly<Record<string, ItemDef>> = {
  ...BASE_ITEMS,
  ...Object.fromEntries(ROUNDS.map((r) => [r, roundItem(r)])),
};

export function itemDef(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item '${id}'`);
  return def;
}
