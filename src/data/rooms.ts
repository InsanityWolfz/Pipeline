import type { PropPlacement } from './props';

// Rooms as tile grids. One character per tile; see TILE below.

/** Tile symbols used in room rows. */
export const TILE = {
  floor: '.',
  wall: '#',
  ruinBlock: 'B',
  /** A gap in the outer wall that leads to another room. Only the player walks through it. */
  door: 'D',
} as const;

export type TileSymbol = (typeof TILE)[keyof typeof TILE];

export interface Room {
  id: string;
  /** Rows of tile symbols, top to bottom. All rows are the same length. */
  rows: readonly string[];
  /** Spawn tile; the player stands at its centre. */
  spawn: { tx: number; ty: number };
  /** Optional decoration tile for the ley crystal from 001. No gameplay, no collision. */
  crystal?: { tx: number; ty: number };
  /** Enemies placed in the room; each one's tile is its home. */
  enemies?: readonly { enemyId: string; tx: number; ty: number }[];
  /** Gathering nodes; each stands at its tile's centre. */
  nodes?: readonly { nodeId: string; tx: number; ty: number }[];
  /** Door tiles on the outer wall, each linked to a door in another room (by its index there). */
  doorways?: readonly Doorway[];
  /** Where the dormant tube rests until the player takes it (012); solid. */
  tubeStone?: { tx: number; ty: number };
  /** A ley pylon (009): solid, and claiming it claims the room. */
  pylon?: { tx: number; ty: number };
  /** The floor's look, a key into FLOOR_SPRITES in src/data/assets.ts; the ruin flagstone by default. */
  floor?: string;
  /** Dressing (014): looks only, never collision (block props stand on B tiles, which are solid already). */
  props?: readonly PropPlacement[];
}

export interface Doorway {
  tx: number;
  ty: number;
  to: string;
  toDoor: number;
  /** A tutorial gate (012) that seals this door until it opens. */
  gate?: GateId;
}

/** The tutorial's gates (012): the foundry opens when the hall's pack is dead, the shrine when the first line fills the tube. */
export type GateId = 'foundry' | 'shrine';

export const ROOMS: Readonly<Record<string, Room>> = {
  'ruin-hall': {
    id: 'ruin-hall',
    rows: [
      '##########D#############################',
      '####..................###...........####',
      '####...................#............####',
      '##..................................####',
      '#....................................###',
      '#......................................#',
      '#.......BB.............................#',
      '#......................................#',
      '#.............................B........#',
      '#......................................#',
      '#...................B..................#',
      '#......................................#',
      'D......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#................................B.....#',
      '#......................................#',
      '#......................................#',
      '#...........BB.........................#',
      '#......................................#',
      '#..........................B...........#',
      '#......................................#',
      '#.....B................................#',
      '#......................................#',
      '###..................................###',
      '###................................#####',
      '####...............................#####',
      '####################D###################',
    ],
    spawn: { tx: 20, ty: 18 },
    crystal: { tx: 20, ty: 15 },
    enemies: [
      { enemyId: 'husk', tx: 31, ty: 4 },
      { enemyId: 'husk', tx: 33, ty: 5 },
      { enemyId: 'husk', tx: 32, ty: 7 },
    ],
    nodes: [
      { nodeId: 'tree', tx: 8, ty: 22 },
      { nodeId: 'tree', tx: 11, ty: 25 },
      { nodeId: 'tree', tx: 15, ty: 27 },
      { nodeId: 'rubble', tx: 26, ty: 21 },
      { nodeId: 'rubble', tx: 30, ty: 25 },
      { nodeId: 'rubble', tx: 24, ty: 27 },
      { nodeId: 'reeds', tx: 5, ty: 17 },
      { nodeId: 'reeds', tx: 9, ty: 19 },
      { nodeId: 'reeds', tx: 33, ty: 20 },
      { nodeId: 'ley-vein', tx: 17, ty: 14 },
      { nodeId: 'ley-vein', tx: 24, ty: 15 },
    ],
    props: [
      { propId: 'column', tx: 8, ty: 6 },
      { propId: 'column', tx: 30, ty: 8 },
      { propId: 'column', tx: 12, ty: 20 },
      { propId: 'column', tx: 6, ty: 24 },
      { propId: 'runestone', tx: 20, ty: 10 },
      { propId: 'runestone', tx: 33, ty: 17 },
      { propId: 'runestone', tx: 27, ty: 22 },
      { propId: 'banner', tx: 6, ty: 0 },
      { propId: 'banner', tx: 15, ty: 0 },
      { propId: 'banner', tx: 29, ty: 0 },
      { propId: 'vines', tx: 4, ty: 0 },
      { propId: 'vines', tx: 18, ty: 0 },
      { propId: 'vines', tx: 33, ty: 0 },
      { propId: 'vines', tx: 2, ty: 2 },
      { propId: 'vines', tx: 37, ty: 4 },
      { propId: 'ley-crack', tx: 14, ty: 12 },
      { propId: 'ley-crack', tx: 26, ty: 17 },
      { propId: 'rubble', tx: 5, ty: 4 },
      { propId: 'rubble', tx: 35, ty: 11 },
      { propId: 'rubble', tx: 22, ty: 24 },
      { propId: 'rubble', tx: 33, ty: 26 },
      { propId: 'tuft', tx: 4, ty: 20 },
      { propId: 'tuft', tx: 7, ty: 27 },
      { propId: 'tuft', tx: 18, ty: 23 },
      { propId: 'tuft', tx: 36, ty: 23 },
      { propId: 'tuft', tx: 27, ty: 3 },
      { propId: 'mushrooms', tx: 4, ty: 25 },
      { propId: 'mushrooms', tx: 35, ty: 6 },
    ],
    doorways: [
      { tx: 0, ty: 12, to: 'foundry', toDoor: 0, gate: 'foundry' },
      { tx: 10, ty: 0, to: 'shrine', toDoor: 0, gate: 'shrine' },
      { tx: 20, ty: 29, to: 'clearing', toDoor: 0 },
    ],
  },
  // The clearing (012): where the player wakes, with the dormant tube on its stone.
  clearing: {
    id: 'clearing',
    rows: [
      '############D###########',
      '###..................###',
      '###..................###',
      '##..B..............B..##',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#..BB..............BB..#',
      '#......................#',
      '#.....................##',
      '####................####',
      '########################',
    ],
    spawn: { tx: 12, ty: 14 },
    tubeStone: { tx: 12, ty: 11 },
    floor: 'clearing',
    nodes: [
      { nodeId: 'tree', tx: 4, ty: 6 },
      { nodeId: 'tree', tx: 19, ty: 6 },
      { nodeId: 'reeds', tx: 6, ty: 10 },
      { nodeId: 'reeds', tx: 17, ty: 10 },
      { nodeId: 'rubble', tx: 7, ty: 15 },
      { nodeId: 'rubble', tx: 16, ty: 15 },
      { nodeId: 'ley-vein', tx: 12, ty: 4 },
    ],
    props: [
      { propId: 'column', tx: 19, ty: 3 },
      { propId: 'column', tx: 3, ty: 13 },
      { propId: 'runestone', tx: 20, ty: 13 },
      { propId: 'vines', tx: 5, ty: 0 },
      { propId: 'vines', tx: 9, ty: 0 },
      { propId: 'vines', tx: 15, ty: 0 },
      { propId: 'vines', tx: 18, ty: 0 },
      { propId: 'vines', tx: 1, ty: 3 },
      { propId: 'ley-crack', tx: 13, ty: 6 },
      { propId: 'tuft', tx: 2, ty: 8 },
      { propId: 'tuft', tx: 9, ty: 3 },
      { propId: 'tuft', tx: 15, ty: 2 },
      { propId: 'tuft', tx: 21, ty: 9 },
      { propId: 'tuft', tx: 10, ty: 15 },
      { propId: 'tuft', tx: 14, ty: 8 },
      { propId: 'tuft', tx: 8, ty: 12 },
      { propId: 'tuft', tx: 18, ty: 14 },
      { propId: 'tuft', tx: 3, ty: 10 },
      { propId: 'mushrooms', tx: 4, ty: 15 },
      { propId: 'mushrooms', tx: 21, ty: 12 },
      { propId: 'mushrooms', tx: 9, ty: 7 },
      { propId: 'rubble', tx: 16, ty: 4 },
    ],
    doorways: [{ tx: 12, ty: 0, to: 'ruin-hall', toDoor: 2 }],
  },
  // The overgrown shrine (009): Wisps, Husks and the Pylon Warden guard its pylon.
  shrine: {
    id: 'shrine',
    rows: [
      '##############################',
      '###........................###',
      '###........................###',
      '#....BB..............BB......#',
      '#............................#',
      '#............................#',
      '#..B......................B..#',
      '#............................#',
      '#............................#',
      '#............................#',
      '##..........................##',
      '#............................#',
      '#............................#',
      '#..B......................B..#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.....BB..............BB.....#',
      '#............................#',
      '###........................###',
      '###........................###',
      '###############D##############',
    ],
    spawn: { tx: 15, ty: 20 },
    pylon: { tx: 15, ty: 8 },
    floor: 'shrine',
    enemies: [
      { enemyId: 'pylon-warden', tx: 15, ty: 10 },
      { enemyId: 'wisp', tx: 8, ty: 5 },
      { enemyId: 'wisp', tx: 22, ty: 5 },
      { enemyId: 'wisp', tx: 15, ty: 4 },
      { enemyId: 'husk', tx: 7, ty: 12 },
      { enemyId: 'husk', tx: 23, ty: 12 },
    ],
    nodes: [
      { nodeId: 'ley-vein', tx: 4, ty: 9 },
      { nodeId: 'ley-vein', tx: 26, ty: 9 },
      { nodeId: 'tree', tx: 4, ty: 19 },
      { nodeId: 'reeds', tx: 26, ty: 19 },
    ],
    props: [
      { propId: 'runestone', tx: 3, ty: 6 },
      { propId: 'runestone', tx: 26, ty: 6 },
      { propId: 'runestone', tx: 3, ty: 13 },
      { propId: 'runestone', tx: 26, ty: 13 },
      { propId: 'column', tx: 5, ty: 3 },
      { propId: 'column', tx: 22, ty: 3 },
      { propId: 'column', tx: 6, ty: 17 },
      { propId: 'column', tx: 23, ty: 17 },
      { propId: 'banner', tx: 8, ty: 0 },
      { propId: 'banner', tx: 12, ty: 0 },
      { propId: 'banner', tx: 18, ty: 0 },
      { propId: 'banner', tx: 22, ty: 0 },
      { propId: 'vines', tx: 4, ty: 0 },
      { propId: 'vines', tx: 15, ty: 0 },
      { propId: 'vines', tx: 25, ty: 0 },
      { propId: 'vines', tx: 1, ty: 2 },
      { propId: 'vines', tx: 28, ty: 2 },
      { propId: 'ley-crack', tx: 9, ty: 10 },
      { propId: 'ley-crack', tx: 21, ty: 10 },
      { propId: 'ley-crack', tx: 15, ty: 14 },
      { propId: 'tuft', tx: 11, ty: 18 },
      { propId: 'tuft', tx: 19, ty: 18 },
      { propId: 'tuft', tx: 9, ty: 2 },
      { propId: 'tuft', tx: 21, ty: 2 },
      { propId: 'mushrooms', tx: 5, ty: 15 },
      { propId: 'mushrooms', tx: 25, ty: 15 },
      { propId: 'rubble', tx: 17, ty: 4 },
      { propId: 'rubble', tx: 11, ty: 6 },
    ],
    doorways: [{ tx: 15, ty: 21, to: 'ruin-hall', toDoor: 1 }],
  },
  // The sealed ruin the player rebuilds; empty floor to build on.
  foundry: {
    id: 'foundry',
    rows: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................D',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '########################',
    ],
    spawn: { tx: 22, ty: 8 },
    props: [
      { propId: 'brazier', tx: 4, ty: 0 },
      { propId: 'brazier', tx: 12, ty: 0 },
      { propId: 'brazier', tx: 20, ty: 0 },
      { propId: 'banner', tx: 8, ty: 0 },
      { propId: 'banner', tx: 16, ty: 0 },
    ],
    doorways: [{ tx: 23, ty: 8, to: 'ruin-hall', toDoor: 0 }],
  },
};

/** Where the player starts, and where a KO sends them. */
export const DEFAULT_ROOM = 'ruin-hall';

/** Where the tutorial wakes the player (012). */
export const CLEARING_ROOM = 'clearing';

/** The claimable site with its pylon (009). */
export const SHRINE_ROOM = 'shrine';

/** The room that holds the buildable foundry grid. */
export const FOUNDRY_ROOM = 'foundry';
