import type { Facing } from './player';

// What happened on the last tick, for render effects and tests. Cleared at the
// start of every tick, so render collects them after each step.

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

export interface SimEvents {
  hits: HitEvent[];
  deaths: DeathEvent[];
  pickups: PickupEvent[];
  /** The player was KO'd and the room reset this tick. */
  ko: boolean;
}

export function createEvents(): SimEvents {
  return { hits: [], deaths: [], pickups: [], ko: false };
}

export function clearEvents(events: SimEvents): void {
  events.hits.length = 0;
  events.deaths.length = 0;
  events.pickups.length = 0;
  events.ko = false;
}
