import { NODE_SPRITES } from './assets';

// Gathering nodes. Starting values from spec 005; tune in playtest.

export interface NodeDef {
  id: string;
  name: string;
  /** The item one harvest drops. */
  itemId: string;
  /** Harvests before the node is depleted. */
  uses: number;
  harvestTicks: number;
  /** Items dropped per harvest. */
  yield: number;
  /** Ticks a depleted node takes to come back to full uses. */
  regrowTicks: number;
  /** Solid box at the base, px, centred on the node's position. */
  feetBox: { w: number; h: number };
  /** Atlas frames for full and depleted. */
  sprite: string;
  depletedSprite: string;
}

const node = (id: string, name: string, itemId: string, feetBox: NodeDef['feetBox']): NodeDef => {
  const sprites = NODE_SPRITES[id];
  if (!sprites) throw new Error(`No sprites for node '${id}'`);
  return {
    id,
    name,
    itemId,
    uses: 3,
    harvestTicks: 30,
    yield: 1,
    regrowTicks: 1800,
    feetBox,
    sprite: sprites.full,
    depletedSprite: sprites.depleted,
  };
};

export const NODES: Readonly<Record<string, NodeDef>> = {
  tree: node('tree', 'Tree', 'wood', { w: 16, h: 10 }),
  rubble: node('rubble', 'Rubble', 'stone', { w: 22, h: 10 }),
  reeds: node('reeds', 'Reeds', 'fiber', { w: 18, h: 8 }),
  'ley-vein': node('ley-vein', 'Ley vein', 'ley-crystal', { w: 20, h: 10 }),
};

/** A node is in reach when the player's feet box is within this distance of its box, px. */
export const HARVEST_REACH = 12;

export function nodeDef(id: string): NodeDef {
  const def = NODES[id];
  if (!def) throw new Error(`Unknown node '${id}'`);
  return def;
}
