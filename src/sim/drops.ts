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
  /** The magnet pull's speed so far, px per tick (045); absent or 0 at rest. */
  speed?: number;
  /** Ticks before the pull may take it (045: a cache's item bursting out); absent or 0 for none. */
  wait?: number;
  /** Set on a cache's items (045): where it burst from, for the render's flight. */
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

/**
 * Rolls an enemy's drops and scatters them on the ground around (x, y) in its room. A champion (032) rolls its table
 * 2–3 times and drops exactly its guaranteed armor instead of the usual chance. Then a separate schematic roll (033).
 */
export function spawnDrops(state: SimState, def: EnemyDef, x: number, y: number, roomId: string, champion = false): void {
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
  scatterItems(state, items, roomId, x, y);
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
    if (item.wait) item.wait -= 1;
    if (item.roomId !== state.roomId || item.wait || gapToFeet(p, item.x, item.y) > MAGNET.radius) {
      if (item.speed) item.speed = 0;
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
