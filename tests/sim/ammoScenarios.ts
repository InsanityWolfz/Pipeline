import { lobbedAmmo, straightAmmo } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import type { Ring } from '../../src/data/ringScale';
import { TILE, type Room } from '../../src/data/rooms';
import { HOMING } from '../../src/data/tags';
import { defOf } from '../../src/sim/champions';
import { aggro, createEnemy, type EnemyState } from '../../src/sim/enemies';
import { clearShot } from '../../src/sim/sightLine';
import { roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
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

/**
 * Runs `fn` with the overworld swapped for a copy of it with wall tiles stood in its rows, the original put back after.
 * The shared room data is never written: only the world's entry points at the copy meanwhile.
 */
export function withWalls<T>(walls: readonly { tx: number; ty: number }[], fn: () => T): T {
  if (walls.length === 0) return fn();
  const world = WORLD as Record<string, Room>;
  const before = roomById(HALL);
  world[HALL] = { ...before, rows: before.rows.map((row, ty) => [...row].map((c, tx) => (walls.some((w) => w.tx === tx && w.ty === ty) ? TILE.wall : c)).join('')) };
  try {
    return fn();
  } finally {
    world[HALL] = before;
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

/** The longest a scenario runs, ticks: a family that can't finish in 60 s scores 60 s and never wins. */
export const CAP = 60 * TICK_RATE;
/** The winner's margin over the next: at least 10%. */
const MARGIN = 1.1;

/** The meadow's harness-built wall (041.9): a 3-tile segment, one column, 48 px east of the player. */
const WALL = [26, 27, 28].map((ty) => ({ tx: 82, ty }));

/** Keeps placed enemies coming at the player, on screen or not (they'd otherwise leash home off it). */
const keepComing = (_s: unknown, placed: readonly { offScreenTicks: number }[]): void => {
  for (const e of placed) e.offScreenTicks = 0;
};

/** 041.9's four scenarios. */
export const SCENARIOS: Record<'line' | 'cluster' | 'walls' | 'still', Scenario> = {
  // 5 ring 1 Husks single file, 24 px apart, the first 280 px off, walking straight at the player.
  line: { at: MEADOW, place: (s) => [0, 1, 2, 3, 4].map((i) => ringed(s, 'husk', MEADOW.x + 280 + i * 24, MEADOW.y, 1)), hold: keepComing },
  // 8 ring 2 Husks evenly round a 40 px ring, 240 px off, walking at the player.
  cluster: {
    at: MEADOW,
    place: (s) => Array.from({ length: 8 }, (_, i) => ringed(s, 'husk', MEADOW.x + 240 + Math.cos((i * Math.PI) / 4) * 40, MEADOW.y + Math.sin((i * Math.PI) / 4) * 40, 2)),
    hold: keepComing,
  },
  // 4 ring 2 Wisps 200 px off behind the wall, keeping their distance as Wisps do.
  walls: { at: MEADOW, walls: WALL, place: (s) => [-36, -12, 12, 36].map((dy) => ringed(s, 'wisp', MEADOW.x + 200, MEADOW.y + dy, 2)), hold: keepComing },
  // One ring 3 Shardback 150 px off, its shield facing the player, held in place (041.10).
  still: {
    at: MEADOW,
    place: (s) => {
      const e = ringed(s, 'shardback', MEADOW.x + 150, MEADOW.y, 3);
      e.angle = Math.PI;
      return [e];
    },
    hold: (_s, placed) => {
      for (const e of placed) {
        e.x = MEADOW.x + 150;
        e.y = MEADOW.y;
      }
    },
  },
};

/**
 * Whether `family` wins `scenario` on a seed: its time, and the first other family to finish within its time × 1.1
 * (none, if it wins). The others only run that long: past it, they've lost by the margin.
 */
export function wins(seed: number, scenario: Scenario, family: Family): { ticks: number; beaten: string | null } {
  const ticks = clearTicks(seed, scenario, family, CAP);
  // A family that never finishes (60 s) can't win, however the others do.
  if (ticks >= CAP) return { ticks, beaten: 'never finished' };
  const cut = Math.ceil(ticks * MARGIN);
  for (const other of Object.keys(FAMILIES) as Family[]) {
    if (other === family) continue;
    const t = clearTicks(seed, scenario, other, cut);
    if (t < cut) return { ticks, beaten: `${other} ${t}` };
  }
  return { ticks, beaten: null };
}
