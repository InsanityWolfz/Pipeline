import { lobbedAmmo, straightAmmo } from '../../src/data/ammo';
import type { Ring } from '../../src/data/ringScale';
import { TILE } from '../../src/data/rooms';
import { HOMING } from '../../src/data/tags';
import { defOf } from '../../src/sim/champions';
import { aggro, createEnemy, type EnemyState } from '../../src/sim/enemies';
import { clearShot } from '../../src/sim/sightLine';
import { roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { feed, lines } from './builds';
import { arena, HALL, PLAYER_AT, run } from './fight';

// 041.9's four ammo scenarios (test code): one entrance fed with a family's plain round
// (Ley's is the Homing ley bolt, the Ley guide's round), no talents, nothing worn, and the
// player standing still with fire held on the nearest enemy (its body for a straight
// round, its feet for a lobbed one). Each scenario's enemies are placed by the harness
// and given their ring (041: their health and damage scale with it).

/** The families, by the round their entrance is fed. */
export const FAMILIES = { arrow: 'arrow', bomb: 'bomb', ley: 'ley-bolt+homing', mine: 'landmine' } as const;
export type Family = keyof typeof FAMILIES;

/** A scenario's enemies, placed in a fresh sim; `hold` runs each tick before the step (041.10's harness hold); `walls` are wall tiles the harness stands in the room for it. */
export interface Scenario {
  at: { x: number; y: number };
  place: (s: SimState) => EnemyState[];
  hold?: (s: SimState, placed: readonly EnemyState[]) => void;
  walls?: readonly { tx: number; ty: number }[];
}

/** Runs `fn` with wall tiles stood in the overworld's rows, put back after. */
export function withWalls<T>(walls: readonly { tx: number; ty: number }[], fn: () => T): T {
  const room = roomById(HALL) as { rows: readonly string[] };
  const before = room.rows;
  room.rows = before.map((row, ty) => [...row].map((c, tx) => (walls.some((w) => w.tx === tx && w.ty === ty) ? TILE.wall : c)).join(''));
  try {
    return fn();
  } finally {
    room.rows = before;
  }
}

/** An enemy placed by the harness in the player's room, given its ring (its health is its scaled max), and awake: it comes at the player from the start, on screen or not. */
export function ringed(s: SimState, enemyId: string, x: number, y: number, ring: Ring): EnemyState {
  const e = createEnemy(s.nextEnemyId++, enemyId, { x, y }, s.roomId);
  e.ring = ring;
  e.health = defOf(e).maxHealth;
  aggro(e);
  s.enemies.push(e);
  return e;
}

/** Ticks a family takes from its first round to the last death, or `cap` if it can't (a KO, or out of time). */
export function clearTicks(seed: number, scenario: Scenario, family: Family, cap: number): number {
  return withWalls(scenario.walls ?? [], () => fight(seed, scenario, family, cap));
}

function fight(seed: number, scenario: Scenario, family: Family, cap: number): number {
  const s = arena(seed, scenario.at);
  s.roomId = HALL;
  lines(s, FAMILIES[family]);
  const placed = scenario.place(s);
  let first = 0;
  for (let t = 1; t <= cap + first; t++) {
    feed(s);
    scenario.hold?.(s, placed);
    const p = s.player;
    const target = placed.filter((e) => s.enemies.includes(e)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const aim = target ? aimFor(s, family, target, placed) : null;
    // Fire is held once the target is in the round's reach (a lob's furthest landing, a straight round's range).
    const reach = Math.hypot((aim?.aimX ?? p.x) - p.x, (aim?.aimY ?? p.y) - p.y) <= REACH[family];
    run(s, 1, aim ? { fire: reach, ...aim } : {});
    if (first === 0 && s.events.shots.length > 0) first = t;
    if (placed.every((e) => !s.enemies.includes(e))) return t - first;
    if (s.player.dying > 0) return cap;
  }
  return cap;
}

/**
 * Where it aims: a lobbed round at the target's feet, a straight one at its body. A Homing bolt with a wall in the way
 * aims beside it instead, at the nearest point within its lock radius with a clear line, so it flies round and homes in
 * (as a player learns to).
 */
export function aimFor(s: SimState, family: Family, target: EnemyState, placed: readonly EnemyState[]): { aimX: number; aimY: number } {
  if (family === 'bomb' || family === 'mine') {
    // The middle of the group round the nearest one, as a player lobs into a crowd.
    const group = placed.filter((e) => s.enemies.includes(e) && Math.hypot(e.x - target.x, e.y - target.y) <= GROUP);
    return { aimX: group.reduce((n, e) => n + e.x, 0) / group.length, aimY: group.reduce((n, e) => n + e.y, 0) / group.length };
  }
  const body = { x: target.x, y: target.y + defOf(target).hurtbox.offsetY };
  const room = roomById(s.roomId);
  const p = s.player;
  if (family !== 'ley' || clearShot(room, p.x, p.y, body.x, body.y)) return { aimX: body.x, aimY: body.y };
  for (let r = 16; r < HOMING.lockRadius; r += 8) {
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      const x = body.x + Math.cos(a) * r;
      const y = body.y + Math.sin(a) * r;
      if (clearShot(room, p.x, p.y, x, y)) return { aimX: x, aimY: y };
    }
  }
  return { aimX: body.x, aimY: body.y };
}

/** How far each family's round reaches, px: a lob's furthest landing, a straight round's range. */
const REACH: Record<Family, number> = {
  arrow: straightAmmo(FAMILIES.arrow).range,
  bomb: lobbedAmmo(FAMILIES.bomb).maxRange,
  ley: straightAmmo(FAMILIES.ley).range,
  mine: lobbedAmmo(FAMILIES.mine).maxRange,
};

/** A lob aims at the middle of the enemies within this of the nearest one, px. */
const GROUP = 64;

/** The player's standing point for the open-ground scenarios: the meadow (017). */
export const MEADOW = PLAYER_AT;

/** A tile's centre. */
export const tile = (tx: number, ty: number): { x: number; y: number } => tileCentre({ tx, ty });
