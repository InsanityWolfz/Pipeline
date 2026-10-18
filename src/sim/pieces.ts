import { TILE_SIZE } from '../data/config';
import { isSolidPiece, pieceDef } from '../data/pieces';
import type { Rect } from './collision';
import { facingVector } from './direction';
import type { Inventory } from './inventory';
import type { Facing } from './player';

// Foundry pieces as plain data, and where they sit on the grid. How items move
// between them is in flow.ts; placing and picking up is in placement.ts.

export interface Tile {
  tx: number;
  ty: number;
}

interface PieceCommon extends Tile {
  id: number;
  pieceId: string;
  facing: Facing;
}

export interface ConduitState extends PieceCommon {
  kind: 'conduit';
  item: string | null;
  /** Ticks the item has spent crossing. */
  progress: number;
}

export type MachineStatus = 'working' | 'starved' | 'blocked' | 'idle';

export interface MachineState extends PieceCommon {
  kind: 'machine';
  /** Inputs handed in and not yet used. */
  buffer: Inventory;
  /** Finished items waiting to go out the front. */
  output: number;
  crafting: boolean;
  /** Ticks into the craft in progress. */
  progress: number;
  status: MachineStatus;
  /** Inputs a starved machine is short of. */
  missing: string[];
}

export interface HopperState extends PieceCommon {
  kind: 'hopper';
  /** The one item type it holds, or null when empty. */
  item: string | null;
  count: number;
  /** Ticks since its last push. */
  timer: number;
}

export interface CrateState extends PieceCommon {
  kind: 'crate';
  contents: Inventory;
}

export type PieceState = ConduitState | MachineState | HopperState | CrateState;

/** Why a piece can't be placed. */
export type PlaceFail = 'locked' | 'not-foundry' | 'blocked' | 'occupied' | 'player';

export interface FoundryState {
  /** In placement order, which is also the order they act in. */
  pieces: PieceState[];
  nextPieceId: number;
}

export function createFoundry(): FoundryState {
  return { pieces: [], nextPieceId: 0 };
}

export function createPiece(id: number, pieceId: string, tx: number, ty: number, facing: Facing): PieceState {
  const common = { id, pieceId, tx, ty, facing };
  const { kind } = pieceDef(pieceId);
  if (kind === 'conduit') return { ...common, kind, item: null, progress: 0 };
  if (kind === 'hopper') return { ...common, kind, item: null, count: 0, timer: 0 };
  if (kind === 'crate') return { ...common, kind, contents: {} };
  return { ...common, kind, buffer: {}, output: 0, crafting: false, progress: 0, status: 'idle', missing: [] };
}

/** The tiles a piece covers. A 3x1 piece lies across its facing with (tx, ty) in the middle. */
export function footprint(pieceId: string, tx: number, ty: number, facing: Facing): Tile[] {
  if (pieceDef(pieceId).footprint === '1x1') return [{ tx, ty }];
  const across = facing === 'up' || facing === 'down' ? [1, 0] : [0, 1];
  return [-1, 0, 1].map((k) => ({ tx: tx + k * (across[0] ?? 0), ty: ty + k * (across[1] ?? 0) }));
}

/** The tile a piece hands items into: the one ahead of its own tile (the middle, for 3x1). */
export function frontTile(p: PieceState): Tile {
  const [dx, dy] = facingVector(p.facing);
  return { tx: p.tx + dx, ty: p.ty + dy };
}

export const sameTile = (a: Tile, b: Tile): boolean => a.tx === b.tx && a.ty === b.ty;

/** The tiles along a piece's front side: one step ahead of each tile it covers. It never takes items from these. */
export function frontSide(p: PieceState): Tile[] {
  const [dx, dy] = facingVector(p.facing);
  return footprint(p.pieceId, p.tx, p.ty, p.facing).map((t) => ({ tx: t.tx + dx, ty: t.ty + dy }));
}

/**
 * The tiles a straight line from `a` to `b` crosses, stepping one tile at a time
 * along an edge (never cutting a corner), without `a` and ending on `b`.
 */
export function tilesBetween(a: Tile, b: Tile): Tile[] {
  const nx = Math.abs(b.tx - a.tx);
  const ny = Math.abs(b.ty - a.ty);
  const sx = Math.sign(b.tx - a.tx);
  const sy = Math.sign(b.ty - a.ty);
  const tiles: Tile[] = [];
  let { tx, ty } = a;
  for (let ix = 0, iy = 0; ix < nx || iy < ny; ) {
    // Step along whichever axis the line crosses into next.
    if ((0.5 + ix) * ny < (0.5 + iy) * nx) {
      tx += sx;
      ix += 1;
    } else {
      ty += sy;
      iy += 1;
    }
    tiles.push({ tx, ty });
  }
  return tiles;
}

/** The piece covering a tile, if any. */
export function pieceAt(foundry: FoundryState, tx: number, ty: number): PieceState | undefined {
  return foundry.pieces.find((p) => footprint(p.pieceId, p.tx, p.ty, p.facing).some((t) => t.tx === tx && t.ty === ty));
}

/** The box a piece covers, px, centred on its middle tile. */
export function pieceRect(p: Pick<PieceState, 'pieceId' | 'tx' | 'ty' | 'facing'>): Rect {
  const tiles = footprint(p.pieceId, p.tx, p.ty, p.facing);
  const wide = tiles.length > 1 && (p.facing === 'up' || p.facing === 'down');
  const tall = tiles.length > 1 && !wide;
  return {
    x: (p.tx + 0.5) * TILE_SIZE,
    y: (p.ty + 0.5) * TILE_SIZE,
    w: (wide ? 3 : 1) * TILE_SIZE,
    h: (tall ? 3 : 1) * TILE_SIZE,
  };
}

/** The boxes of every piece that blocks the player. */
export function solidRects(foundry: FoundryState): Rect[] {
  return foundry.pieces.filter((p) => isSolidPiece(p.pieceId)).map(pieceRect);
}
