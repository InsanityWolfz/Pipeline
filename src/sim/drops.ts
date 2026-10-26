import { DROP_SCATTER, DROP_SCATTER_TRIES, type DropTable, type EnemyDef } from '../data/enemies';
import { FEET_BOX, MAGNET } from '../data/player';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import { FIRST_ARMOR_ENEMY, UNIDENTIFIED_ARMOR } from '../data/gear';
import { CHAMPIONS } from '../data/champions';
import { championDropRolls } from './champions';
import type { Room } from '../data/rooms';
import { isSolid, overlapsRect, type Rect } from './collision';
import { nextFloat, nextInt, type RngState } from './rng';
import { rollArmorDrop } from './gear';
import { standingRects } from './fixtures';
import { nodeRects } from './nodes';
import { roomById, type SimState } from './state';
import { ANY_SCHEMATIC } from '../data/drops';
import { ITEMS } from '../data/items';
import { pickSchematic, rollSchematic } from './schematics';

// Items dropped on the ground, and picking them up: within reach they're pulled in and picked up on contact (045).

/** A cache's item bursting out (045): the chest's point it flies from, and the ticks it waits in the chest first. */
export interface GroundBurst {
  x: number;
  y: number;
  delay: number;
}

export interface GroundItem {
  id: number;
  itemId: string;
  roomId: string;
  x: number;
  y: number;
  /** The magnet pull's speed so far, px per tick (045); absent at rest. */
  speed?: number;
  /** Ticks before the pull may take it (045: a cache's item bursting out); absent for none. */
  wait?: number;
  /** Set on a cache's items while they wait (045): where it burst from, for the render's flight. */
  burst?: GroundBurst;
}

/** The item ids a drop table rolls, one entry per item; `rare` false leaves its rare entries for a single roll of their own (032). */
export function rollDrops(table: DropTable, rng: RngState, rare = true): string[] {
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
  if (rare) items.push(...rollRare(table, rng));
  return items;
}

/** A table's rare entries (032), each rolled once at its chance, a champion's at its champion chance (033). */
export function rollRare(table: DropTable, rng: RngState, champion = false): string[] {
  return (table.rare ?? []).flatMap(({ itemId, chance, championChance }) => (nextFloat(rng) < (champion ? (championChance ?? chance) : chance) ? [itemId] : []));
}

/** A point, as a box, for overlap tests: strictly inside a rect overlaps it. */
const POINT = { w: 0, h: 0 } as const;

/** True if a drop may lie at (x, y): not in a solid tile, nor inside any of `obstacles`. */
export function isClearPoint(room: Room, x: number, y: number, obstacles: readonly Rect[] = []): boolean {
  return !isSolid(room, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) && !obstacles.some((r) => overlapsRect(x, y, POINT, r));
}

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
    if (isClearPoint(room, px, py, obstacles)) return { x: px, y: py };
  }
  return { x, y };
}

/**
 * Rolls an enemy's drops and scatters them on the ground around (x, y) in its room. A champion (032) rolls its table
 * 2–3 times and drops exactly its guaranteed armor instead of the usual chance. Then a separate schematic roll (033).
 */
export function spawnDrops(state: SimState, def: EnemyDef, x: number, y: number, roomId: string, champion = false): void {
  // 065: an enemy with a drop share (a static mite's third) drops at all only that share of the time.
  if (def.dropShare !== undefined && nextFloat(state.rng) >= def.dropShare) return;
  const rolls = champion ? championDropRolls(state.rng) : 1;
  // A champion's rare entries roll once, at its own chance, not once per drop roll (032, 033).
  const items = [
    ...Array.from({ length: rolls }, () => rollDrops(def.drops, state.rng, false)).flat(),
    ...rollRare(def.drops, state.rng, champion),
    ...rollSchematic(state.rng, champion),
  ];
  if (champion) {
    // Its guaranteed piece is the first Husk's too, if it's that one (one piece, not two).
    if (def.id === FIRST_ARMOR_ENEMY) state.firstHuskDropped = true;
    for (let i = 0; i < CHAMPIONS.armor; i++) items.push(UNIDENTIFIED_ARMOR);
  } else if (rollArmorDrop(state, def.id)) items.push(UNIDENTIFIED_ARMOR);
  const at = landingPoint(roomById(roomId), x, y);
  scatterItems(state, items, roomId, at.x, at.y);
}

/** How far out, in tiles, a corpse over solid ground looks for open ground to drop on (065). */
const LANDING_REACH = 8;

/**
 * Where a corpse's drops land (065): where it fell, or, over something solid (a flier killed over a rock or a chasm),
 * the centre of the nearest open tile, ring by ring outward, nearest first; where it fell if none is within reach.
 */
export function landingPoint(room: Room, x: number, y: number): { x: number; y: number } {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (!isSolid(room, tx, ty)) return { x, y };
  for (let r = 1; r <= LANDING_REACH; r++) {
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || isSolid(room, tx + dx, ty + dy)) continue;
        const c = { x: (tx + dx + 0.5) * TILE_SIZE, y: (ty + dy + 0.5) * TILE_SIZE };
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
    if (best) return best;
  }
  return { x, y };
}

/**
 * Scatters items on the ground round (x, y) in a room, never inside something solid the player can't walk onto. Each
 * ANY_SCHEMATIC becomes one schematic still lost there (033), or nothing when none is; each schematic that lands is recorded.
 */
export function scatterItems(state: SimState, items: readonly string[], roomId: string, x: number, y: number): void {
  const room = roomById(roomId);
  const rects = [...nodeRects(state.nodes, roomId), ...standingRects(room)];
  for (const item of items) {
    const itemId = item === ANY_SCHEMATIC ? pickSchematic(state, roomId, { x, y }) : item;
    if (itemId === null) continue;
    const at = scatterPoint(room, state.rng, x, y, rects);
    layItem(state, itemId, roomId, at.x, at.y);
    if (ITEMS[itemId]?.kind === 'schematic') state.events.schematicDrops.push({ itemId, x: at.x, y: at.y });
  }
}

/** Lays one item on the ground at (x, y) in a room. */
export function layItem(state: SimState, itemId: string, roomId: string, x: number, y: number): void {
  state.groundItems.push({ id: state.nextGroundItemId++, itemId, roomId, x, y });
}

/** The gap between a point and the player's feet box, px. */
function gapToFeet(p: { x: number; y: number }, x: number, y: number): number {
  const gapX = Math.max(0, Math.abs(x - p.x) - FEET_BOX.w / 2);
  const gapY = Math.max(0, Math.abs(y - p.y) - FEET_BOX.h / 2);
  return Math.hypot(gapX, gapY);
}

const ACCEL = MAGNET.accel / (TICK_RATE * TICK_RATE);
const MAX_SPEED = MAGNET.maxSpeed / TICK_RATE;

/**
 * The magnet pull (045): each ground item in the player's room within MAGNET.radius of their feet box (whatever stands
 * in between, 021) moves toward them, faster each tick, and is picked up on contact. One out of reach stops. A
 * waiting item (a cache's, still bursting out) counts its wait down first, in any room.
 */
export function stepPickups(state: SimState): void {
  const p = state.player;
  let kept = 0;
  for (const item of state.groundItems) {
    if (item.wait) {
      item.wait -= 1;
      // Its burst over, it's an ordinary drop again (nothing left to save).
      if (item.wait === 0) {
        delete item.wait;
        delete item.burst;
      }
    }
    if (item.roomId !== state.roomId || item.wait || gapToFeet(p, item.x, item.y) > MAGNET.radius) {
      delete item.speed;
      state.groundItems[kept++] = item;
      continue;
    }
    const speed = Math.min(MAX_SPEED, (item.speed ?? 0) + ACCEL);
    const dist = Math.hypot(p.x - item.x, p.y - item.y);
    if (dist <= speed) {
      item.x = p.x;
      item.y = p.y;
    } else {
      item.x += ((p.x - item.x) / dist) * speed;
      item.y += ((p.y - item.y) / dist) * speed;
    }
    item.speed = speed;
    if (gapToFeet(p, item.x, item.y) <= MAGNET.contact) {
      state.inventory[item.itemId] = (state.inventory[item.itemId] ?? 0) + 1;
      state.events.pickups.push({ id: item.id, itemId: item.itemId, x: item.x, y: item.y });
    } else {
      state.groundItems[kept++] = item;
    }
  }
  state.groundItems.length = kept;
}
