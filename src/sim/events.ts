import type { DamageType } from '../data/ammo';
import type { GateId } from '../data/rooms';
import type { ArmorPiece } from './armor';
import type { PlaceFail } from './pieces';
import type { Facing } from './player';

// What happened on the last tick, for render effects and tests. Cleared at the
// start of every tick, so render collects them after each step. Crafts happen
// between ticks and land in the list of the tick before.

export type HitEvent =
  | { target: 'enemy'; id: number; x: number; y: number; damage: number; damageType: DamageType }
  | { target: 'player'; x: number; y: number; damage: number };

export interface DeathEvent {
  id: number;
  enemyId: string;
  x: number;
  y: number;
  facing: Facing;
}

export interface PickupEvent {
  id: number;
  itemId: string;
  x: number;
  y: number;
}

/** A node gave an item: its state id, node type and position. */
export interface HarvestEvent {
  id: number;
  nodeId: string;
  itemId: string;
  x: number;
  y: number;
}

export interface BurstEvent {
  x: number;
  y: number;
  radius: number;
}

export interface SimEvents {
  hits: HitEvent[];
  deaths: DeathEvent[];
  pickups: PickupEvent[];
  harvests: HarvestEvent[];
  crafts: { recipeId: string }[];
  craftFails: { recipeId: string }[];
  bursts: BurstEvent[];
  selects: { ammoId: string }[];
  /** The player walked through a door. */
  roomChanges: { from: string; to: string }[];
  places: { id: number; pieceId: string; tx: number; ty: number; facing: Facing }[];
  placeFails: { pieceId: string; tx: number; ty: number; reason: PlaceFail }[];
  /** A piece was picked up, and the items it held went into the inventory. */
  pickUps: { id: number; pieceId: string; items: Record<string, number> }[];
  deposits: { id: number; itemId: string; count: number }[];
  /** A crate was emptied into the inventory. */
  crateTakes: { id: number; items: Record<string, number> }[];
  /** A hopper was emptied back into the inventory. */
  withdraws: { id: number; itemId: string; count: number }[];
  /** The tube attuned to the foundry (once ever). */
  attunes: Record<string, never>[];
  /** A tube socket put a round in the reservoir. */
  refills: { id: number; itemId: string }[];
  /** A projectile left the tube's mouth (a spread fires several at once). */
  shots: { x: number; y: number; ammoId: string }[];
  /** E at a pylon whose room still has enemies. */
  sealed: { roomId: string }[];
  /** A room was claimed. */
  claims: { roomId: string }[];
  /** The haul went into the stash from a claimed pylon. */
  stashDeposits: { items: Record<string, number> }[];
  /** Items came out of the stash. */
  stashTakes: { items: Record<string, number> }[];
  /** Fast travel by pylon or waystone (also recorded as a room change). */
  travels: { from: string; to: string }[];
  /** An unidentified piece was identified at the bench (010). */
  identifies: ArmorPiece[];
  /** The worn piece changed (null: taken off). */
  equips: { id: number | null }[];
  /** The tube was taken from its stone (012). */
  tubeTaken: boolean;
  /** A tutorial gate opened. */
  gates: { gate: GateId }[];
  /** An objective completed (index into OBJECTIVES). */
  objectives: { index: number }[];
  /** A gravity stager turned to a new angle. */
  angles: { id: number; angle: number }[];
  /** What the player carried was banked (on entering the foundry or depositing). */
  banks: Record<string, number>[];
  /** On a KO, what was lost: item id to count. */
  lost: Record<string, number>;
  /** The player was KO'd and the room reset this tick. */
  ko: boolean;
}

export function createEvents(): SimEvents {
  return {
    hits: [],
    deaths: [],
    pickups: [],
    harvests: [],
    crafts: [],
    craftFails: [],
    bursts: [],
    selects: [],
    roomChanges: [],
    places: [],
    placeFails: [],
    pickUps: [],
    deposits: [],
    crateTakes: [],
    withdraws: [],
    attunes: [],
    refills: [],
    angles: [],
    tubeTaken: false,
    gates: [],
    objectives: [],
    identifies: [],
    equips: [],
    sealed: [],
    claims: [],
    stashDeposits: [],
    stashTakes: [],
    travels: [],
    shots: [],
    banks: [],
    lost: {},
    ko: false,
  };
}

export function clearEvents(events: SimEvents): void {
  events.hits.length = 0;
  events.deaths.length = 0;
  events.pickups.length = 0;
  events.harvests.length = 0;
  events.crafts.length = 0;
  events.craftFails.length = 0;
  events.bursts.length = 0;
  events.selects.length = 0;
  events.roomChanges.length = 0;
  events.places.length = 0;
  events.placeFails.length = 0;
  events.pickUps.length = 0;
  events.deposits.length = 0;
  events.crateTakes.length = 0;
  events.withdraws.length = 0;
  events.attunes.length = 0;
  events.refills.length = 0;
  events.angles.length = 0;
  events.tubeTaken = false;
  events.gates.length = 0;
  events.objectives.length = 0;
  events.identifies.length = 0;
  events.equips.length = 0;
  events.sealed.length = 0;
  events.claims.length = 0;
  events.stashDeposits.length = 0;
  events.stashTakes.length = 0;
  events.travels.length = 0;
  events.shots.length = 0;
  events.banks.length = 0;
  events.lost = {};
  events.ko = false;
}
