import type { GearSlot, GearWeight } from './gear';
import type { ContentLine } from './lines';
import { GEAR_SPRITES } from './gearAssets';
import { GEAR_SOUNDS } from './gearSounds';

// Relics (036): their own tier above Rare, each one rule (a flag the sim reads) plus
// RELIC_AFFIXES rolled affixes. A short list on purpose (design pillar 4). No relic
// deals damage or touches the factory, the haul or pickups. All four ship for the
// playtest; Shaun may edit them after. Numbers are starting values.

/** The rule a relic bends: Rollbreaker's stun, Wardstone's ward, Featherplate's light heavy plate, Last Ember's save. */
export type RelicRule = 'stun' | 'ward' | 'feather' | 'ember';

interface RelicBase {
  id: string;
  name: string;
  slot: GearSlot;
  /** A body relic's weight; null for the others. */
  weight: GearWeight | null;
  /** Its rule in one line, for the bench. */
  text: string;
  /** What it does (039), each line naming one scope: its rule, and any stat it changes. A relic may bend a keyword (Q1). */
  lines: readonly ContentLine[];
  /** Its icon (GEAR_SPRITES), and the sound its rule plays when it acts (GEAR_SOUNDS), or null for none. */
  icon: string;
  sound: (typeof GEAR_SOUNDS)[keyof typeof GEAR_SOUNDS] | null;
}

export interface RollbreakerDef extends RelicBase {
  rule: 'stun';
  /** Ticks a stunned enemy holds in recovery, its wind-up cancelled. */
  stunTicks: number;
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
  /** The health a save leaves, and the hit invulnerability after it, ticks. */
  saveHealth: number;
  saveInvulnTicks: number;
}

export type RelicDef = RollbreakerDef | WardstoneDef | FeatherplateDef | LastEmberDef;

/** Each relic's numbers, read by its def and its lines alike. */
const STUN_TICKS = 40;
const WARD_TICKS = 360;
const FEATHER = { walkScale: 1, rollScale: 0.75 } as const;
const EMBER = { saveHealth: 1, saveInvulnTicks: 60 } as const;

export const ROLLBREAKER: RollbreakerDef = {
  id: 'rollbreaker-greaves',
  name: 'Rollbreaker Greaves',
  slot: 'boots',
  weight: null,
  rule: 'stun',
  text: 'Rolling through an enemy stuns it',
  icon: GEAR_SPRITES.relicRollbreaker,
  sound: null,
  stunTicks: STUN_TICKS,
  lines: [{ scope: 'you', rule: 'roll-stun', creates: 'stun', params: { duration: STUN_TICKS } }],
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
  wardTicks: WARD_TICKS,
  lines: [{ scope: 'you', rule: 'ward', params: { ward: WARD_TICKS } }],
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
  ...FEATHER,
  lines: [
    { scope: 'you', rule: 'no-heavy-slow', params: { walk: FEATHER.walkScale } },
    { scope: 'you', stat: 'roll-distance', op: 'mul', value: FEATHER.rollScale },
  ],
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
  ...EMBER,
  lines: [{ scope: 'you', rule: 'last-stand', params: { health: EMBER.saveHealth, invuln: EMBER.saveInvulnTicks } }],
};

/** Every relic, picked evenly when a piece identifies as one. */
export const RELICS: readonly RelicDef[] = [ROLLBREAKER, WARDSTONE, FEATHERPLATE, LAST_EMBER];

/** A relic by id. Throws on an unknown id. */
export function relicDef(id: string): RelicDef {
  const r = RELICS.find((d) => d.id === id);
  if (!r) throw new Error(`Unknown relic '${id}'`);
  return r;
}
