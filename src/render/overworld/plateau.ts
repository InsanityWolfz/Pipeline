import { HOLLOWS } from '../../data/hollows';
import { TILE, type Room } from '../../data/rooms';

// The world's cliff edge (053): a cliff tile within `HOLLOWS.edge.face` tiles of open ground stands as a cliff sprite;
// the rest, the solid plateau out to the grid's edge, is painted flat into the ground instead (thousands of sprites
// nobody can reach). Worked out once per grid.

const FACES = new WeakMap<readonly string[], Uint8Array>();

/** 1 for each cliff tile far from open ground (plateau), row by row. */
function plateauOf(room: Room): Uint8Array {
  let map = FACES.get(room.rows);
  if (map) return map;
  const h = room.rows.length;
  const w = room.rows[0]?.length ?? 0;
  const k = HOLLOWS.edge.face;
  map = new Uint8Array(w * h);
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (room.rows[ty]?.[tx] !== TILE.cliff) continue;
      let open = false;
      for (let dy = -k; dy <= k && !open; dy++) for (let dx = -k; dx <= k && !open; dx++) open = (room.rows[ty + dy]?.[tx + dx] ?? TILE.cliff) !== TILE.cliff;
      if (!open) map[ty * w + tx] = 1;
    }
  }
  FACES.set(room.rows, map);
  return map;
}

/** True if a tile is plateau: a cliff with no open ground within `face` tiles. */
export function isPlateau(room: Room, tx: number, ty: number): boolean {
  const w = room.rows[0]?.length ?? 0;
  if (tx < 0 || ty < 0 || tx >= w || ty >= room.rows.length) return true;
  return plateauOf(room)[ty * w + tx] === 1;
}
