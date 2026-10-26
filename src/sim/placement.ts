import { FEET_BOX } from '../data/player';
import { BUILD_BAR, isSolidPiece, pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { overlapsRect } from './collision';
import { count, type Inventory } from './inventory';
import { opposite } from './direction';
import { fixtureAt, fixtureDef, portFront } from './fixtures';
import { createPiece, footprint, frontTile, pieceAt, pieceRect, sameTile, sideTile, splitSide, type PieceShape, type PieceState, type PlaceFail } from './pieces';
import type { Facing } from './player';
import { roomById, type SimState } from './state';
import { machineRecipe, stagesUnlocked } from './stages';
import { lockedByResearch } from './research';
import { pairOnPlace, tunnelContents, unpair } from './tunnels';
import { guidedShape, lockRefusal, pickUpRefusal } from './guided';

// Placing pieces on the foundry grid and picking them back up. Both are free.

/**
 * Pieces the player can place, in build bar order: logistics always (046: the splitter from the start),
 * machines once their output is hand-crafted (a stage once any of its rounds is).
 */
export function unlockedPieces(state: Pick<SimState, 'crafted' | 'research'>): string[] {
  const locked = lockedByResearch(state);
  return BUILD_BAR.filter((id) => {
    if (locked.includes(id)) return false;
    const def = pieceDef(id);
    // A stage once any of its rounds has been hand-made (039: hand-applied once to any family).
    if (def.kind === 'machine') return def.stage ? stagesUnlocked(state).includes(def.stage) : state.crafted.includes(recipeDef(def.recipeId).output.itemId);
    return true;
  });
}

/** Why a piece can't go here, or null if it can. */
export function canPlace(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing): PlaceFail | null {
  if (state.roomId !== FOUNDRY_ROOM) return 'not-foundry';
  if (!unlockedPieces(state).includes(pieceId)) return 'locked';
  // 058: the tutorial's build lock, which lets through only the guided step's next ghost.
  const refused = lockRefusal(state, pieceId, tx, ty, facing);
  if (refused) return refused;
  const room = roomById(FOUNDRY_ROOM);
  const tiles = footprint(pieceId, tx, ty, facing);
  if (tiles.some((t) => room.rows[t.ty]?.[t.tx] !== TILE.floor)) return 'blocked';
  if (tiles.some((t) => pieceAt(state.foundry, t.tx, t.ty) || fixtureAt(state.fixtures, t.tx, t.ty))) return 'occupied';
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
    if (piece?.kind === 'splitter') return sameTile(frontTile(piece), here) || sameTile(sideTile(piece, splitSide(piece)), here);
    // A crate hands nothing on, and an underground entrance (052) hands nothing out its front.
    if (piece) return piece.kind !== 'crate' && piece.kind !== 'tunnel-in' && sameTile(frontTile(piece), here);
    const port = fixtureAt(state.fixtures, t.tx, t.ty);
    return port !== undefined && fixtureDef(port.id).kind === 'port' && sameTile(portFront(port), here);
  };
  if (feeds(back)) return back;
  const sides = (['up', 'right', 'down', 'left'] as const).filter((s) => s !== facing && s !== back && feeds(s));
  return sides.length === 1 && sides[0] ? sides[0] : back;
}

/**
 * Places a piece and returns it, or records why it can't go there and returns null. An underground end pairs with the
 * nearest free end in reach, unless `pair` is false (063: a stamped blueprint pairs its own ends by their saved link).
 */
export function place(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing, shape: PieceShape = {}, pair = true): PieceState | null {
  const reason = canPlace(state, pieceId, tx, ty, facing);
  if (reason) {
    state.events.placeFails.push({ pieceId, tx, ty, reason });
    return null;
  }
  const kind = pieceDef(pieceId).kind;
  const guided = guidedShape(state, shape);
  const made: PieceShape =
    kind === 'conduit' ? { inFrom: conduitInFrom(state, tx, ty, facing, guided.inFrom) } : kind === 'splitter' ? { mirrored: shape.mirrored ?? false } : {};
  const piece = createPiece(state.foundry.nextPieceId++, pieceId, tx, ty, facing, made);
  state.foundry.pieces.push(piece);
  if (pair) pairOnPlace(state.foundry, piece);
  state.events.places.push({ id: piece.id, pieceId, tx, ty, facing });
  return piece;
}

/** Everything a piece holds, as items. A craft in progress gives back its inputs. */
export function pieceContents(p: PieceState): Inventory {
  const items: Inventory = {};
  const add = (itemId: string, n: number): void => {
    if (n > 0) items[itemId] = count(items, itemId) + n;
  };
  if ((p.kind === 'conduit' || p.kind === 'splitter' || p.kind === 'tunnel-in' || p.kind === 'tunnel-out') && p.item) add(p.item, 1);
  if (p.kind === 'tunnel-in') for (const [itemId, n] of Object.entries(tunnelContents(p))) add(itemId, n);
  if (p.kind === 'hopper' && p.item) add(p.item, p.count);
  if (p.kind === 'crate') for (const [itemId, n] of Object.entries(p.contents)) add(itemId, n);
  if (p.kind === 'machine') {
    const recipe = machineRecipe(p);
    for (const [itemId, n] of Object.entries(p.buffer)) add(itemId, n);
    if (p.crafting) for (const [itemId, n] of Object.entries(recipe.inputs)) add(itemId, n);
    add(p.made, p.output);
  }
  return items;
}

/** Removes the piece covering a tile, putting what it held in the inventory. Only in the foundry, and (058) as the build lock allows. */
export function pickUp(state: SimState, tx: number, ty: number): void {
  if (state.roomId !== FOUNDRY_ROOM || !pieceAt(state.foundry, tx, ty)) return;
  const refused = pickUpRefusal(state, tx, ty);
  if (refused) state.events.pickUpFails.push({ tx, ty, reason: refused });
  else removePieceAt(state, tx, ty);
}

/**
 * Removes the piece covering a foundry tile wherever the player is, putting what it held in the inventory, or (063: an
 * area pick-up) the stash.
 */
export function removePieceAt(state: SimState, tx: number, ty: number, into: 'inventory' | 'stash' = 'inventory'): void {
  const piece = pieceAt(state.foundry, tx, ty);
  if (!piece) return;
  const items = pieceContents(piece);
  // An underground exit takes what's under the floor back with it (052.2).
  for (const [itemId, n] of Object.entries(unpair(state.foundry, piece))) items[itemId] = count(items, itemId) + n;
  const store = into === 'stash' ? state.stash : state.inventory;
  for (const [itemId, n] of Object.entries(items)) store[itemId] = count(store, itemId) + n;
  state.foundry.pieces = state.foundry.pieces.filter((p) => p !== piece);
  state.events.pickUps.push({ id: piece.id, pieceId: piece.pieceId, items });
}
