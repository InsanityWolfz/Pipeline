// Rooms as tile grids. One character per tile; see TILE below.

/** Tile symbols used in room rows. */
export const TILE = {
  floor: '.',
  wall: '#',
  ruinBlock: 'B',
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
      '#......................................#',
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
  },
};

export const DEFAULT_ROOM = 'ruin-hall';
