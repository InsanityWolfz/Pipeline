import { DROP_SCATTER, DROP_SCATTER_TRIES, type DropTable, type EnemyDef } from '../data/enemies';
import { FEET_BOX, PICKUP_RADIUS } from '../data/player';
import { TILE_SIZE } from '../data/config';
import { UNIDENTIFIED_ARMOR } from '../data/armor';
import type { Room } from '../data/rooms';
import { isSolid, overlapsRect, type Rect } from './collision';
import { nextFloat, nextInt, type RngState } from './rng';
import { rollArmorDrop } from './armor';
import { tileRect } from './fixtures';
import { nodeRects } from './nodes';
import { roomById, type SimState } from './state';

// Items dropped on the ground, and picking them up by walking over them.

export interface GroundItem {
  id: number;
  itemId: string;
  roomId: string;
  x: number;
  y: number;
}

/** The item ids a drop table rolls, one entry per item. */
export function rollDrops(table: DropTable, rng: RngState): string[] {
  const items: string[] = [];
  for (const { itemId, min, max } of table.always) {
    const n = nextInt(rng, min, max);
    for (let i = 0; i < n; i++) items.push(itemId);
  }
  if (table.oneOf.length > 0 && nextFloat(rng) < table.chance) {
    const extra = table.oneOf[nextInt(rng, 0, table.oneOf.length - 1)];
    if (extra) items.push(extra);
  }
  for (const { items: from, min, max } of table.picks ?? []) {
    const n = nextInt(rng, min, max);
    for (let i = 0; i < n; i++) {
      const pick = from[nextInt(rng, 0, from.length - 1)];
      if (pick) items.push(pick);
    }
  }
  for (const { itemId, chance } of table.rare ?? []) if (nextFloat(rng) < chance) items.push(itemId);
  return items;
}

/** A point, as a box, for overlap tests: strictly inside a rect overlaps it. */
const POINT = { w: 0, h: 0 } as const;

/**
 * A random clear spot within DROP_SCATTER of (x, y), outside solid tiles and
 * `obstacles`, or (x, y) itself if none turns up.
 */
export function scatterPoint(
  room: Room,
  rng: RngState,
  x: number,
  y: number,
  obstacles: readonly Rect[] = [],
): { x: number; y: number } {
  for (let i = 0; i < DROP_SCATTER_TRIES; i++) {
    const angle = nextFloat(rng) * 2 * Math.PI;
    const r = nextFloat(rng) * DROP_SCATTER;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (isSolid(room, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE))) continue;
    if (obstacles.some((r) => overlapsRect(px, py, POINT, r))) continue;
    return { x: px, y: py };
  }
  return { x, y };
}

/** Rolls an enemy's drops and scatters them on the ground around (x, y) in its room. */
export function spawnDrops(state: SimState, def: EnemyDef, x: number, y: number, roomId: string): void {
  const room = roomById(roomId);
  // Never inside something solid the player can't walk onto: nodes, pylons, reliquaries, the tube stone.
  const fixed = [...(room.pylons ?? []), ...(room.caches ?? []), ...(room.tubeStone ? [room.tubeStone] : [])].map(tileRect);
  const rects = [...nodeRects(state.nodes, roomId), ...fixed];
  const items = rollDrops(def.drops, state.rng);
  if (rollArmorDrop(state, def.id)) items.push(UNIDENTIFIED_ARMOR);
  for (const itemId of items) {
    const at = scatterPoint(room, state.rng, x, y, rects);
    layItem(state, itemId, roomId, at.x, at.y);
  }
}

/** Lays one item on the ground at (x, y) in a room. */
export function layItem(state: SimState, itemId: string, roomId: string, x: number, y: number): void {
  state.groundItems.push({ id: state.nextGroundItemId++, itemId, roomId, x, y });
}

/** Moves ground items in the player's room within PICKUP_RADIUS of their feet box into the inventory, whatever stands in between (021). */
export function stepPickups(state: SimState): void {
  const p = state.player;
  let kept = 0;
  for (const item of state.groundItems) {
    if (item.roomId !== state.roomId) {
      state.groundItems[kept++] = item;
      continue;
    }
    const gapX = Math.max(0, Math.abs(item.x - p.x) - FEET_BOX.w / 2);
    const gapY = Math.max(0, Math.abs(item.y - p.y) - FEET_BOX.h / 2);
    if (Math.hypot(gapX, gapY) <= PICKUP_RADIUS) {
      state.inventory[item.itemId] = (state.inventory[item.itemId] ?? 0) + 1;
      state.events.pickups.push({ id: item.id, itemId: item.itemId, x: item.x, y: item.y });
    } else {
      state.groundItems[kept++] = item;
    }
  }
  state.groundItems.length = kept;
}
