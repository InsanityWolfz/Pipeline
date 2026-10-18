import { FEET_BOX } from '../data/player';
import { BUILD_BAR, isSolidPiece, machineDef, pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { overlapsRect } from './collision';
import { count, type Inventory } from './inventory';
import { opposite } from './direction';
import { fixtureAt, fixtureDef, portFront } from './fixtures';
import { createPiece, footprint, frontTile, pieceAt, pieceRect, sameTile, sideTile, sortSide, type PieceShape, type PieceState, type PlaceFail } from './pieces';
import type { Facing } from './player';
import { roomById, type SimState } from './state';

// Placing pieces on the foundry grid and picking them back up. Both are free.

/**
 * Pieces the player can place, in build bar order: logistics always, machines
 * once their output is hand-crafted, and the tube socket once the tube is attuned.
 */
export function unlockedPieces(state: Pick<SimState, 'crafted' | 'link'>): string[] {
  return BUILD_BAR.filter((id) => {
    const def = pieceDef(id);
    if (def.kind === 'machine') return state.crafted.includes(recipeDef(def.recipeId).output.itemId);
    if (def.kind === 'socket') return state.link.attuned;
    return true;
  });
}

/** Why a piece can't go here, or null if it can. */
export function canPlace(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing): PlaceFail | null {
  if (state.roomId !== FOUNDRY_ROOM) return 'not-foundry';
  if (!unlockedPieces(state).includes(pieceId)) return 'locked';
  const room = roomById(FOUNDRY_ROOM);
  const tiles = footprint(pieceId, tx, ty, facing);
  if (tiles.some((t) => room.rows[t.ty]?.[t.tx] !== TILE.floor)) return 'blocked';
  if (tiles.some((t) => pieceAt(state.foundry, t.tx, t.ty) || fixtureAt(state.fixtures, t.tx, t.ty))) return 'occupied';
  const { limit, cost } = pieceDef(pieceId);
  if (limit !== undefined && state.foundry.pieces.filter((p) => p.pieceId === pieceId).length >= limit) return 'limit';
  if (cost && Object.entries(cost).some(([itemId, n]) => count(state.inventory, itemId) < n)) return 'cost';
  const p = state.player;
  if (isSolidPiece(pieceId) && overlapsRect(p.x, p.y, FEET_BOX, pieceRect({ pieceId, tx, ty, facing }))) {
    return 'player';
  }
  return null;
}

/**
 * The side a conduit placed here takes items from (013). An explicit `inFrom` is
 * kept if it's a side or the back; anything else makes it straight. Without one,
 * it joins as a corner when nothing feeds its back and exactly one neighbour on
 * its left or right faces into the tile (a piece's front, or the supply port's).
 * Neighbours are never changed.
 */
export function conduitInFrom(state: SimState, tx: number, ty: number, facing: Facing, inFrom?: Facing): Facing {
  const back = opposite(facing);
  if (inFrom !== undefined) return inFrom === facing ? back : inFrom;
  const here = { tx, ty };
  const feeds = (side: Facing): boolean => {
    const t = sideTile(here, side);
    const piece = pieceAt(state.foundry, t.tx, t.ty);
    if (piece?.kind === 'sorter') return sameTile(frontTile(piece), here) || sameTile(sideTile(piece, sortSide(piece)), here);
    if (piece) return piece.kind !== 'crate' && piece.kind !== 'socket' && sameTile(frontTile(piece), here);
    const port = fixtureAt(state.fixtures, t.tx, t.ty);
    return port !== undefined && fixtureDef(port.id).kind === 'port' && sameTile(portFront(port), here);
  };
  if (feeds(back)) return back;
  const sides = (['up', 'right', 'down', 'left'] as const).filter((s) => s !== facing && s !== back && feeds(s));
  return sides.length === 1 && sides[0] ? sides[0] : back;
}

/** Places a piece and returns it, or records why it can't go there and returns null. */
export function place(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing, shape: PieceShape = {}): PieceState | null {
  const reason = canPlace(state, pieceId, tx, ty, facing);
  if (reason) {
    state.events.placeFails.push({ pieceId, tx, ty, reason });
    return null;
  }
  for (const [itemId, n] of Object.entries(pieceDef(pieceId).cost ?? {})) state.inventory[itemId] = count(state.inventory, itemId) - n;
  const kind = pieceDef(pieceId).kind;
  const made: PieceShape =
    kind === 'conduit' ? { inFrom: conduitInFrom(state, tx, ty, facing, shape.inFrom) } : kind === 'sorter' ? { mirrored: shape.mirrored ?? false } : {};
  const piece = createPiece(state.foundry.nextPieceId++, pieceId, tx, ty, facing, made);
  state.foundry.pieces.push(piece);
  state.events.places.push({ id: piece.id, pieceId, tx, ty, facing });
  return piece;
}

/** Everything a piece holds, plus what it cost to place, as items. A craft in progress gives back its inputs. */
export function pieceContents(p: PieceState): Inventory {
  const items: Inventory = {};
  const add = (itemId: string, n: number): void => {
    if (n > 0) items[itemId] = count(items, itemId) + n;
  };
  for (const [itemId, n] of Object.entries(pieceDef(p.pieceId).cost ?? {})) add(itemId, n);
  if ((p.kind === 'conduit' || p.kind === 'stager' || p.kind === 'sorter') && p.item) add(p.item, 1);
  if (p.kind === 'hopper' && p.item) add(p.item, p.count);
  if (p.kind === 'crate') for (const [itemId, n] of Object.entries(p.contents)) add(itemId, n);
  if (p.kind === 'machine') {
    const recipe = recipeDef(machineDef(p.pieceId).recipeId);
    for (const [itemId, n] of Object.entries(p.buffer)) add(itemId, n);
    if (p.crafting) for (const [itemId, n] of Object.entries(recipe.inputs)) add(itemId, n);
    add(recipe.output.itemId, p.output);
  }
  return items;
}

/** Removes the piece covering a tile, putting what it held in the inventory. Only in the foundry. */
export function pickUp(state: SimState, tx: number, ty: number): void {
  if (state.roomId === FOUNDRY_ROOM) removePieceAt(state, tx, ty);
}

/** Removes the piece covering a foundry tile wherever the player is, putting what it held in the inventory. */
export function removePieceAt(state: SimState, tx: number, ty: number): void {
  const piece = pieceAt(state.foundry, tx, ty);
  if (!piece) return;
  const items = pieceContents(piece);
  for (const [itemId, n] of Object.entries(items)) state.inventory[itemId] = count(state.inventory, itemId) + n;
  state.foundry.pieces = state.foundry.pieces.filter((p) => p !== piece);
  state.events.pickUps.push({ id: piece.id, pieceId: piece.pieceId, items });
}
