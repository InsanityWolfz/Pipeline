// Gathering nodes. Starting values from spec 005; tune in playtest.

/**
 * Where a node type may stand (018), so every material visibly comes from somewhere:
 * in a grove, in a rock field, at a pond's shallow edge, on a ley line, in the Frozen Grotto (029), or at the foot of
 * a cliff or quarry face (034: the tile north of it is cliff), or in the Husk Hive (049), or at the Cinder Vents (060).
 */
export type Placement = 'grove' | 'rock-field' | 'pond-edge' | 'ley-line' | 'frozen-grotto' | 'cliff-seam' | 'hive' | 'vent' | 'rod-field';

/**
 * A node that opens and shuts (060: a cinder vent): closed for `closedTicks`, a glowing telegraph for `warnTicks`, then
 * open for `openTicks`, round and round; it can be gathered only while open. Each starts at its own point in the cycle.
 */
export interface NodeCycle {
  readonly closedTicks: number;
  readonly warnTicks: number;
  readonly openTicks: number;
  /** 064: its starting points come from the map's seed mixed with this, a stream of its own kind's (none: the shared cycle stream's). */
  readonly salt?: number;
  /** 064: lightning strikes it as it opens (a storm rod's): an event, hurting nobody. */
  readonly strikes?: true;
}

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
  /** 060: it opens and shuts, and is gathered only while open. */
  cycle?: NodeCycle;
  /**
   * 070: a tree's canopy also puts it in reach: the player's feet point within `w / 2` px either side of the node's
   * centre and up to `up` px above it (standing behind the trunk, under the leaves), px.
   */
  canopy?: { w: number; up: number };
}

/**
 * A storm rod's cycle (064): idle for `idleTicks`, a flashing warning for `warnTicks`, then lightning strikes it and it
 * stays charged for `chargedTicks`; stormglass is gathered only while charged. Each rod starts at its own seeded point.
 */
export const STORM_ROD = { idleTicks: 900, warnTicks: 90, chargedTicks: 240, salt: 0x5707d } as const;

const node = (id: string, name: string, itemId: string, placement: Placement, feetBox: NodeDef['feetBox']): NodeDef => ({
  id,
  name,
  itemId,
  placement,
  uses: 3,
  harvestTicks: 30,
  yield: 1,
  regrowTicks: 1800,
  feetBox,
});

export const NODES: Readonly<Record<string, NodeDef>> = {
  // 070: its canopy (src/data/art/nodes.ts: leaves about 48 px across, from 16 to 58 px over its base) reaches
  // over the tile behind its trunk.
  tree: { ...node('tree', 'Tree', 'wood', 'grove', { w: 16, h: 10 }), canopy: { w: 48, up: 44 } },
  rubble: node('rubble', 'Boulder', 'stone', 'rock-field', { w: 22, h: 10 }),
  reeds: node('reeds', 'Reeds', 'fiber', 'pond-edge', { w: 18, h: 8 }),
  'ley-vein': node('ley-vein', 'Ley vein', 'ley-crystal', 'ley-line', { w: 20, h: 10 }),
  'rime-outcrop': node('rime-outcrop', 'Rime outcrop', 'rimestone', 'frozen-grotto', { w: 18, h: 10 }),
  'ley-iron-seam': node('ley-iron-seam', 'Ley-iron seam', 'ley-iron', 'cliff-seam', { w: 20, h: 10 }),
  // 049.3: a Region 1 stone node's numbers, giving Husk resin.
  'resin-seep': node('resin-seep', 'Resin seep', 'husk-resin', 'hive', { w: 18, h: 8 }),
  // 060: a vent in the Emberworks' ash that flares open now and then, crusted with cinderite.
  'cinder-vent': { ...node('cinder-vent', 'Cinder vent', 'cinderite', 'vent', { w: 20, h: 10 }), cycle: { closedTicks: 720, warnTicks: 90, openTicks: 360 } },
  // 064: a storm rod in the Rod Field, charged for a while after lightning strikes it, stormglass crusting its crown.
  'storm-rod': {
    ...node('storm-rod', 'Storm rod', 'stormglass', 'rod-field', { w: 16, h: 10 }),
    cycle: { closedTicks: STORM_ROD.idleTicks, warnTicks: STORM_ROD.warnTicks, openTicks: STORM_ROD.chargedTicks, salt: STORM_ROD.salt, strikes: true },
  },
};

/** Where a node's cycle seeds come from (060): the map's seed mixed with this, so the main RNG stream is untouched. */
export const NODE_CYCLE_SALT = 0x0c1d3e7;

/** A depleted node's remains grow back through this many visible stages before the full node returns (018). */
export const REGROW_STAGES = 3;

/** A node is in reach when the player's feet box is within this distance of its box, px. */
export const HARVEST_REACH = 12;

export function nodeDef(id: string): NodeDef {
  const def = NODES[id];
  if (!def) throw new Error(`Unknown node '${id}'`);
  return def;
}
