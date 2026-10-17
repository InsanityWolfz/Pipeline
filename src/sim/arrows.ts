import { AMMO, type DamageType } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import { isSolid } from './collision';

// Arrows in flight. Position is the ground (shadow) point, which is what
// collides; render draws the arrow raised above it.

export interface ArrowState {
  id: number;
  ammoId: string;
  x: number;
  y: number;
  /** Unit flight direction. */
  dx: number;
  dy: number;
  /** Distance flown so far, px. */
  travelled: number;
  damage: number;
  damageType: DamageType;
}

export function createArrow(id: number, ammoId: string, x: number, y: number, dx: number, dy: number): ArrowState {
  const ammo = AMMO[ammoId];
  if (!ammo) throw new Error(`Unknown ammo '${ammoId}'`);
  return { id, ammoId, x, y, dx, dy, travelled: 0, damage: ammo.damage, damageType: ammo.damageType };
}

/**
 * Moves every arrow one tick and removes those that hit a wall or ruin block or
 * run out of range. Steps are under a tile, so arrows can't tunnel through walls.
 */
export function stepArrows(arrows: ArrowState[], room: Room): void {
  let kept = 0;
  for (const arrow of arrows) {
    if (flies(arrow, room)) arrows[kept++] = arrow;
  }
  arrows.length = kept;
}

function flies(arrow: ArrowState, room: Room): boolean {
  if (inSolid(room, arrow.x, arrow.y)) return false;
  const ammo = AMMO[arrow.ammoId];
  if (!ammo) return false;
  const step = ammo.speed / TICK_RATE;
  arrow.x += arrow.dx * step;
  arrow.y += arrow.dy * step;
  arrow.travelled += step;
  return arrow.travelled < ammo.range && !inSolid(room, arrow.x, arrow.y);
}

function inSolid(room: Room, x: number, y: number): boolean {
  return isSolid(room, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}
