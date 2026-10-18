import { enemyDef } from '../../src/data/enemies';
import { LOAD_TICKS, TUBE_CAPACITY } from '../../src/data/tube';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { createNode, type NodeState } from '../../src/sim/nodes';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';

// Fight scenarios in the ruin hall's open middle (rows 11–16 have no blocks).

export const SEED = 7;
export const HALL = 'ruin-hall';
export const HUSK = enemyDef('husk');

/** Where the player stands in an arena: the aggro box around it is all floor. */
export const PLAYER_AT = { x: 400, y: 448 } as const;

/** Ticks from a wind-up starting to its swipe landing (the wind-up tick counts as 1). */
export const SWIPE_LANDS = HUSK.swipe.windupTicks + 1;

/** The ruin hall with its own Husks and nodes cleared and the player at `at`. */
export function arena(seed = SEED, at: { x: number; y: number } = PLAYER_AT): SimState {
  const s = createSim(seed);
  s.enemies = [];
  s.nodes = [];
  movePlayer(s, at.x, at.y);
  return s;
}

export function movePlayer(s: SimState, x: number, y: number): void {
  s.player.x = x;
  s.player.y = y;
  s.player.aimX = x;
  s.player.aimY = y;
}

/** Adds a Husk whose home is where it stands, in the ruin hall unless told otherwise. */
export function placeHusk(s: SimState, x: number, y: number, roomId = HALL): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'husk', { x, y }, roomId);
  s.enemies.push(e);
  return e;
}

export const command = (c: Partial<Command> = {}): Command => ({ ...NO_COMMAND, ...c });

/** Steps with a command that may depend on the state; aim defaults to the player's last aim. */
export function run(s: SimState, ticks: number, c: Partial<Command> | ((s: SimState) => Partial<Command>) = {}): void {
  for (let i = 0; i < ticks; i++) {
    const partial = typeof c === 'function' ? c(s) : c;
    stepSim(s, command({ aimX: s.player.aimX, aimY: s.player.aimY, ...partial }));
  }
}

/** Fire held at a world point. */
export const fireAt = (x: number, y: number): Partial<Command> => ({ fire: true, aimX: x, aimY: y });

/** Taps load and waits until the tube is full. */
export function loadFull(s: SimState): void {
  run(s, 1, { load: true });
  run(s, LOAD_TICKS * TUBE_CAPACITY);
}

/** Runs until `done` holds, failing after `limit` ticks. Returns the ticks taken. */
export function runUntil(s: SimState, done: (s: SimState) => boolean, limit: number, c: Partial<Command> = {}): number {
  for (let i = 1; i <= limit; i++) {
    run(s, 1, c);
    if (done(s)) return i;
  }
  throw new Error(`condition not met in ${limit} ticks`);
}

/** Adds a gathering node standing at (x, y), in the ruin hall unless told otherwise. */
export function placeNode(s: SimState, nodeId: string, x: number, y: number, roomId = HALL): NodeState {
  const n = createNode(s.nodes.length, nodeId, { x, y }, roomId);
  s.nodes.push(n);
  return n;
}
