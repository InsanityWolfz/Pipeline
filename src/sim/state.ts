import { TILE_SIZE } from '../data/config';
import { DEFAULT_START, type StartDef } from '../data/player';
import { DEFAULT_ROOM, ROOMS, type Room } from '../data/rooms';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { GroundItem } from './drops';
import { createEnemy, type EnemyState } from './enemies';
import { createEvents, type SimEvents } from './events';
import type { HarvestState } from './harvest';
import type { Inventory } from './inventory';
import { createLink, type LinkState } from './link';
import { createNodes, type NodeState } from './nodes';
import { createFoundry, type FoundryState } from './pieces';
import { createPlayer, type PlayerState } from './player';
import { createRng, type RngState } from './rng';
import { tileCentre } from './tiles';
import { createTube, type TubeState } from './tube';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
  /** The room the player is in. Everything else carries its own room. */
  roomId: string;
  player: PlayerState;
  inventory: Inventory;
  tube: TubeState;
  /** The tube's link to the foundry and its reservoir. Kept through a KO. */
  link: LinkState;
  /** How this run started; a KO restores its inventory. */
  start: StartDef;
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
  /** Gathering nodes in every room. */
  nodes: NodeState[];
  /** The harvest in progress, if any. */
  harvest: HarvestState | null;
  /** Bombs in flight. */
  bombs: BombState[];
  nextBombId: number;
  /** Item ids hand-crafted at least once, sorted. Kept through a KO; it unlocks machines. */
  crafted: string[];
  /** The buildable grid in the foundry room. Kept through a KO. */
  foundry: FoundryState;
  /** Build mode: only in the foundry; fire, load, ammo select and harvest are off. */
  building: boolean;
  /** What happened on the last tick. */
  events: SimEvents;
}

export interface SimOptions {
  /** The room the player starts in. */
  roomId?: string;
  /** The starting inventory and crafted set, e.g. the playtest start. */
  start?: StartDef;
}

export function createSim(seed: number, options: SimOptions = {}): SimState {
  const roomId = options.roomId ?? DEFAULT_ROOM;
  const start = options.start ?? DEFAULT_START;
  const state: SimState = {
    tick: 0,
    seed,
    rng: createRng(seed),
    roomId,
    player: createPlayer({ x: 0, y: 0 }),
    inventory: {},
    tube: createTube(),
    link: createLink(),
    start,
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
    crafted: [...start.crafted],
    foundry: createFoundry(),
    building: false,
    events: createEvents(),
  };
  resetWorld(state, roomId);
  return state;
}

/**
 * Puts the world back to its start: player at the spawn room's spawn with full
 * health, the starting inventory, the tube on its starting ammo, every
 * room's enemies at home and nodes at full, and nothing harvesting, on the
 * ground or in flight, and build mode off. The tick, seed, RNG, id counters,
 * the crafted set, the tube's link and reservoir, and the whole foundry carry on.
 */
export function resetWorld(state: SimState, spawnRoomId = DEFAULT_ROOM): void {
  const rooms = Object.values(ROOMS);
  state.roomId = spawnRoomId;
  state.player = createPlayer(tileCentre(roomOf(state).spawn));
  state.inventory = { ...state.start.inventory };
  state.tube = createTube();
  state.arrows = [];
  state.groundItems = [];
  state.nodes = createNodes(rooms);
  state.harvest = null;
  state.bombs = [];
  state.building = false;
  state.enemies = rooms.flatMap((room) =>
    (room.enemies ?? []).map((p) => createEnemy(state.nextEnemyId++, p.enemyId, tileCentre(p), room.id)),
  );
}

export { tileCentre } from './tiles';

/** A room's size in pixels. */
export function roomSize(room: Room): { width: number; height: number } {
  return { width: (room.rows[0]?.length ?? 0) * TILE_SIZE, height: room.rows.length * TILE_SIZE };
}

/** Room data by id. Throws on an unknown id. */
export function roomById(roomId: string): Room {
  const room = ROOMS[roomId];
  if (!room) throw new Error(`Unknown room '${roomId}'`);
  return room;
}

/** The room data the player is in. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  return roomById(state.roomId);
}
