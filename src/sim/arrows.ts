import { straightAmmo, type DamageType } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import { isSolid } from './collision';

// Straight shots in flight: arrows and ley bolts. Position is the ground (shadow)
// point, which is what collides; render draws the shot raised above it.

export interface ArrowState {
  id: number;
  ammoId: string;
  /** The room it was fired in; it never leaves it. */
  roomId: string;
  x: number;
  y: number;
  /** Unit flight direction. */
  dx: number;
  dy: number;
  /** Distance flown so far, px. */
  travelled: number;
  damage: number;
  damageType: DamageType;
  /** Enemies a piercing shot has already hit, so it hits each only once. */
  hitIds: number[];
}

export function createArrow(
  id: number,
  ammoId: string,
  roomId: string,
  x: number,
  y: number,
  dx: number,
  dy: number,
): ArrowState {
  const { damage, damageType } = straightAmmo(ammoId);
  return { id, ammoId, roomId, x, y, dx, dy, travelled: 0, damage, damageType, hitIds: [] };
}

/** Tries an arrow against targets at its current point; true if it hit one and is spent. */
export type ArrowHitTest = (arrow: ArrowState) => boolean;

/**
 * Moves every arrow one tick and removes those that hit a target, a wall or a
 * ruin block, or run out of range. Targets are tried before walls at both the
 * start and end point, so a target standing against a wall still gets hit.
 * Steps are under a tile, so arrows can't tunnel through walls.
 */
export function stepArrows(
  arrows: ArrowState[],
  roomFor: (roomId: string) => Room,
  hits: ArrowHitTest = () => false,
): void {
  let kept = 0;
  for (const arrow of arrows) {
    if (flies(arrow, roomFor(arrow.roomId), hits)) arrows[kept++] = arrow;
  }
  arrows.length = kept;
}

function flies(arrow: ArrowState, room: Room, hits: ArrowHitTest): boolean {
  if (hits(arrow) || inSolid(room, arrow.x, arrow.y)) return false;
  const ammo = straightAmmo(arrow.ammoId);
  const step = ammo.speed / TICK_RATE;
  arrow.x += arrow.dx * step;
  arrow.y += arrow.dy * step;
  arrow.travelled += step;
  if (hits(arrow)) return false;
  return arrow.travelled < ammo.range && !inSolid(room, arrow.x, arrow.y);
}

function inSolid(room: Room, x: number, y: number): boolean {
  return isSolid(room, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}
