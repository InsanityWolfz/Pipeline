import { OVERWORLD, type TilePos } from '../../src/data/overworld';
import { TILE, WALKABLE, type Room } from '../../src/data/rooms';

// Reachability on the generated overworld (029, 030): which tiles a player can walk
// to from a start, nodes and pylons standing in the way.

export const tileKey = (t: TilePos): string => `${t.tx},${t.ty}`;

/** Tiles reachable on foot from a start, nodes and the room's pylons (solid, 032) standing in the way; an arena's door (055) passes with E. */
export function reachable(room: Room, from: TilePos): Set<string> {
  const nodes = new Set([...OVERWORLD.nodes, ...(room.pylons ?? [])].map(tileKey));
  const seen = new Set<string>([tileKey(from)]);
  const queue: TilePos[] = [from];
  while (queue.length > 0) {
    const t = queue.shift();
    if (!t) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { tx: t.tx + dx, ty: t.ty + dy };
      const symbol = room.rows[n.ty]?.[n.tx];
      if (seen.has(tileKey(n)) || nodes.has(tileKey(n)) || symbol === undefined || !(WALKABLE.includes(symbol) || symbol === TILE.arenaDoor)) continue;
      seen.add(tileKey(n));
      queue.push(n);
    }
  }
  return seen;
}
