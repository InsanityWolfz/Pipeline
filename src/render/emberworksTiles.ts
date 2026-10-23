import { EMBERWORKS } from '../data/emberworks';
import { EMBERWORKS_SPRITES } from '../data/emberworksAssets';
import { TILE, type Room } from '../data/rooms';
import { fromCentre } from '../data/worldShape';
import { hollowsFrame } from './hollowsTiles';

// The Emberworks' standing tiles (060), for the overworld's view: its kilns (the front with its glowing mouth, or the
// brick top where another kiln stands in front), its chimney stacks, and its cliffs: the Hollows' own on the cliff
// edge between the rings, warm ash past it.

/** Where the Emberworks' own ground starts: past the Hollows' cliff edge. */
const FOOT = EMBERWORKS.radii.inner + EMBERWORKS.wall;

/** An Emberworks tile's standing sprite, by its symbol, tile and hash. */
export function emberworksFrame(symbol: string, tx: number, ty: number, hash: number, room: Room): string | undefined {
  const S = EMBERWORKS_SPRITES;
  if (symbol === TILE.cliff && fromCentre(tx, ty) < FOOT) return hollowsFrame(symbol, tx, ty, hash, room);
  if (symbol === TILE.cliff) return room.rows[ty + 1]?.[tx] === TILE.cliff ? S.cliffTop : S.cliffs[hash % S.cliffs.length];
  if (symbol === TILE.kiln) return room.rows[ty + 1]?.[tx] === TILE.kiln ? S.kilnTop : S.kiln;
  if (symbol === TILE.chimney) return S.chimney[hash % S.chimney.length];
  // The Anvil Hall's walls (the only walls out here).
  if (symbol === TILE.wall) return S.hallWall;
  return undefined;
}
