import { OVERWORLD_SPRITES } from '../data/assets';
import { inHollows } from '../data/hollows';
import { HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { LANDMARK_SPRITES } from '../data/landmarkAssets';
import { LANDMARK_LIST } from '../data/landmarks';
import { OVERWORLD } from '../data/overworld';
import { TILE, type Room } from '../data/rooms';
import { WORLD_SHIFT } from '../data/worldShape';

// Which sprite stands on a small terrain piece's tile (059): a rock, a ruin block, an aqueduct pillar or a fallen span.
// Render draws these by it (src/render/overworld/OverworldView.ts, src/render/hollowsTiles.ts) and collision reads
// their footprints by it (src/sim/footprints.ts), so the look and the box always agree. Pure: a tile's hash and where
// it stands, nothing else.

/** A stable hash of a tile's position: which variant of a look a tile gets. */
export function tileHash(tx: number, ty: number): number {
  let x = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * 060: the hash of an overworld tile (or the sandbox's forum) where 053 laid it out, before the grid grew, so every
 * place kept its variants when the centre moved (`WORLD_SHIFT`).
 */
export const worldTileHash = (tx: number, ty: number): number => tileHash(tx - WORLD_SHIFT.dx, ty - WORLD_SHIFT.dy);

/** Stonefall Hollows' own small pieces (034): an aqueduct pillar, a fallen span's heap, loose rubble. */
export function hollowsPiece(symbol: string | undefined, hash: number): string | undefined {
  const S = HOLLOWS_SPRITES;
  if (symbol === TILE.pillar) return S.pillar;
  if (symbol === TILE.fallen) return S.fallen[hash % S.fallen.length];
  if (symbol === TILE.rock) return S.rubble[hash % S.rubble.length];
  return undefined;
}

/**
 * The sprite standing on a small piece's tile, or undefined for any other tile (or a piece drawn by something bigger,
 * as the foundry entrance's mound). In the overworld (a room with terrain) the Hollows' look holds inside the Hollows,
 * then Region 1's: its boulders, and its ruin blocks as a landmark's own (the Quarry's cut blocks, the Hive's nest
 * stones) or the ruin's columns and stones. A tiled room (the sandbox's forum, 044) draws only the Hollows' pieces.
 */
export function pieceFrame(room: Room, tx: number, ty: number): string | undefined {
  const symbol = room.rows[ty]?.[tx];
  if (symbol !== TILE.rock && symbol !== TILE.ruinBlock && symbol !== TILE.pillar && symbol !== TILE.fallen) return undefined;
  const hash = worldTileHash(tx, ty);
  const overworld = room.terrain !== undefined;
  if (!overworld || inHollows(tx, ty)) {
    const hollows = hollowsPiece(symbol, hash);
    if (hollows || !overworld) return hollows;
  }
  if (symbol === TILE.rock) return OVERWORLD_SPRITES.rocks[hash % OVERWORLD_SPRITES.rocks.length];
  if (symbol !== TILE.ruinBlock) return undefined;
  const landmark = LANDMARK_LIST.find((l) => tx >= l.area.x0 && tx <= l.area.x1 && ty >= l.area.y0 && ty <= l.area.y1);
  if (landmark?.look?.blocks === 'cut') return LANDMARK_SPRITES.cutBlocks[hash % LANDMARK_SPRITES.cutBlocks.length];
  if (landmark?.look?.blocks === 'hive') return LANDMARK_SPRITES.hiveStones[hash % LANDMARK_SPRITES.hiveStones.length];
  if (OVERWORLD.entrance.mound.some((t) => t.tx === tx && t.ty === ty)) return undefined;
  return hash % 3 === 0 ? OVERWORLD_SPRITES.column : OVERWORLD_SPRITES.ruinStone;
}
