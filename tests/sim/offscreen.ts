import { inAggroBox } from '../../src/sim/aiCommon';
import { aggro, createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { Command } from '../../src/sim/input';
import type { SimState } from '../../src/sim/state';
import { HALL, PLAYER_AT, run } from './fight';

// 073's test code: enemies staged awake round the meadow's player, and a step that says whether an enemy started a
// wind-up and whether it was on screen as it thought. The ground below PLAYER_AT is open for 300 px (clear to feet and
// shots), so "just off screen" is below the player.

/** An enemy `dx`, `dy` px from the meadow's player, awake (chasing), in a pack. */
export function stage(s: SimState, enemyId: string, dx: number, dy: number, group = 'pack'): EnemyState {
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, group);
  aggro(e);
  s.enemies.push(e);
  return e;
}

/** What one tick did for an enemy: whether it started a wind-up, and whether it stood on screen as it thought. */
export interface Watched {
  started: boolean;
  seen: boolean;
}

/**
 * Steps one tick, watching every enemy. An enemy thinks from where the last tick left it, after the player has moved,
 * so "on screen" is its position before the tick against the player's after.
 */
export function stepWatch(s: SimState, c: Partial<Command> = {}): Map<EnemyState, Watched> {
  const before = new Map(s.enemies.map((e) => [e, { x: e.x, y: e.y, roomId: e.roomId, mode: e.mode }]));
  run(s, 1, c);
  const out = new Map<EnemyState, Watched>();
  for (const [e, b] of before) {
    const started = e.mode === 'windup' && b.mode !== 'windup';
    out.set(e, { started, seen: b.roomId === s.roomId && inAggroBox(b, s.player) });
  }
  return out;
}

/** Runs `ticks` ticks watching `e`; returns how many wind-ups it started, failing if one started off screen. */
export function watchHeld(s: SimState, e: EnemyState, ticks: number): number {
  let starts = 0;
  for (let t = 0; t < ticks; t++) {
    const w = stepWatch(s).get(e);
    if (!w?.started) continue;
    if (!w.seen) throw new Error(`${e.enemyId} started a wind-up off screen at tick ${t + 1}`);
    starts += 1;
  }
  return starts;
}
