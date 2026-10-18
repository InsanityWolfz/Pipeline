import { TILE_SIZE } from '../data/config';
import { STARTING_INVENTORY } from '../data/player';
import { DEFAULT_ROOM, ROOMS, type Room } from '../data/rooms';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { GroundItem } from './drops';
import { createEnemy, type EnemyState } from './enemies';
import { createEvents, type SimEvents } from './events';
import type { HarvestState } from './harvest';
import type { Inventory } from './inventory';
import { createNodes, type NodeState } from './nodes';
import { createPlayer, type PlayerState } from './player';
import { createRng, type RngState } from './rng';
import { tileCentre } from './tiles';
import { createTube, type TubeState } from './tube';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
  roomId: string;
  player: PlayerState;
  inventory: Inventory;
  tube: TubeState;
  /** Straight shots in flight: arrows and ley bolts. */
  arrows: ArrowState[];
  /** Id for the next arrow fired. */
  nextArrowId: number;
  /** Live enemies. */
  enemies: EnemyState[];
  /** Id for the next enemy created. Never reused, so render can pool by id. */
  nextEnemyId: number;
  /** Items lying on the ground. */
  groundItems: GroundItem[];
  nextGroundItemId: number;
  /** Gathering nodes. */
  nodes: NodeState[];
  /** The harvest in progress, if any. */
  harvest: HarvestState | null;
  /** Bombs in flight. */
  bombs: BombState[];
  nextBombId: number;
  /** Item ids hand-crafted at least once, sorted. Kept through a KO; 006 unlocks machines from it. */
  crafted: string[];
  /** What happened on the last tick. */
  events: SimEvents;
}

export function createSim(seed: number, roomId = DEFAULT_ROOM): SimState {
  const state: SimState = {
    tick: 0,
    seed,
    rng: createRng(seed),
    roomId,
    player: createPlayer({ x: 0, y: 0 }),
    inventory: {},
    tube: createTube(),
    arrows: [],
    nextArrowId: 0,
    enemies: [],
    nextEnemyId: 0,
    groundItems: [],
    nextGroundItemId: 0,
    nodes: [],
    harvest: null,
    bombs: [],
    nextBombId: 0,
    crafted: [],
    events: createEvents(),
  };
  resetRoom(state);
  return state;
}

/**
 * Puts the room back to its start: player at spawn with full health, the starting
 * inventory, an empty tube on its starting ammo, enemies at home, nodes at full,
 * and nothing harvesting, on the ground or in flight. The tick, seed, RNG, id
 * counters and the crafted set carry on.
 */
export function resetRoom(state: SimState): void {
  const room = roomOf(state);
  state.player = createPlayer(tileCentre(room.spawn));
  state.inventory = { ...STARTING_INVENTORY };
  state.tube = createTube();
  state.arrows = [];
  state.groundItems = [];
  state.nodes = createNodes(room);
  state.harvest = null;
  state.bombs = [];
  state.enemies = (room.enemies ?? []).map((p) => createEnemy(state.nextEnemyId++, p.enemyId, tileCentre(p)));
}

export { tileCentre } from './tiles';

/** A room's size in pixels. */
export function roomSize(room: Room): { width: number; height: number } {
  return { width: (room.rows[0]?.length ?? 0) * TILE_SIZE, height: room.rows.length * TILE_SIZE };
}

/** The room data the sim is in. Throws on an unknown id. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  const room = ROOMS[state.roomId];
  if (!room) throw new Error(`Unknown room '${state.roomId}'`);
  return room;
}
