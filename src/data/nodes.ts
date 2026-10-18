import { NODE_SPRITES } from './assets';

// Gathering nodes. Starting values from spec 005; tune in playtest.

/**
 * Where a node type may stand (018), so every material visibly comes from somewhere:
 * in a grove, in a rock field, at a pond's shallow edge, or on a ley line.
 */
export type Placement = 'grove' | 'rock-field' | 'pond-edge' | 'ley-line';

export interface NodeDef {
  id: string;
  name: string;
  placement: Placement;
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

const node = (id: string, name: string, itemId: string, placement: Placement, feetBox: NodeDef['feetBox']): NodeDef => {
  const sprites = NODE_SPRITES[id];
  if (!sprites) throw new Error(`No sprites for node '${id}'`);
  return {
    id,
    name,
    itemId,
    placement,
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
  tree: node('tree', 'Tree', 'wood', 'grove', { w: 16, h: 10 }),
  rubble: node('rubble', 'Boulder', 'stone', 'rock-field', { w: 22, h: 10 }),
  reeds: node('reeds', 'Reeds', 'fiber', 'pond-edge', { w: 18, h: 8 }),
  'ley-vein': node('ley-vein', 'Ley vein', 'ley-crystal', 'ley-line', { w: 20, h: 10 }),
};

/** A depleted node's remains grow back through this many visible stages before the full node returns (018). */
export const REGROW_STAGES = 3;

/** A node is in reach when the player's feet box is within this distance of its box, px. */
export const HARVEST_REACH = 12;

export function nodeDef(id: string): NodeDef {
  const def = NODES[id];
  if (!def) throw new Error(`Unknown node '${id}'`);
  return def;
}
