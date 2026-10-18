import { FLOOR_VARIANTS, WALL_MOSS_ONE_IN, WALL_SPRITES } from '../data/roomArt';
import { TILE } from '../data/rooms';

// Which tile art goes where (014). Pure, so tests can pin it down: variants come
// from a fixed hash of the tile, so they never shimmer between draws.

/** A stable 32-bit hash of a tile position. */
export function tileHash(tx: number, ty: number): number {
  let x = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** The floor frame for a tile: the base most of the time, else one of its variants. */
export function floorFrame(base: string, tx: number, ty: number): string {
  const { percent, tiles } = FLOOR_VARIANTS;
  const roll = tileHash(tx, ty) % 100;
  if (roll >= percent) return base;
  return tiles[Math.floor((roll * tiles.length) / percent)] ?? base;
}

/** A wall tile's pieces: its face, or its top plus lips toward the floor around it. */
export interface WallPieces {
  kind: 'face' | 'top';
  frame: string;
  edgeLeft: boolean;
  edgeRight: boolean;
  edgeTop: boolean;
}

/** Off the grid counts as wall, so outer walls read as solid mass. */
const isWall = (rows: readonly string[], tx: number, ty: number): boolean => {
  const row = rows[ty];
  if (row === undefined || tx < 0 || tx >= row.length) return true;
  return row[tx] === TILE.wall;
};

export function wallPieces(rows: readonly string[], tx: number, ty: number): WallPieces {
  if (!isWall(rows, tx, ty + 1)) return { kind: 'face', frame: WALL_SPRITES.face, edgeLeft: false, edgeRight: false, edgeTop: false };
  return {
    kind: 'top',
    frame: tileHash(tx, ty) % WALL_MOSS_ONE_IN === 0 ? WALL_SPRITES.topMoss : WALL_SPRITES.top,
    edgeLeft: !isWall(rows, tx - 1, ty),
    edgeRight: !isWall(rows, tx + 1, ty),
    edgeTop: !isWall(rows, tx, ty - 1),
  };
}
