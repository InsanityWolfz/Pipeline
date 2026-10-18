import type { PlaceFail } from './pieces';
import type { Facing } from './player';

// What happened on the last tick, for render effects and tests. Cleared at the
// start of every tick, so render collects them after each step. Crafts happen
// between ticks and land in the list of the tick before.

export type HitEvent =
  | { target: 'enemy'; id: number; x: number; y: number; damage: number }
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
  refills: { id: number; ammoId: string }[];
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
  events.ko = false;
}
