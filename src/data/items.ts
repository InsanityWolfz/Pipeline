import { SPRITES } from './assets';
import { HOLLOWS_SPRITES } from './hollowsAssets';
import { MINE_SPRITES } from './mineAssets';
import { RESEARCH_ICONS } from './researchAssets';
import { ROUND_ICONS, STAGE_SPRITES } from './stageAssets';
import { ROUNDS, roundBase, roundName } from './tags';

// Items the player can carry, by kebab-case id.

/**
 * Raw materials are gathered or dropped, parts are hand-crafted (and machine parts and boss cores drop), ammo loads
 * into the tube, armor waits to be identified (010), and a schematic reveals a lost part of the foundry (033).
 */
export type ItemKind = 'raw' | 'part' | 'ammo' | 'armor' | 'schematic';

/** What research and restoration (033) may spend: boss cores, machine parts and schematics. Never gold or raws. */
export type ResearchTag = 'core' | 'machinePart' | 'schematic';

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
  /** Set on what restoring the foundry can spend (033); a data test checks every node's cost against it. */
  research?: ResearchTag;
}

const BASE_ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow', kind: 'ammo', group: 'ammo', icon: SPRITES.iconArrow },
  bomb: { id: 'bomb', name: 'Bomb', kind: 'ammo', group: 'ammo', icon: SPRITES.iconBomb },
  'ley-bolt': { id: 'ley-bolt', name: 'Ley bolt', kind: 'ammo', group: 'ammo', icon: SPRITES.iconLeyBolt },
  /** 038: shot onto the ground, it bursts after its arm time. */
  landmine: { id: 'landmine', name: 'Landmine', kind: 'ammo', group: 'ammo', icon: MINE_SPRITES.iconLandmine },
  'husk-resin': { id: 'husk-resin', name: 'Husk resin', kind: 'raw', group: 'raw', icon: SPRITES.itemHuskResin },
  wood: { id: 'wood', name: 'Wood', kind: 'raw', group: 'raw', icon: SPRITES.itemWood },
  stone: { id: 'stone', name: 'Stone', kind: 'raw', group: 'raw', icon: SPRITES.itemStone },
  fiber: { id: 'fiber', name: 'Fiber', kind: 'raw', group: 'raw', icon: SPRITES.itemFiber },
  'ley-crystal': { id: 'ley-crystal', name: 'Ley crystal', kind: 'raw', group: 'raw', icon: SPRITES.itemLeyCrystal },
  /** The first metal (034): gathered at ley-iron seams in Stonefall Hollows' cliff faces, dropped by its enemies and the Bulwark. */
  'ley-iron': { id: 'ley-iron', name: 'Ley-iron', kind: 'raw', group: 'raw', icon: HOLLOWS_SPRITES.itemLeyIron },
  /** The frost rune's material (029), gathered at the Frozen Grotto's rime outcrops. */
  'rimestone': { id: 'rimestone', name: 'Rimestone', kind: 'raw', group: 'raw', icon: STAGE_SPRITES.itemRimestone },
  shaft: { id: 'shaft', name: 'Shaft', kind: 'part', group: 'parts', icon: SPRITES.itemShaft },
  arrowhead: { id: 'arrowhead', name: 'Arrowhead', kind: 'part', group: 'parts', icon: SPRITES.itemArrowhead },
  rope: { id: 'rope', name: 'Rope', kind: 'part', group: 'parts', icon: SPRITES.itemRope },
  casing: { id: 'casing', name: 'Casing', kind: 'part', group: 'parts', icon: SPRITES.itemCasing },
  fuse: { id: 'fuse', name: 'Fuse', kind: 'part', group: 'parts', icon: SPRITES.itemFuse },
  'ley-dust': { id: 'ley-dust', name: 'Ley dust', kind: 'part', group: 'parts', icon: SPRITES.itemLeyDust },
  /** 038: pressed from ley-iron, a landmine's body. */
  'iron-plate': { id: 'iron-plate', name: 'Iron plate', kind: 'part', group: 'parts', icon: MINE_SPRITES.itemIronPlate },
  'unidentified-armor': { id: 'unidentified-armor', name: 'Unidentified gear', kind: 'armor', group: 'gear', icon: SPRITES.itemUnidentifiedArmor },
  /** The Pylon Warden's core (009): it restores one intake entrance (033). Its kind stays a part; the panel lists it under Cores (031). */
  'warden-core': { id: 'warden-core', name: 'Warden core', kind: 'part', group: 'cores', icon: SPRITES.itemWardenCore, research: 'core' },
  /** The Bulwark's core (034 drops it): the third entrance and the second reservoir cost one each (033). */
  'bulwark-core': { id: 'bulwark-core', name: 'Bulwark core', kind: 'part', group: 'cores', icon: RESEARCH_ICONS.bulwarkCore, research: 'core' },
  /** Region 1's machine part (033): Husks, Wisps, champions and the Ruined Cache drop it; restoring spends it. */
  'ancient-gear': { id: 'ancient-gear', name: 'Ancient gear', kind: 'part', group: 'parts', icon: RESEARCH_ICONS.ancientGear, research: 'machinePart' },
  /** Region 2's machine part (034): a brass valve from the Hollows' waterworks. */
  'aqueduct-valve': { id: 'aqueduct-valve', name: 'Aqueduct valve', kind: 'part', group: 'parts', icon: RESEARCH_ICONS.aqueductValve, research: 'machinePart' },
  ...schematics({
    'schematic-reservoir-2': 'Reservoir II',
    'schematic-machine-speed': 'Machine speed',
    'schematic-merger': 'Merger',
  }),
};

/** The schematic items (033), named for the node each reveals; until banked they show as UNKNOWN_SCHEMATIC. Listed under Parts (031). */
function schematics(names: Readonly<Record<string, string>>): Record<string, ItemDef> {
  return Object.fromEntries(
    Object.entries(names).map(([id, node]) => [id, { id, name: `Schematic: ${node}`, kind: 'schematic', group: 'parts', icon: RESEARCH_ICONS.schematic, research: 'schematic' }]),
  );
}

/** How a schematic shows until it's banked (033): one shared name and icon, wherever it shows. */
export const UNKNOWN_SCHEMATIC = { name: 'Unknown schematic', icon: RESEARCH_ICONS.schematicUnknown } as const;

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
