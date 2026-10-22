import { ENEMIES } from '../data/enemies';
import { CHAMPIONS } from '../data/champions';
import type { Room } from '../data/rooms';
import { defOf } from './champions';
import { moveBox, type Rect } from './collision';
import { passesThrough, type EnemyState } from './enemies';

// Enemy separation (split out of enemies.ts): overlapping same-room enemies pushed apart, half each.

/** A room and the solid things standing in it, for collision. */
export interface RoomBodies {
  room: Room;
  obstacles: readonly Rect[];
}

/** The largest side any enemy's feet box can have, px: a champion's scaled up (032), a boss's its own. */
const LARGEST_FEET = Math.max(...Object.values(ENEMIES).map((d) => Math.max(d.feetBox.w, d.feetBox.h) * (d.boss ? 1 : CHAMPIONS.scale)));

/**
 * Bodies further apart than this on both axes at the tick's start can't be touching by the time their pair comes up,
 * px: twice two of the largest feet boxes side by side, room for any two to touch plus the pushes in between (053: the
 * round world's many packs made the all-pairs check the tick's biggest cost).
 */
export const NEAR = 4 * LARGEST_FEET;

/** Every pair (i < j) of same-room enemies within NEAR on both axes, in array order, found through a grid of NEAR cells. */
function nearPairs(enemies: readonly EnemyState[]): [number, number][] {
  const cells = new Map<string, number[]>();
  const cellOf = (e: EnemyState, dx: number, dy: number) => `${e.roomId}|${Math.floor(e.x / NEAR) + dx}|${Math.floor(e.y / NEAR) + dy}`;
  enemies.forEach((e, i) => {
    const key = cellOf(e, 0, 0);
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  });
  const pairs: [number, number][] = [];
  enemies.forEach((a, i) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of cells.get(cellOf(a, dx, dy)) ?? []) {
          const b = enemies[j];
          if (j > i && b && Math.abs(b.x - a.x) <= NEAR && Math.abs(b.y - a.y) <= NEAR) pairs.push([i, j]);
        }
      }
    }
  });
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

/**
 * Pushes overlapping enemies in the same room apart along the axis of least overlap,
 * half each. If a wall stops one, the other takes the rest. Runs in array order, so
 * it's deterministic; only pairs near each other at the start are tried (053), in the same order.
 */
export function separate(enemies: EnemyState[], bodies: (roomId: string) => RoomBodies): void {
  for (const [i, j] of nearPairs(enemies)) {
    const a = enemies[i];
    const b = enemies[j];
    if (!a || !b || a.roomId !== b.roomId || passesThrough(a) || passesThrough(b)) continue;
    const { room, obstacles } = bodies(a.roomId);
    const fa = defOf(a).feetBox;
    const fb = defOf(b).feetBox;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const ox = (fa.w + fb.w) / 2 - Math.abs(dx);
    const oy = (fa.h + fb.h) / 2 - Math.abs(dy);
    if (ox <= 0 || oy <= 0) continue;
    if (ox <= oy) pushApart(room, obstacles, a, b, ox, dx < 0 ? -1 : 1, 0);
    else pushApart(room, obstacles, a, b, oy, 0, dy < 0 ? -1 : 1);
  }
}

function pushApart(
  room: Room,
  obstacles: readonly Rect[],
  a: EnemyState,
  b: EnemyState,
  amount: number,
  ux: number,
  uy: number,
): void {
  const boxA = defOf(a).feetBox;
  const boxB = defOf(b).feetBox;
  const movedA = shove(room, obstacles, a, boxA, -ux * (amount / 2), -uy * (amount / 2));
  const movedB = shove(room, obstacles, b, boxB, ux * (amount - movedA), uy * (amount - movedA));
  const left = amount - movedA - movedB;
  if (left > 0) shove(room, obstacles, a, boxA, -ux * left, -uy * left);
}

/** Moves a body and returns how far it actually went. */
function shove(
  room: Room,
  obstacles: readonly Rect[],
  e: EnemyState,
  box: { w: number; h: number },
  dx: number,
  dy: number,
): number {
  const x = e.x;
  const y = e.y;
  moveBox(room, e, box, dx, dy, obstacles);
  return Math.hypot(e.x - x, e.y - y);
}
