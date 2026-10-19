import { straightAmmo, type DamageType } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import { hasBehaviour, STAR } from '../data/tags';
import { blocksShot } from './collision';

// Straight shots in flight: arrows, ley bolts and star shards (029). Position is the
// ground (shadow) point, which is what collides; render draws the shot raised above it.
// Each carries its own flight numbers, so a shard flies by the star's numbers, not an ammo's.

export interface ArrowState {
  id: number;
  /** The round's ammo id, tags included (029), or the star shard's projectile id. */
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
  /** Flight speed, px per second, and how far it flies, px. */
  speed: number;
  range: number;
  damage: number;
  damageType: DamageType;
  /** Passes through every enemy in its path (029: arrows, without limit). */
  pierce: boolean;
  /** Bursts into star shards where it hits an enemy (029). */
  split: boolean;
  /** The enemy a homing round steers toward (029), or null to fly straight. */
  targetId: number | null;
  /** Enemies it has hit (or, for a shard, may not hit), so it hits each only once. */
  hitIds: number[];
}

/** A round fired from the tube, with its ammo's numbers. `targetId` is a homing round's lock. */
export function createArrow(
  id: number,
  ammoId: string,
  roomId: string,
  x: number,
  y: number,
  dx: number,
  dy: number,
  targetId: number | null = null,
): ArrowState {
  const { damage, damageType, speed, range, pierce } = straightAmmo(ammoId);
  return { id, ammoId, roomId, x, y, dx, dy, travelled: 0, speed, range, damage, damageType, pierce, split: hasBehaviour(ammoId, 'star'), targetId, hitIds: [] };
}

/** A star shard (029): the star's numbers, never hitting the enemy that was struck, never piercing or splitting. */
export function createShard(id: number, roomId: string, x: number, y: number, dx: number, dy: number, struckId: number): ArrowState {
  const { speed, range, damage } = STAR;
  return { id, ammoId: STAR.projectile, roomId, x, y, dx, dy, travelled: 0, speed, range, damage, damageType: 'physical', pierce: false, split: false, targetId: null, hitIds: [struckId] };
}

/** Tries an arrow against targets at its current point; true if it hit one and is spent. */
export type ArrowHitTest = (arrow: ArrowState) => boolean;

/** Turns an arrow before it moves (029: a homing round toward its target). */
export type ArrowSteer = (arrow: ArrowState) => void;

/** True if a tile of a room stops shots though its symbol doesn't (034: a shut ley barrier). */
export type ShotSeal = (roomId: string, tx: number, ty: number) => boolean;

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
  steer: ArrowSteer = () => {},
  sealed: ShotSeal = () => false,
): void {
  let kept = 0;
  for (const arrow of arrows) {
    const room = roomFor(arrow.roomId);
    const stops = (x: number, y: number): boolean => inSolid(room, x, y) || sealed(arrow.roomId, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
    if (flies(arrow, stops, hits, steer)) arrows[kept++] = arrow;
  }
  arrows.length = kept;
}

function flies(arrow: ArrowState, stops: (x: number, y: number) => boolean, hits: ArrowHitTest, steer: ArrowSteer): boolean {
  if (hits(arrow) || stops(arrow.x, arrow.y)) return false;
  steer(arrow);
  const step = arrow.speed / TICK_RATE;
  arrow.x += arrow.dx * step;
  arrow.y += arrow.dy * step;
  arrow.travelled += step;
  if (hits(arrow)) return false;
  return arrow.travelled < arrow.range && !stops(arrow.x, arrow.y);
}

function inSolid(room: Room, x: number, y: number): boolean {
  return blocksShot(room, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}
