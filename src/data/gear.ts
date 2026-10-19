import type { StatLine, StatOp } from './lines';
import type { StatId } from './statDefs';

// Gear (036, replacing 010's single armor piece): four slots, a body piece light or
// heavy, rarity by affix count, defensive and utility affixes only, and relics as their
// own tier. Every number is a starting value from spec 036; tune in playtest.

/** The carried item a gear drop is until identified (its id is 010's; it shows as "Unidentified gear"). */
export const UNIDENTIFIED_ARMOR = 'unidentified-armor';

export type GearSlot = 'helm' | 'body' | 'boots' | 'trinket';
export type GearWeight = 'light' | 'heavy';
export type Rarity = 'common' | 'fine' | 'rare' | 'relic';
export type AffixKind = 'max-health' | 'armor' | 'regen' | 'move-speed' | 'roll-cooldown' | 'roll-distance';

/** One rolled affix: its kind and value in the kind's own units (see AFFIXES). */
export interface Affix {
  kind: AffixKind;
  value: number;
}

/** An identified piece of gear. `weight` is set for body pieces only; `relic` names a relic in RELICS, or null. */
export interface GearPiece {
  id: number;
  slot: GearSlot;
  rarity: Rarity;
  weight: GearWeight | null;
  baseArmor: number;
  affixes: Affix[];
  relic: string | null;
  name: string;
}

/** The slots, in the order the bench and the stats list them. */
export const GEAR_SLOTS: readonly GearSlot[] = ['helm', 'body', 'boots', 'trinket'];

/** Relative odds of each slot for a piece that isn't a relic (even to start). */
export const SLOT_WEIGHTS: Readonly<Record<GearSlot, number>> = { helm: 1, body: 1, boots: 1, trinket: 1 };

/** A base armor range, and for a body piece its walk speed multiplier. */
export interface BaseRange {
  min: number;
  max: number;
}

/**
 * Base armor per slot, and per weight for the body (heavy walks at ×0.85; the roll is unchanged). For scale: a Husk
 * swipe does 20, a Wisp orb 12, the Warden's slam 30.
 */
export const SLOT_BASE: {
  readonly helm: BaseRange;
  readonly boots: BaseRange;
  readonly trinket: BaseRange;
  readonly body: Readonly<Record<GearWeight, BaseRange & { walkScale: number }>>;
} = {
  helm: { min: 1, max: 2 },
  boots: { min: 1, max: 2 },
  trinket: { min: 0, max: 0 },
  body: {
    light: { min: 5, max: 7, walkScale: 1 },
    heavy: { min: 10, max: 13, walkScale: 0.85 },
  },
};

/** Chance (0..1) an identified body piece rolls heavy; otherwise it's light. */
export const HEAVY_CHANCE = 0.5;

/** Chance (0..1) an identified piece is a relic, checked before anything else. */
export const RELIC_CHANCE = 0.03;

/** Affixes a relic rolls beside its rule. */
export const RELIC_AFFIXES = 2;

/** Each rarity: its affix count, its relative odds among non-relics (a relic is RELIC_CHANCE, checked first), its name and palette colour. */
export const RARITIES: Readonly<Record<Rarity, { affixes: number; chance: number; name: string; color: string }>> = {
  common: { affixes: 1, chance: 0.6, name: 'Common', color: 'rock-light' },
  fine: { affixes: 2, chance: 0.3, name: 'Fine', color: 'cyan' },
  rare: { affixes: 3, chance: 0.1, name: 'Rare', color: 'gold-trim' },
  relic: { affixes: RELIC_AFFIXES, chance: 0, name: 'Relic', color: 'wisp-light' },
};

/**
 * Each affix kind (039): a stat line of scope You in its stat, rolled as a whole number of steps from `min` to `max`,
 * its value `steps × step` in the line's own terms: a flat max health (HP), armor or field regen (HP/s), or a +% of
 * move speed, roll cooldown (−10% to −20%, 039.9) or roll distance (+8% to +16%), whole percents so the text is exact.
 * rulesText words it: "+12 max health", "+0.5 HP/s field regen", "−15% roll cooldown".
 */
export const AFFIXES: Readonly<Record<AffixKind, { stat: StatId; op: StatOp; min: number; max: number; step: number }>> = {
  'max-health': { stat: 'max-health', op: 'flat', min: 8, max: 20, step: 1 },
  armor: { stat: 'armor', op: 'flat', min: 1, max: 3, step: 1 },
  regen: { stat: 'field-regen', op: 'flat', min: 3, max: 8, step: 0.1 },
  'move-speed': { stat: 'move-speed', op: 'add', min: 3, max: 6, step: 0.01 },
  'roll-cooldown': { stat: 'roll-cooldown', op: 'add', min: -20, max: -10, step: 0.01 },
  'roll-distance': { stat: 'roll-distance', op: 'add', min: 8, max: 16, step: 0.01 },
};

/** An affix as a content line (039): always scope You (affixes stay defensive), a stat line in its kind's stat. */
export function affixLine(a: Affix): StatLine {
  const d = AFFIXES[a.kind];
  return { scope: 'you', stat: d.stat, op: d.op, value: a.value };
}

/** The most the worn gear's move speed affixes add to walk speed, a fraction (+15%). */
export const MOVE_BONUS_CAP = 0.15;

/** The most the worn gear's roll cooldown affixes take off, summed: −50% (039.9: the same 15 ticks of 30 as before). */
export const ROLL_COOLDOWN_FLOOR = -0.5;

/** A hit always deals at least this share of its damage, rounded up, however much armor is worn. */
export const MIN_DAMAGE_SHARE = 0.25;

/** Name parts per slot (the body's by weight, 010's): an adjective and a noun. */
export const GEAR_NAMES: {
  readonly helm: NameParts;
  readonly boots: NameParts;
  readonly trinket: NameParts;
  readonly body: Readonly<Record<GearWeight, NameParts>>;
} = {
  helm: { adjectives: ['Worn', 'Rune-cut', 'Mossbound', 'Slate', 'Wanderer'], nouns: ['Hood', 'Helm', 'Cap', 'Coif'] },
  boots: { adjectives: ['Worn', 'Supple', 'Husk-hide', 'Granite', 'Wanderer'], nouns: ['Boots', 'Treads', 'Wraps', 'Sabatons'] },
  trinket: { adjectives: ['Ley-touched', 'Carved', 'Old', 'Rune', 'Resin'], nouns: ['Charm', 'Amulet', 'Token', 'Talisman'] },
  body: {
    light: { adjectives: ['Worn', 'Supple', 'Mossbound', 'Husk-hide', 'Wanderer'], nouns: ['Vest', 'Jerkin', 'Wraps', 'Coat'] },
    heavy: { adjectives: ['Granite', 'Rune-cut', 'Slate', 'Warden', 'Ruin'], nouns: ['Plate', 'Cuirass', 'Mail', 'Shell'] },
  },
};

export interface NameParts {
  adjectives: readonly string[];
  nouns: readonly string[];
}

/** Chance (0..1) each enemy kind drops an unidentified piece. The first Husk ever killed always does. Region 2's four at the Husk's 10% (035). */
export const ARMOR_DROP_CHANCE: Readonly<Record<string, number>> = { husk: 0.1, wisp: 0.15, 'pylon-warden': 1, charger: 0.1, burrower: 0.1, shardback: 0.1, sniper: 0.1 };

/** The enemy whose first kill always drops a piece. */
export const FIRST_ARMOR_ENEMY = 'husk';
