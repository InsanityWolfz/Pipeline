import { straightAmmo, type DamageType } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import type { KeywordId } from '../data/keywords';
import type { Room } from '../data/rooms';
import { roundKeywords, shardKeywords } from '../data/roundKeywords';
import { hasTagKeyword, SPLIT } from '../data/tags';
import { shotStopsAt } from './collision';

// Straight shots in flight: arrows, ley bolts and Shards (029). Position is the
// ground (shadow) point, which is what collides; render draws the shot raised above it.
// Each carries its own flight numbers, so a shard flies by the Split's numbers, not an ammo's.

export interface ArrowState {
  id: number;
  /** The round's ammo id, tags included (029), or the Shard's projectile id. */
  ammoId: string;
  /** Its keywords (039): a round's, derived from its data, or a Shard's from its parent's. Content reaches it by these. */
  keywords: KeywordId[];
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
  /** Its Knockback (039): px a hit pushes, times the enemy's weight; a Shard carries its round's. */
  knockback: number;
  /** Passes through every enemy in its path (029: arrows, without limit). */
  pierce: boolean;
  /** Bursts into Shards where it hits an enemy (029). */
  split: boolean;
  /** The enemy a homing round steers toward (029), or null to fly straight. */
  targetId: number | null;
  /** It locked on at launch (064): only such a round, its target lost, may re-lock (homing.ts). */
  lockedAtLaunch: boolean;
  /** Enemies it has hit (or, for a shard, may not hit), so it hits each only once. */
  hitIds: number[];
  /** Carries a charge from a bomb's blast (037: Blastfletch) to its next hit, and the Pools it has drawn from. */
  pooled: boolean;
  pooledBy: number[];
}

/** A Shard's flight and hit (029's Split, 037's Shatterpoint): how it flies, what it deals, and whether a Split made it. */
export interface ShardDef {
  speed: number;
  range: number;
  damage: number;
  damageType: DamageType;
  fromSplit: boolean;
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
  const { damage, damageType, speed, range, pierce, knockback } = straightAmmo(ammoId);
  const keywords = roundKeywords(ammoId);
  return { id, ammoId, keywords, roomId, x, y, dx, dy, travelled: 0, speed, range, damage, damageType, knockback, pierce, split: hasTagKeyword(ammoId, 'split'), targetId, lockedAtLaunch: targetId !== null, hitIds: [], pooled: false, pooledBy: [] };
}

/** Whether a shot is a Shard (029, 037), not a round from the tube. */
export const isShard = (a: Pick<ArrowState, 'ammoId'>): boolean => a.ammoId === SPLIT.projectile;

/** A Shard from a round that hit `struckId` (029: a Split's; 037: Shatterpoint's): its def's numbers, never hitting the enemy that was struck, never piercing or splitting. */
export function createShard(id: number, parent: Pick<ArrowState, 'ammoId' | 'roomId' | 'knockback'>, x: number, y: number, dx: number, dy: number, struckId: number, def: ShardDef): ArrowState {
  const { speed, range, damage, damageType, fromSplit } = def;
  const keywords = shardKeywords(parent.ammoId, fromSplit);
  return { id, ammoId: SPLIT.projectile, keywords, roomId: parent.roomId, x, y, dx, dy, travelled: 0, speed, range, damage, damageType, knockback: parent.knockback, pierce: false, split: false, targetId: null, lockedAtLaunch: false, hitIds: [struckId], pooled: false, pooledBy: [] };
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
  return shotStopsAt(room, x, y);
}
