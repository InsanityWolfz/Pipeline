import { TILE_SIZE } from '../data/config';
import { DEFAULT_START, type StartDef } from '../data/player';
import { DEFAULT_ROOM, type Room } from '../data/rooms';
import { createPopulation, resetPopulation, type PopulationState } from './population';
import { WORLD } from './world';
import type { ArmorPiece } from './armor';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { GroundItem } from './drops';
import { createEnemy, type EnemyState } from './enemies';
import { createEvents, type SimEvents } from './events';
import type { ClaimHold } from './claims';
import { startingFixtures, type FixtureState } from './fixtures';
import type { HarvestState } from './harvest';
import { createGates, type Gates } from './tutorial';
import { OBJECTIVES } from '../data/objectives';
import type { OrbState } from './orbs';
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
  /** Wisp orbs in flight (009). */
  orbs: OrbState[];
  nextOrbId: number;
  /** Rooms claimed at their pylon (009). Kept through a KO. */
  claims: string[];
  /** The claim in progress, if any. */
  claimHold: ClaimHold | null;
  /** Ticks left on a pylon's activation (cosmetic). */
  activatePulse: number;
  /** The foundry's fixed furniture (stash, and what claims add). Kept through a KO. */
  fixtures: FixtureState[];
  /** What pylon deposits have sent home. Kept through a KO. */
  stash: Inventory;
  /** Identified armor (010). Kept through a KO. */
  armor: ArmorPiece[];
  nextArmorId: number;
  /** The worn piece's id, or null. */
  equipped: number | null;
  /** The player holds the tube (012); without it nothing fires. Kept through a KO. */
  hasTube: boolean;
  /** The tutorial's gates (012), true once open. Kept through a KO. */
  gates: Gates;
  /** The reservoir has filled from a line at least once (opens the shrine gate). */
  firstLineFull: boolean;
  /** The overworld's living population is out (017): from the first full line on, or from a populated start. Kept through a KO. */
  populated: boolean;
  /** The population's pack slots (017). */
  population: PopulationState;
  /** Raw materials ever harvested, for the gathering objective. */
  gathered: string[];
  /** Which objectives are done, in OBJECTIVES order. */
  objectives: boolean[];
  /** Ticks in a row outside the foundry with a line built into the intake, once every other goal is done. */
  awayTicks: number;
  /** Every objective done: the prototype's end. */
  prototypeComplete: boolean;
  /** What a death keeps (011): what the player held when they last entered the foundry or deposited at a pylon. */
  banked: Inventory;
  /** The first Husk ever killed has dropped its guaranteed armor. Kept through a KO. */
  firstHuskDropped: boolean;
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
  const start = options.start ?? DEFAULT_START;
  const roomId = options.roomId ?? start.room;
  const state: SimState = {
    tick: 0,
    seed,
    rng: createRng(seed),
    roomId,
    player: createPlayer({ x: 0, y: 0 }),
    inventory: { ...start.inventory },
    tube: createTube(),
    link: { ...createLink(), attuned: start.attuned },
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
    orbs: [],
    nextOrbId: 0,
    claims: [],
    claimHold: null,
    activatePulse: 0,
    fixtures: startingFixtures(),
    stash: {},
    armor: [],
    nextArmorId: 0,
    equipped: null,
    firstHuskDropped: false,
    banked: { ...start.inventory },
    hasTube: start.hasTube,
    gates: createGates(start.gatesOpen),
    firstLineFull: false,
    populated: start.populated,
    population: createPopulation(),
    gathered: [],
    objectives: OBJECTIVES.map(() => false),
    awayTicks: 0,
    prototypeComplete: false,
    building: false,
    events: createEvents(),
  };
  resetWorld(state, roomId);
  return state;
}

/**
 * Puts the world back to its start: player at the spawn room's spawn with full
 * health, the tube on its starting ammo, every
 * room's enemies at home and nodes at full, and nothing harvesting, on the
 * ground or in flight, and build mode off. The tick, seed, RNG, id counters,
 * the inventory (a death trims it first), the crafted set, the tube's link and
 * reservoir, claims, the stash, armor and the whole foundry carry on. Claimed rooms get no enemies back.
 */
export function resetWorld(state: SimState, spawnRoomId = DEFAULT_ROOM): void {
  const rooms = Object.values(WORLD);
  state.roomId = spawnRoomId;
  // The start's own spawn when waking in its room (017: the overworld has several), else the room's.
  const spawn = spawnRoomId === state.start.room ? state.start.spawn : roomOf(state).spawn;
  state.player = createPlayer(tileCentre(spawn));
  state.tube = createTube();
  state.arrows = [];
  state.groundItems = [];
  state.nodes = createNodes(rooms);
  state.harvest = null;
  state.bombs = [];
  state.orbs = [];
  state.claimHold = null;
  state.building = false;
  // A claimed site's guards are gone for good (017: a site is a group of the room's enemies).
  state.enemies = rooms.flatMap((room) =>
    (room.enemies ?? [])
      .filter((p) => !p.group || !state.claims.includes(p.group))
      .map((p) => createEnemy(state.nextEnemyId++, p.enemyId, tileCentre(p), room.id, p.group)),
  );
  resetPopulation(state);
}

export { tileCentre } from './tiles';

/** A room's size in pixels. */
export function roomSize(room: Room): { width: number; height: number } {
  return { width: (room.rows[0]?.length ?? 0) * TILE_SIZE, height: room.rows.length * TILE_SIZE };
}

/** Room data by id. Throws on an unknown id. */
export function roomById(roomId: string): Room {
  const room = WORLD[roomId];
  if (!room) throw new Error(`Unknown room '${roomId}'`);
  return room;
}

/** The room data the player is in. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  return roomById(state.roomId);
}
