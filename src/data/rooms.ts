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
}

export interface Doorway {
  tx: number;
  ty: number;
  to: string;
  toDoor: number;
}

export const ROOMS: Readonly<Record<string, Room>> = {
  'ruin-hall': {
    id: 'ruin-hall',
    rows: [
      '########################################',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
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
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '########################################',
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
    doorways: [{ tx: 0, ty: 12, to: 'foundry', toDoor: 0 }],
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
    doorways: [{ tx: 23, ty: 8, to: 'ruin-hall', toDoor: 0 }],
  },
};

/** Where the player starts, and where a KO sends them. */
export const DEFAULT_ROOM = 'ruin-hall';

/** The room that holds the buildable foundry grid. */
export const FOUNDRY_ROOM = 'foundry';
