import type { DamageType } from '../data/ammo';
import type { HealSource } from '../data/player';
import type { GateId } from '../data/rooms';
import type { ArmorPiece } from './armor';
import type { PlaceFail } from './pieces';
import type { Facing } from './player';

// What happened on the last tick, for render effects and tests. Cleared at the
// start of every tick, so render collects them after each step. Crafts happen
// between ticks and land in the list of the tick before.

export type HitEvent =
  /** `melee` marks a punch's hit (023). */
  | { target: 'enemy'; id: number; x: number; y: number; damage: number; damageType: DamageType; melee?: true }
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

export interface MeleeEvent {
  x: number;
  y: number;
  angle: number;
  hits: number[];
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
  /** The foundry intake put a round in an entrance's reservoir (019, 024): `entrance` is an index into INTAKE.entrances. */
  refills: { entrance: number; itemId: string }[];
  /** A machine finished a craft (027): its piece id and kind, and what it made. Hand crafts are `crafts`. */
  made: { id: number; pieceId: string; itemId: string; count: number }[];
  /** A punch (023): where the player stood, its aim angle (radians), and the enemy ids it hit. */
  melees: MeleeEvent[];
  /** A projectile left the tube's mouth (a volley fires several at once). */
  shots: { x: number; y: number; ammoId: string }[];
  /** An intake entrance fired a round of the volley (028), by index into INTAKE.entrances. */
  entranceFires: { entrance: number; ammoId: string }[];
  /** A cold hit froze an enemy (029), and a frozen enemy thawed: its id and where it stood. */
  freezes: { id: number; x: number; y: number }[];
  thaws: { id: number; x: number; y: number }[];
  /** A star round burst into shards where it hit (029). */
  starBursts: { x: number; y: number }[];
  /** Healing started or stopped (030), by source; a change of source stops one and starts the other. */
  heals: { source: HealSource; kind: 'start' | 'stop' }[];
  /** E at a pylon whose room still has enemies. */
  sealed: { site: string }[];
  /** A room was claimed. */
  claims: { site: string }[];
  /** The haul went into the stash from a claimed pylon. */
  stashDeposits: { items: Record<string, number> }[];
  /** Items came out of the stash. */
  stashTakes: { items: Record<string, number> }[];
  /** A claimed site's supply port produced a raw (018): the render shows it harvested and sent home along the ley line. */
  supplies: { id: string; itemId: string }[];
  /** A piece took a raw from a supply port (028). */
  portDeliveries: { id: string; itemId: string }[];
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
  /** A warden core opened the intake's side entrances (024): the indexes into INTAKE.entrances it opened. */
  intakeOpens: { entrances: number[] }[];
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
    made: [],
    intakeOpens: [],
    tubeTaken: false,
    gates: [],
    objectives: [],
    identifies: [],
    equips: [],
    sealed: [],
    claims: [],
    stashDeposits: [],
    stashTakes: [],
    supplies: [],
    portDeliveries: [],
    travels: [],
    shots: [],
    entranceFires: [],
    freezes: [],
    thaws: [],
    starBursts: [],
    heals: [],
    melees: [],
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
  events.made.length = 0;
  events.intakeOpens.length = 0;
  events.tubeTaken = false;
  events.gates.length = 0;
  events.objectives.length = 0;
  events.identifies.length = 0;
  events.equips.length = 0;
  events.sealed.length = 0;
  events.claims.length = 0;
  events.stashDeposits.length = 0;
  events.stashTakes.length = 0;
  events.supplies.length = 0;
  events.portDeliveries.length = 0;
  events.travels.length = 0;
  events.shots.length = 0;
  events.entranceFires.length = 0;
  events.freezes.length = 0;
  events.thaws.length = 0;
  events.starBursts.length = 0;
  events.heals.length = 0;
  events.melees.length = 0;
  events.banks.length = 0;
  events.lost = {};
  events.ko = false;
}
