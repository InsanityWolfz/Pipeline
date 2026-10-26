import { STORMCROWN } from '../data/stormcrown';
import { STORMCROWN_SPRITES } from '../data/stormcrownAssets';
import { TILE, type Room } from '../data/rooms';
import { fromCentre } from '../data/worldShape';
import { emberworksFrame } from './emberworksTiles';

// The Stormcrown's standing tiles (064), for the overworld's view: its iron rods, its cairns (the heap, or a flat top
// where another cairn stands in front), and its cliffs: the Emberworks' ash on the cliff edge between the rings, slate
// past it.

/** Where the Stormcrown's own ground starts: past the Emberworks' cliff edge. */
const FOOT = STORMCROWN.radii.inner + STORMCROWN.wall;

/** A Stormcrown tile's standing sprite, by its symbol, tile and hash. */
export function stormcrownFrame(symbol: string, tx: number, ty: number, hash: number, room: Room): string | undefined {
  const S = STORMCROWN_SPRITES;
  if (fromCentre(tx, ty) < FOOT) return emberworksFrame(symbol, tx, ty, hash, room, true);
  if (symbol === TILE.cliff) return room.rows[ty + 1]?.[tx] === TILE.cliff ? S.cliffTop : S.cliffs[hash % S.cliffs.length];
  if (symbol === TILE.ironRod) return S.ironRod[hash % S.ironRod.length];
  if (symbol === TILE.cairn) return room.rows[ty + 1]?.[tx] === TILE.cairn ? S.cairnTop : S.cairn[hash % S.cairn.length];
  return undefined;
}
