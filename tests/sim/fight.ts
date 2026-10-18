import { DYING_TICKS } from '../../src/data/player';
import { meleeDef } from '../../src/data/enemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { createNode, type NodeState } from '../../src/sim/nodes';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { tileCentre } from '../../src/sim/tiles';

// Fight scenarios in the overworld's meadow (017): open ground beside the ruin field, the sandbox start.

export const SEED = 7;
/** The room fights happen in (the overworld since 017; the name stays from the ruin hall). */
export const HALL = OVERWORLD_ROOM;
export const HUSK = meleeDef('husk');

/** Where the player stands in an arena: the meadow's centre, open ground well past the aggro box sideways. */
export const PLAYER_AT = tileCentre(OVERWORLD.field);

/** Ticks from a wind-up starting to its swipe landing (the wind-up tick counts as 1). */
export const SWIPE_LANDS = HUSK.swipe.windupTicks + 1;

/** The overworld with its own enemies and nodes cleared and the player at `at`. */
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

/** Runs until a KO lands (the death animation plays out first), failing past `limit` ticks. */
export function runUntilKo(s: SimState, limit = SWIPE_LANDS + DYING_TICKS + 5): number {
  return runUntil(s, (x) => x.events.ko, limit);
}

/** Drops the player to 0 health and runs out the death: they wake in the foundry. */
export function die(s: SimState): void {
  s.player.health = 0;
  runUntilKo(s, DYING_TICKS + 3);
}

/** The ruin hall's arena centre, where pre-017 tests measured from. */
const HALL_AT = { x: 400, y: 448 } as const;

/** A point given in the old ruin hall's coordinates, moved to the same spot relative to the meadow arena (017). */
export function at(x: number, y: number = HALL_AT.y): { x: number; y: number } {
  return { x: x - HALL_AT.x + PLAYER_AT.x, y: y - HALL_AT.y + PLAYER_AT.y };
}

/** Stands the player in the overworld one tile below the shrine's pylon (017: the shrine is a site there). */
export function atPylon(s: SimState): void {
  s.roomId = OVERWORLD_ROOM;
  const below = tileCentre({ tx: OVERWORLD.shrine.pylon.tx, ty: OVERWORLD.shrine.pylon.ty + 1 });
  movePlayer(s, below.x, below.y);
}

/** Stands the player on the tile in front of the foundry's stairs, so walking up goes down them (017). */
export function atEntrance(s: SimState): void {
  s.roomId = OVERWORLD_ROOM;
  const front = tileCentre(OVERWORLD.entrance.arrive);
  movePlayer(s, front.x, front.y);
}
