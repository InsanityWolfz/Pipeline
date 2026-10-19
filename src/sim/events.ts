import type { DamageType } from '../data/ammo';
import type { HealSource } from '../data/player';
import type { GateId } from '../data/rooms';
import type { GearPiece, GearSlot } from '../data/gear';
import type { PlaceFail } from './pieces';
import type { Facing } from './player';
import type { XpSource } from '../data/leveling';

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
  /** A champion died (032): 037 gives it more XP. */
  champion?: true;
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
  /** A Split round burst into shards where it hit (029). */
  splits: { x: number; y: number }[];
  /** Healing started or stopped (030), by source; a change of source stops one and starts the other. */
  heals: { source: HealSource; kind: 'start' | 'stop' }[];
  /** E at a pylon whose room still has enemies. */
  sealed: { site: string }[];
  /** A room was claimed. */
  claims: { site: string }[];
  /** A landmark was seen for the first time (032), once ever: 037 turns it into XP. */
  discoveries: { landmark: string }[];
  /** A Ruined Cache was opened (032): its landmark id and the reliquary's centre, px. */
  cacheOpens: { id: string; x: number; y: number }[];
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
  /** An unidentified piece was identified at the bench (010): the whole piece (036). */
  identifies: GearPiece[];
  /** What a slot wears changed (036; null: taken off). */
  equips: { slot: GearSlot; id: number | null }[];
  /** 036: a roll through an enemy stunned it (Rollbreaker Greaves); the Wardstone blocked a hit whole; Last Ember saved the player on 1 HP. Each where it happened, px. */
  stuns: { id: number; x: number; y: number }[];
  wardBlocks: { x: number; y: number }[];
  emberSaves: { x: number; y: number }[];
  /** The tube was taken from its stone (012). */
  tubeTaken: boolean;
  /** A tutorial gate opened. */
  gates: { gate: GateId }[];
  /** An objective completed (index into OBJECTIVES). */
  objectives: { index: number }[];
  /** An intake entrance was restored (033), so its cap lifts (024): its index into INTAKE.entrances. */
  intakeOpens: { entrance: number }[];
  /** A research node was restored at its diagram (033). */
  restores: { node: string }[];
  /** A schematic landed on the ground (033): which one, and where, px. Render shows it only as unknown. */
  schematicDrops: { itemId: string; x: number; y: number }[];
  /** A banked schematic revealed its node (033): the item and the node. */
  schematicReveals: { itemId: string; node: string }[];
  /** A straight shot or a punch hit a shield's front (034): the enemy and the hit point; render sparks brass and clangs. */
  blocked: { id: number; x: number; y: number }[];
  /** A region boss fell for the first time (034): it wakes its altar and is gone for good. */
  bossDefeats: { boss: string }[];
  /** An offering at an altar (034) summons its boss again: it rises after the summon. */
  summons: { altar: string; boss: string }[];
  /** The Bulwark lobbed its bombs (034): which enemy, how many. */
  lobs: { id: number; count: number }[];
  /** An enemy bomb burst where its circles met (034): its point and ring radius, px. */
  enemyBursts: { x: number; y: number; radius: number }[];
  /** The Bulwark pounded the ground round itself (034): which enemy, where, the radius, px. */
  pounds: { id: number; x: number; y: number; radius: number }[];
  /** 035: a Charger set off down its lane (its feet, the unit direction, the lane's length, px); a Burrower erupted (its spot and ring radius); a Sniper fired its bolt (its feet and the unit direction). */
  charges: { id: number; x: number; y: number; dx: number; dy: number; length: number }[];
  eruptions: { id: number; x: number; y: number; radius: number }[];
  snipes: { id: number; x: number; y: number; dx: number; dy: number }[];
  /** 037: XP gained (none counts at the level cap), a level reached, a talent taken, a respec at the foundry (the points it returned). */
  xp: { amount: number; source: XpSource }[];
  levelUps: { level: number }[];
  talents: { id: string }[];
  respecs: { refunded: number }[];
  /** 037's keystones: a bomb's Burst left a Pool (Blastfletch: its id, centre and radius, px); a pooled arrow burst on a hit; a ley bolt shattered a frozen enemy (Shatterpoint). */
  pools: { id: number; x: number; y: number; radius: number }[];
  poolBursts: { x: number; y: number; radius: number }[];
  shatters: { id: number; x: number; y: number }[];
  /** 038: a landmine landed and armed (its id and spot); an armed mine burst; a cluster bomb's bomblet burst (spot and radius, px). */
  mineArms: { id: number; x: number; y: number }[];
  mineBursts: BurstEvent[];
  bombletBursts: BurstEvent[];
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
    restores: [],
    schematicDrops: [],
    schematicReveals: [],
    tubeTaken: false,
    gates: [],
    objectives: [],
    identifies: [],
    equips: [],
    stuns: [],
    wardBlocks: [],
    emberSaves: [],
    sealed: [],
    claims: [],
    discoveries: [],
    cacheOpens: [],
    stashDeposits: [],
    stashTakes: [],
    supplies: [],
    portDeliveries: [],
    travels: [],
    shots: [],
    entranceFires: [],
    freezes: [],
    thaws: [],
    splits: [],
    heals: [],
    melees: [],
    blocked: [],
    bossDefeats: [],
    summons: [],
    lobs: [],
    enemyBursts: [],
    pounds: [],
    charges: [],
    eruptions: [],
    snipes: [],
    xp: [],
    levelUps: [],
    talents: [],
    respecs: [],
    pools: [],
    poolBursts: [],
    shatters: [],
    mineArms: [],
    mineBursts: [],
    bombletBursts: [],
    banks: [],
    lost: {},
    ko: false,
  };
}

export function clearEvents(events: SimEvents): void {
  // Every list empties; the two flags and the lost list reset.
  for (const value of Object.values(events)) if (Array.isArray(value)) value.length = 0;
  events.tubeTaken = false;
  events.lost = {};
  events.ko = false;
}
