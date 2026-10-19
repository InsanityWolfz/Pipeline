// Armor (010). Starting values from spec 010; tune in playtest.

/** The carried item an armor drop is until identified. */
export const UNIDENTIFIED_ARMOR = 'unidentified-armor';

export type ArmorWeight = 'light' | 'heavy';

/** What each weight rolls at the bench: armor value range, walk speed multiplier, and name parts. */
export const ARMOR_WEIGHTS: Readonly<
  Record<ArmorWeight, { min: number; max: number; walkScale: number; adjectives: readonly string[]; nouns: readonly string[] }>
> = {
  light: {
    min: 2,
    max: 4,
    walkScale: 1,
    adjectives: ['Worn', 'Supple', 'Mossbound', 'Husk-hide', 'Wanderer'],
    nouns: ['Vest', 'Jerkin', 'Wraps', 'Coat'],
  },
  heavy: {
    min: 5,
    max: 8,
    walkScale: 0.85,
    adjectives: ['Granite', 'Rune-cut', 'Slate', 'Warden', 'Ruin'],
    nouns: ['Plate', 'Cuirass', 'Mail', 'Shell'],
  },
};

/** Chance (0..1) an identified piece rolls heavy; otherwise it's light. */
export const HEAVY_CHANCE = 0.5;

/** Chance (0..1) each enemy kind drops an unidentified piece. The first Husk ever killed always does. Region 2's four at the Husk's 10% (035). */
export const ARMOR_DROP_CHANCE: Readonly<Record<string, number>> = { husk: 0.1, wisp: 0.15, 'pylon-warden': 1, charger: 0.1, burrower: 0.1, shardback: 0.1, sniper: 0.1 };

/** The enemy whose first kill always drops armor. */
export const FIRST_ARMOR_ENEMY = 'husk';

/** Armor never takes a hit below this. */
export const MIN_DAMAGE = 1;
