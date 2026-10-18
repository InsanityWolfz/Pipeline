import { facingOf, opposite } from '../sim/direction';
import { tilesBetween, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';

// Conduit drags (013) as pure steps, so they can be tested without a pointer.
// The tile under the cursor is held back until the next tile says which way it
// faces; each laid tile takes from the side the drag came in by, so a turn lays a corner.

/** A conduit placement: where, which way it faces, and (from a drag) the side it takes from. */
export interface ConduitLay extends Tile {
  facing: Facing;
  inFrom?: Facing;
}

/** The held tile: not laid yet. A drag's first tile has no side, so it auto-joins like a click. */
export interface HeldConduit {
  tile: Tile;
  inFrom?: Facing;
}

/** The cursor moved from the held tile to `to`: the tiles to lay, and the tile now held. */
export function dragTo(held: HeldConduit, to: Tile): { lay: ConduitLay[]; held: HeldConduit } {
  const lay: ConduitLay[] = [];
  let current = held;
  for (const t of tilesBetween(held.tile, to)) {
    const prev = current.tile;
    const facing = facingOf(t.tx - prev.tx, t.ty - prev.ty, 'right');
    lay.push({ ...prev, facing, ...(current.inFrom ? { inFrom: current.inFrom } : {}) });
    current = { tile: t, inFrom: opposite(facing) };
  }
  return { lay, held: current };
}

/** Release: the held tile runs straight on in the drag's last direction, or a click's ghost facing. */
export function release(held: HeldConduit, ghostFacing: Facing): ConduitLay {
  const facing = held.inFrom ? opposite(held.inFrom) : ghostFacing;
  return { ...held.tile, facing, ...(held.inFrom ? { inFrom: held.inFrom } : {}) };
}

/**
 * The ghost's shape on `tile`: a held drag tile shows what it would be laid as;
 * anything else shows the ghost's facing, auto-joined as a click would be.
 */
export function ghostShape(
  held: ConduitLay | null,
  tile: Tile,
  facing: Facing,
  autoJoin: (tile: Tile, facing: Facing) => Facing,
): { facing: Facing; inFrom: Facing } {
  if (held?.inFrom && held.tx === tile.tx && held.ty === tile.ty) return { facing: held.facing, inFrom: held.inFrom };
  return { facing, inFrom: autoJoin(tile, facing) };
}
