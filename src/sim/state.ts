import { DEFAULT_START, type StartDef } from '../data/player';
import { createPopulation, type PopulationState } from './population';
import type { GearPiece, GearSlot } from '../data/gear';
import { NOTHING_WORN } from './gear';
import { TALENT_START } from '../data/talents';
import type { Pool } from './keystones';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { GroundItem } from './drops';
import { type EnemyState } from './enemies';
import { createEvents, type SimEvents } from './events';
import { createCaches, type CacheHold, type CacheState } from './cache';
import { startingFixtures, type FixtureState } from './fixtures';
import type { HarvestState } from './harvest';
import { createGates, foundIn, type Gates } from './tutorial';
import { REVEALING_ITEMS } from '../data/recipes';
import { HOLLOWS } from '../data/hollows';
import { claim, type ClaimHold } from './claims';
import { createMines, type MinesState } from './mines';
import { OBJECTIVES } from '../data/objectives';
import type { OrbState } from './orbs';
import type { FloodPool } from './floodPools';
import type { Strike } from './strikes';
import type { Inventory } from './inventory';
import { createLink, type LinkState } from './link';
import { type NodeState } from './nodes';
import { createFoundry, type FoundryState } from './pieces';
import { createPlayer, type PlayerState } from './player';
import { createRng, type RngState } from './rng';
import { createTube, type TubeState } from './tube';
import { createResearch, type ResearchState } from './research';
import type { EnemyBombState } from './enemyBombs';
import { type SummoningState } from './altar';
import { noteCarried } from './knownRounds';
import { createHotbar, type HotbarState } from './hotbar';
import { noteBag } from './bag';
import { resetWorld } from './resetWorld';
import type { SandboxState } from './sandbox';
import { createSubSteps, type SubStepState } from './subSteps';
import { createFog } from './fog';
import type { Blueprint } from './blueprints';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
  /** The room the player is in. Everything else carries its own room. */
  roomId: string;
  player: PlayerState;
  inventory: Inventory;
  /** 047: the grid inventory's order of kinds (src/sim/bag.ts): the stacks are the inventory's counts in this order. */
  bag: string[];
  /** 047: the carried bar (keys 1–5), its slots' kinds and the selected one. Kept through a KO (047.3). */
  hotbar: HotbarState;
  tube: TubeState;
  /** The tube's link to the foundry and the intake's entrances (024). Kept through a KO. */
  link: LinkState;
  /** Each research node's state (033): hidden, revealed or restored. Kept through a KO. */
  research: ResearchState;
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
  /** Armed landmines and bomblets on their way (038). */
  mines: MinesState;
  /** The Bulwark's bombs on the ground, fuses burning (034). */
  enemyBombs: EnemyBombState[];
  nextEnemyBombId: number;
  /** Region bosses killed at least once (034), in order. Kept through a KO: they never respawn but by their altar. */
  bossDefeats: string[];
  /** Region bosses summoned at their altar and still living (034). Kept through a KO, so the offering is never lost. */
  summoned: string[];
  /** A summon rising at an altar (034), or null. */
  summoning: SummoningState | null;
  /** Item ids hand-crafted at least once, sorted. Kept through a KO; it unlocks machines. */
  crafted: string[];
  /** Rounds ever carried (040.2: the Build tab's known rounds), in the order first carried. Kept through a KO. */
  carried: string[];
  /** Items that reveal recipes once carried (038: ley-iron), in the order found. Kept through a KO. */
  found: string[];
  /** The buildable grid in the foundry room. Kept through a KO. */
  foundry: FoundryState;
  /** 063: saved blueprints, in slot order (up to BLUEPRINT_SLOTS). Kept through a KO, and saved. */
  blueprints: Blueprint[];
  /** Wisp orbs in flight (009). */
  orbs: OrbState[];
  nextOrbId: number;
  /** The Forgewright's Forge Flood pools on the ground (060). */
  floodPools: FloodPool[];
  /** 064: strikes from above waiting to land (the Conductor's storm call). */
  strikes: Strike[];
  /** Rooms claimed at their pylon (009). Kept through a KO. */
  claims: string[];
  /** 072: the return stones woken, by id, in the order woken. Kept through a KO. */
  returnStones: string[];
  /** The claim in progress, if any. */
  claimHold: ClaimHold | null;
  /** Landmark ids seen at least once (032), in the order found. Kept through a KO. */
  discovered: string[];
  /** 051 (B.5): the minimap's fog of war, overworld tiles once on screen, 32 to a number (src/sim/fog.ts). Kept through a KO. */
  fog: number[];
  /** Each Ruined Cache (032): the tick it was opened, or null while it's full. Kept through a KO (no refill). */
  caches: CacheState[];
  /** Opening a cache in progress (032), if any. */
  cacheHold: CacheHold | null;
  /** Ticks left on a pylon's activation (cosmetic). */
  activatePulse: number;
  /** The foundry's fixed furniture (stash, and what claims add). Kept through a KO. */
  fixtures: FixtureState[];
  /** What pylon deposits have sent home. Kept through a KO. */
  stash: Inventory;
  /** Identified gear (036). Kept through a KO. */
  gear: GearPiece[];
  nextGearId: number;
  /** The worn piece's id in each slot, or null (036). Kept through a KO. */
  equipped: Record<GearSlot, number | null>;
  /** 037: the level (from 1), XP toward the next, unspent talent points and the taken talents (the centre start always). Kept through a KO. */
  level: number;
  xp: number;
  talentPoints: number;
  talents: string[];
  /** Bomb blasts' Pool (037: Blastfletch), and the id for the next. */
  pools: Pool[];
  nextPoolId: number;
  /**
   * Bosses killed at least once (037), the Warden included: only the first kill gives a boss's full XP. 034's
   * `bossDefeats` holds only region bosses with altars, and its goals and altars read it, so this is its own list.
   * Kept through a KO.
   */
  killedBosses: string[];
  /** The player holds the tube (012); without it nothing fires. Kept through a KO. */
  hasTube: boolean;
  /** The tutorial's gates (012), true once open. Kept through a KO. */
  gates: Gates;
  /** An entrance has filled from a line at least once (058's "Wait for the tube to fill with arrows"). */
  firstLineFull: boolean;
  /** 067: the ruin field's pack has been killed to its last Husk once. Kept through a KO (the pack comes back; this stays). */
  fieldCleared: boolean;
  /** The overworld's living population is out (017; 067: from the ruin field's clearing on), or from a populated start. Kept through a KO. */
  populated: boolean;
  /** The population's pack slots (017). */
  population: PopulationState;
  /** How many of each item machines have made (027), for the foundry steps; hand crafts never count. Kept through a KO. */
  machineMade: Record<string, number>;
  /** Raw materials ever harvested, for the gathering objective. */
  gathered: string[];
  /** Which objectives are done, in OBJECTIVES order. */
  objectives: boolean[];
  /** 051 (B.3): the raws the current craft goal has lacked, for its sub-lines. */
  subSteps: SubStepState;
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
  /** 044: the sandbox's own state (`?sandbox` only; src/sim/sandbox.ts). Absent in every real game, so never in a save. */
  sandbox?: SandboxState;
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
    bag: [],
    hotbar: createHotbar(),
    tube: createTube(),
    link: { ...createLink(), attuned: start.attuned },
    research: createResearch(),
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
    mines: createMines(),
    enemyBombs: [],
    nextEnemyBombId: 0,
    bossDefeats: [],
    summoned: [],
    summoning: null,
    crafted: [...start.crafted],
    carried: [],
    found: REVEALING_ITEMS.filter((id) => (start.found ?? []).includes(id) || foundIn(start.inventory).includes(id)),
    foundry: createFoundry(),
    blueprints: [],
    orbs: [],
    nextOrbId: 0,
    floodPools: [],
    strikes: [],
    claims: [],
    returnStones: [...(start.returnStones ?? [])],
    claimHold: null,
    discovered: [],
    fog: createFog(),
    caches: createCaches(),
    cacheHold: null,
    activatePulse: 0,
    fixtures: startingFixtures(),
    stash: {},
    gear: (start.gear ?? []).map((g) => structuredClone(g)),
    nextGearId: Math.max(0, ...(start.gear ?? []).map((g) => g.id + 1)),
    equipped: { ...NOTHING_WORN },
    level: 1,
    xp: 0,
    talentPoints: 0,
    talents: [TALENT_START],
    killedBosses: [],
    pools: [],
    nextPoolId: 0,
    firstHuskDropped: false,
    banked: { ...start.inventory },
    hasTube: start.hasTube,
    gates: createGates(start.gatesOpen),
    firstLineFull: false,
    fieldCleared: false,
    populated: start.populated,
    population: createPopulation(),
    machineMade: {},
    gathered: [],
    objectives: OBJECTIVES.map(() => false),
    subSteps: createSubSteps(),
    prototypeComplete: false,
    building: false,
    events: createEvents(),
  };
  resetWorld(state, roomId);
  noteCarried(state);
  noteBag(state);
  // A start's claims (034) are made before the first tick, as if long done: the barrier they drop is already down.
  for (const site of start.claims ?? []) claim(state, site);
  state.gates.hollows ||= state.claims.includes(HOLLOWS.opensOn);
  return state;
}

// 047: resetWorld moved to src/sim/resetWorld.ts (state.ts passed 300 lines); re-exported here, where systems import it.
export { resetWorld };
export { tileCentre } from './tiles';

// Room lookups live in src/sim/roomLookup.ts; re-exported here, where most systems import them from.
export { roomById, roomOf, roomSize } from './roomLookup';
