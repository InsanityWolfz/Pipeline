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
  /** The player was KO'd and the room reset this tick. */
  ko: boolean;
}

export function createEvents(): SimEvents {
  return { hits: [], deaths: [], pickups: [], harvests: [], crafts: [], craftFails: [], bursts: [], selects: [], ko: false };
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
  events.ko = false;
}
