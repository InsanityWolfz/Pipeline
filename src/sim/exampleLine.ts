import { EXAMPLE_LINE } from '../data/exampleLine';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { fixtureAt } from './fixtures';
import { createPiece, footprint, pieceAt, type FoundryState } from './pieces';
import { roomById, type SimState } from './state';

// The example line (046): laid in the foundry the tick the tube first attunes, on a
// start that asks for it (the real game's). Its pieces are ordinary pieces, made as
// placing makes them, so they run, are picked up and refund like any other; only
// the unlock check is skipped, as the game places them, not the player. A piece
// whose tiles are already taken is left out. Laid once: attuning happens once.

/** Lays the example line and stocks its hoppers. */
export function placeExampleLine(state: SimState): void {
  const room = roomById(FOUNDRY_ROOM);
  for (const def of EXAMPLE_LINE) {
    const tiles = footprint(def.pieceId, def.tx, def.ty, def.facing);
    const free = tiles.every((t) => room.rows[t.ty]?.[t.tx] === TILE.floor && !pieceAt(state.foundry, t.tx, t.ty) && !fixtureAt(state.fixtures, t.tx, t.ty));
    if (!free) continue;
    const piece = createPiece(state.foundry.nextPieceId++, def.pieceId, def.tx, def.ty, def.facing);
    if (piece.kind === 'hopper' && def.stock) {
      piece.item = def.stock.itemId;
      piece.count = def.stock.count;
    }
    state.foundry.pieces.push(piece);
  }
}

/**
 * Nothing left to run (046): no hopper holds anything, no machine holds inputs or output or is crafting, and nothing
 * rides a conduit, sorter, splitter or merger. Crates don't count: they only collect.
 */
export function foundryDry(foundry: FoundryState): boolean {
  return foundry.pieces.every((p) => {
    if (p.kind === 'hopper') return p.count === 0;
    if (p.kind === 'machine') return !p.crafting && p.output === 0 && Object.values(p.buffer).every((n) => n === 0);
    if (p.kind === 'crate') return true;
    return p.item === null;
  });
}
