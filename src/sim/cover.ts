import { TILE_SIZE } from '../data/config';
import type { SniperDef } from '../data/hollowsEnemies';
import { WALKABLE } from '../data/rooms';
import { overlapsRect } from './collision';
import type { EnemyState } from './enemies';
import { standingRects } from './fixtures';
import { nodeRects } from './nodes';
import { inSafeZone } from './population';
import { clearShot } from './sightLine';
import { roomById, type SimState } from './state';

// Cover for the Sniper construct (035), worked out from the tile grid each time it asks,
// so it is deterministic and needs no hand-placed data: a free tile near it with a tile
// that stops shots (a cliff, rock, wall or pillar, 034) on the straight line from the
// tile's centre to the player's feet. And the other way round: a tile it can step to that
// sees the player.

export interface Spot {
  x: number;
  y: number;
}

/**
 * Free tiles within `radius` tiles of (x, y), px, nearest first (ties by row, then column): walkable, out of any safe
 * zone, and with nothing standing on them (nodes, pylons, reliquaries).
 */
function freeTiles(state: SimState, roomId: string, x: number, y: number, radius: number, square = false): (Spot & { d: number })[] {
  const room = roomById(roomId);
  const rects = [...nodeRects(state.nodes, roomId), ...standingRects(room)];
  const cx = Math.floor(x / TILE_SIZE);
  const cy = Math.floor(y / TILE_SIZE);
  const out: (Spot & { d: number })[] = [];
  for (let ty = cy - radius; ty <= cy + radius; ty++) {
    for (let tx = cx - radius; tx <= cx + radius; tx++) {
      if (!square && Math.hypot(tx - cx, ty - cy) > radius) continue;
      const symbol = room.rows[ty]?.[tx];
      if (symbol === undefined || !WALKABLE.includes(symbol)) continue;
      const px = (tx + 0.5) * TILE_SIZE;
      const py = (ty + 0.5) * TILE_SIZE;
      if (rects.some((r) => overlapsRect(px, py, { w: 0, h: 0 }, r)) || inSafeZone(state, roomId, px, py)) continue;
      out.push({ x: px, y: py, d: Math.hypot(px - x, py - y) });
    }
  }
  // A stable order: nearest, then by row and column (the scan's), so the same grid always gives the same pick.
  return out.map((t, i) => ({ t, i })).sort((a, b) => a.t.d - b.t.d || a.i - b.i).map(({ t }) => t);
}

/** The nearest cover tile's centre within `coverSearch` tiles of the Sniper, at least `farther` px from the player; null when none. */
export function coverSpot(state: SimState, e: EnemyState, def: SniperDef, farther = 0): Spot | null {
  const p = state.player;
  const room = roomById(e.roomId);
  for (const t of freeTiles(state, e.roomId, e.x, e.y, def.snipe.coverSearch)) {
    if (Math.hypot(t.x - p.x, t.y - p.y) <= farther) continue;
    if (!clearShot(room, t.x, t.y, p.x, p.y)) return { x: t.x, y: t.y };
  }
  return null;
}

/** The nearest tile's centre within `peekTiles` (either way) of the Sniper's own tile that sees the player's feet; null when none. */
export function peekSpot(state: SimState, e: EnemyState, def: SniperDef): Spot | null {
  const p = state.player;
  const room = roomById(e.roomId);
  const t = freeTiles(state, e.roomId, e.x, e.y, def.snipe.peekTiles, true).find((c) => clearShot(room, c.x, c.y, p.x, p.y));
  return t ? { x: t.x, y: t.y } : null;
}
