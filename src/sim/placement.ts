import { FEET_BOX } from '../data/player';
import { BUILD_BAR, isSolidPiece, machineDef, pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { overlapsRect } from './collision';
import { count, type Inventory } from './inventory';
import { createPiece, footprint, pieceAt, pieceRect, type PieceState } from './pieces';
import type { Facing } from './player';
import { roomById, type SimState } from './state';

// Placing pieces on the foundry grid and picking them back up. Both are free.

export type PlaceFail = 'locked' | 'not-foundry' | 'blocked' | 'occupied' | 'player';

/** Pieces the player can place, in build bar order: logistics always, machines once their output is hand-crafted. */
export function unlockedPieces(state: Pick<SimState, 'crafted'>): string[] {
  return BUILD_BAR.filter((id) => {
    const def = pieceDef(id);
    return def.kind !== 'machine' || state.crafted.includes(recipeDef(def.recipeId).output.itemId);
  });
}

/** Why a piece can't go here, or null if it can. */
export function canPlace(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing): PlaceFail | null {
  if (state.roomId !== FOUNDRY_ROOM) return 'not-foundry';
  if (!unlockedPieces(state).includes(pieceId)) return 'locked';
  const room = roomById(FOUNDRY_ROOM);
  const tiles = footprint(pieceId, tx, ty, facing);
  if (tiles.some((t) => room.rows[t.ty]?.[t.tx] !== TILE.floor)) return 'blocked';
  if (tiles.some((t) => pieceAt(state.foundry, t.tx, t.ty))) return 'occupied';
  const p = state.player;
  if (isSolidPiece(pieceId) && overlapsRect(p.x, p.y, FEET_BOX, pieceRect({ pieceId, tx, ty, facing }))) {
    return 'player';
  }
  return null;
}

/** Places a piece and returns it, or records why it can't go there and returns null. */
export function place(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing): PieceState | null {
  const reason = canPlace(state, pieceId, tx, ty, facing);
  if (reason) {
    state.events.placeFails.push({ pieceId, tx, ty, reason });
    return null;
  }
  const piece = createPiece(state.foundry.nextPieceId++, pieceId, tx, ty, facing);
  state.foundry.pieces.push(piece);
  state.events.places.push({ id: piece.id, pieceId, tx, ty, facing });
  return piece;
}

/** Everything a piece holds, as items. A craft in progress gives back its inputs. */
export function heldItems(p: PieceState): Inventory {
  const items: Inventory = {};
  const add = (itemId: string, n: number): void => {
    if (n > 0) items[itemId] = count(items, itemId) + n;
  };
  if (p.kind === 'conduit' && p.item) add(p.item, 1);
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
  if (state.roomId !== FOUNDRY_ROOM) return;
  const piece = pieceAt(state.foundry, tx, ty);
  if (!piece) return;
  const items = heldItems(piece);
  for (const [itemId, n] of Object.entries(items)) state.inventory[itemId] = count(state.inventory, itemId) + n;
  state.foundry.pieces = state.foundry.pieces.filter((p) => p !== piece);
  state.events.pickUps.push({ id: piece.id, pieceId: piece.pieceId, items });
}
