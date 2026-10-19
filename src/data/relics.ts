import type { GearSlot, GearWeight } from './gear';
import { GEAR_SPRITES } from './gearAssets';
import { GEAR_SOUNDS } from './gearSounds';

// Relics (036): their own tier above Rare, each one rule (a flag the sim reads) plus
// RELIC_AFFIXES rolled affixes. A short list on purpose (design pillar 4). No relic
// deals damage or touches the factory, the haul or pickups. All four ship for the
// playtest; Shaun may edit them after. Numbers are starting values.

/** The rule a relic bends: Rollbreaker's stagger, Wardstone's ward, Featherplate's light heavy plate, Last Ember's save. */
export type RelicRule = 'stagger' | 'ward' | 'feather' | 'ember';

interface RelicBase {
  id: string;
  name: string;
  slot: GearSlot;
  /** A body relic's weight; null for the others. */
  weight: GearWeight | null;
  /** Its rule in one line, for the bench. */
  text: string;
  /** Its icon (GEAR_SPRITES), and the sound its rule plays when it acts (GEAR_SOUNDS), or null for none. */
  icon: string;
  sound: string | null;
}

export interface RollbreakerDef extends RelicBase {
  rule: 'stagger';
  /** Ticks a staggered enemy holds in recovery, its wind-up cancelled. */
  staggerTicks: number;
}

export interface WardstoneDef extends RelicBase {
  rule: 'ward';
  /** Ticks without taking a hit before the next hit is blocked (360: 6 s). */
  wardTicks: number;
}

export interface FeatherplateDef extends RelicBase {
  rule: 'feather';
  /** Its walk speed multiplier in place of heavy armor's. */
  walkScale: number;
  /** Its roll's distance, as a share of the roll's distance with every bonus. */
  rollScale: number;
}

export interface LastEmberDef extends RelicBase {
  rule: 'ember';
  /** Hit invulnerability after the save, ticks. */
  saveInvulnTicks: number;
}

export type RelicDef = RollbreakerDef | WardstoneDef | FeatherplateDef | LastEmberDef;

export const ROLLBREAKER: RollbreakerDef = {
  id: 'rollbreaker-greaves',
  name: 'Rollbreaker Greaves',
  slot: 'boots',
  weight: null,
  rule: 'stagger',
  text: 'Rolling through an enemy staggers it',
  icon: GEAR_SPRITES.relicRollbreaker,
  sound: null,
  staggerTicks: 40,
};

export const WARDSTONE: WardstoneDef = {
  id: 'wardstone-circlet',
  name: 'Wardstone Circlet',
  slot: 'helm',
  weight: null,
  rule: 'ward',
  text: 'After 6 s unhit, blocks the next hit',
  icon: GEAR_SPRITES.relicWardstone,
  sound: GEAR_SOUNDS.wardBreak,
  wardTicks: 360,
};

export const FEATHERPLATE: FeatherplateDef = {
  id: 'featherplate',
  name: 'Featherplate',
  slot: 'body',
  weight: 'heavy',
  rule: 'feather',
  text: 'Heavy plate without the slow; a shorter roll',
  icon: GEAR_SPRITES.relicFeatherplate,
  sound: null,
  walkScale: 1,
  rollScale: 0.75,
};

export const LAST_EMBER: LastEmberDef = {
  id: 'last-ember',
  name: 'Last Ember',
  slot: 'trinket',
  weight: null,
  rule: 'ember',
  text: 'Once a trip, a killing hit leaves you on 1 HP',
  icon: GEAR_SPRITES.relicEmber,
  sound: GEAR_SOUNDS.emberSave,
  saveInvulnTicks: 60,
};

/** Every relic, picked evenly when a piece identifies as one. */
export const RELICS: readonly RelicDef[] = [ROLLBREAKER, WARDSTONE, FEATHERPLATE, LAST_EMBER];

/** A relic by id. Throws on an unknown id. */
export function relicDef(id: string): RelicDef {
  const r = RELICS.find((d) => d.id === id);
  if (!r) throw new Error(`Unknown relic '${id}'`);
  return r;
}
