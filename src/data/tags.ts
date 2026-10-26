import type { DamageType } from './ammo';
import type { KeywordId } from './keywords';
import { isTierId, TIERS, type Tier } from './tiers';

// Tags (029): what a stage machine adds to a finished round. A round is its base
// ammo plus at most one element tag and at most one shape tag; its id is the base
// then its tags, elements first, joined by '+' (`arrow+frost`). Every legal
// combination's item and ammo are derived from this data, so new tags make new
// rounds without new code. Numbers are starting values; tune in playtest. 062: a round's material tier (steel, glass;
// src/data/tiers.ts) is a third slot, a segment straight after the base (`arrow+steel+frost`), never a tag.

/** An element sets the round's damage type; a shape changes how it flies or hits. */
export type TagSlot = 'element' | 'shape';

export interface TagDef {
  id: string;
  slot: TagSlot;
  /** Put before the base ammo's name: "Frost arrow". */
  prefix: string;
  /** The base ammo it applies to (039: an element any family, a shape one). */
  appliesTo: readonly string[];
  /** The keyword it gives the round (039): its element's damage type, or its shape. Each has its own numbers below. */
  keyword: KeywordId;
  /** An element's damage type, which the round takes on. */
  damageType?: DamageType;
  /** Its rounds fly at this share of their base's speed (054: a homing bolt slower, so it has time to home). */
  speedScale?: number;
}

/**
 * Cold: each cold hit adds `chillPerHit` chill stack (up to `stacksToFreeze`) and refreshes the chill for `stackTicks`; each
 * stack slows movement by `slowPerStack`. The hit that reaches `stacksToFreeze` freezes the enemy for `freezeTicks`
 * (a boss for `bossFreezeTicks`); after the thaw it gains no stacks for `refreezeTicks`.
 */
export const COLD = { chillPerHit: 1, slowPerStack: 0.15, stacksToFreeze: 4, stackTicks: 120, freezeTicks: 90, bossFreezeTicks: 45, refreezeTicks: 120 } as const;

/**
 * Fire (060): each fire hit sets the enemy burning for `burnTicks`, dealing `burnShare` of that hit's damage each
 * second (a beat every second of burning, and what's left of a second as it ends). A new fire hit restarts the timer
 * at the stronger of the two burns; burns never stack. A burning enemy that dies passes its burn, at its damage a
 * second and for the full `burnTicks`, to every living enemy within `spreadRadius` px.
 */
export const FIRE = { burnTicks: 180, burnShare: 0.25, spreadRadius: 64 } as const;

/**
 * Homing: at launch it locks onto the living enemy nearest the cursor within `lockRadius` px, then turns toward it by
 * at most `turnDegrees` a tick. 054 (Shaun): it flies at `speedScale` of its base's speed, so it has time to home.
 */
export const HOMING = { lockRadius: 64, turnDegrees: 4, speedScale: 0.6 } as const;

/**
 * The Split, the star shot: a Split round that hits an enemy bursts into `shards` shards, `360 / shards` degrees
 * apart, each flying `range` px at `speed` px/s for `damageShare` of its round's damage (054, Shaun: half the bolt's,
 * out to about 3 tiles; was a flat 4 over 64 px), skipping the enemy struck. Shards are the `projectile`, not an item.
 */
export const SPLIT = { shards: 5, damageShare: 0.5, range: 96, speed: 360, projectile: 'shard' } as const;

/**
 * The cluster split (038): `delayTicks` after a cluster bomb bursts, `count` bomblets land evenly round the burst point
 * at `distance` px, the first along its flight, each bursting for `damage` in `radius` px.
 */
export const CLUSTER = { delayTicks: 12, count: 4, distance: 40, damage: 8, radius: 20 } as const;

export const TAGS: Readonly<Record<string, TagDef>> = {
  // 039 (Q12): an element tags any family; a shape stays with one.
  frost: { id: 'frost', slot: 'element', prefix: 'Frost', appliesTo: ['arrow', 'bomb', 'ley-bolt', 'landmine'], keyword: 'cold', damageType: 'cold' },
  // 060: the Fire rune's element, on every family as Frost is.
  fire: { id: 'fire', slot: 'element', prefix: 'Fire', appliesTo: ['arrow', 'bomb', 'ley-bolt', 'landmine'], keyword: 'fire', damageType: 'fire' },
  homing: { id: 'homing', slot: 'shape', prefix: 'Homing', appliesTo: ['ley-bolt'], keyword: 'homing', speedScale: HOMING.speedScale },
  split: { id: 'split', slot: 'shape', prefix: 'Split', appliesTo: ['ley-bolt'], keyword: 'split' },
  cluster: { id: 'cluster', slot: 'shape', prefix: 'Cluster', appliesTo: ['bomb'], keyword: 'cluster' },
};

const SEP = '+';
const SLOT_ORDER: readonly TagSlot[] = ['element', 'shape'];

export function tagDef(id: string, tags: Readonly<Record<string, TagDef>> = TAGS): TagDef {
  const def = tags[id];
  if (!def) throw new Error(`Unknown tag '${id}'`);
  return def;
}

/** The base ammo of a round id. */
export const roundBase = (round: string): string => round.split(SEP)[0] ?? round;

/** A round's material tier (062): the segment after its base, if that is a tier; stone otherwise. */
export function roundTier(round: string): Tier {
  const t = round.split(SEP)[1];
  return t !== undefined && isTierId(t) ? t : 'stone';
}

/** A round's tags, elements first (its tier is not one). */
export const roundTags = (round: string): string[] => round.split(SEP).slice(1).filter((t) => !isTierId(t));

/** A round's id from its base, its tier (062: right after the base, none for stone) and its tags, as given. */
const compose = (base: string, tier: Tier, tags: readonly string[]): string => [base, ...(tier === 'stone' ? [] : [tier]), ...tags].join(SEP);

/** True if every tag applies to the base, with at most one per slot. */
function legal(base: string, tags: readonly string[], table: Readonly<Record<string, TagDef>>): boolean {
  if (new Set(tags).size !== tags.length) return false;
  const defs = tags.map((t) => table[t]);
  if (defs.some((d) => !d || !d.appliesTo.includes(base))) return false;
  return SLOT_ORDER.every((slot) => defs.filter((d) => d?.slot === slot).length <= 1);
}

/** Tags sorted elements first. */
const sortTags = (tags: readonly string[], table: Readonly<Record<string, TagDef>>): string[] =>
  [...tags].sort((a, b) => SLOT_ORDER.indexOf(tagDef(a, table).slot) - SLOT_ORDER.indexOf(tagDef(b, table).slot));

/** A stone round's id from its base and tags, elements first. Throws on an illegal combination. */
export function roundId(base: string, tags: readonly string[], table: Readonly<Record<string, TagDef>> = TAGS): string {
  if (!legal(base, tags, table)) throw new Error(`Illegal round '${[base, ...tags].join(SEP)}'`);
  return compose(base, 'stone', sortTags(tags, table));
}

/** The round with `tag` added, keeping its tier (062), or null if its base doesn't take it or that slot is already taken. */
export function withTag(round: string, tag: string, table: Readonly<Record<string, TagDef>> = TAGS): string | null {
  const tags = [...roundTags(round), tag];
  return legal(roundBase(round), tags, table) ? compose(roundBase(round), roundTier(round), sortTags(tags, table)) : null;
}

/** The round with `tag` taken off (a stage's input from its output), keeping its tier (062). */
export function withoutTag(round: string, tag: string): string {
  return compose(roundBase(round), roundTier(round), roundTags(round).filter((t) => t !== tag));
}

/** The round at another tier (062), its tags kept: `withTier('arrow+frost', 'steel')` is `arrow+steel+frost`. Throws if the tier doesn't take its base. */
export function withTier(round: string, tier: Tier): string {
  const base = roundBase(round);
  if (tier !== 'stone' && !TIERS[tier].appliesTo.includes(base)) throw new Error(`Tier '${tier}' doesn't take '${base}'`);
  return compose(base, tier, roundTags(round));
}

/**
 * Every legal round past the plain stone bases, base by base: each element alone, each shape alone, then each element
 * with each shape; then, for each tier taking the base (062), its plain round and every one of those at that tier.
 */
function legalRounds(table: Readonly<Record<string, TagDef>>): string[] {
  const bases = [...new Set(Object.values(table).flatMap((t) => t.appliesTo))];
  return bases.flatMap((base) => {
    const of = (slot: TagSlot) => Object.values(table).filter((t) => t.appliesTo.includes(base) && t.slot === slot).map((t) => t.id);
    const elements = of('element');
    const shapes = of('shape');
    const combos = [...elements.map((e) => [e]), ...shapes.map((s) => [s]), ...elements.flatMap((e) => shapes.map((s) => [e, s]))];
    const stone = combos.map((tags) => roundId(base, tags, table));
    const tiers = Object.values(TIERS).filter((t) => t.appliesTo.includes(base));
    return [...stone, ...tiers.flatMap((t) => [base, ...stone].map((r) => withTier(r, t.id)))];
  });
}

/** Every legal tagged or tiered round (the plain stone bases are not in it). */
export const ROUNDS: readonly string[] = legalRounds(TAGS);

/** A round's name from its base's: its tier's prefix (062), the tags' prefixes, elements first, then the base name in lower case. */
export function roundName(baseName: string, round: string): string {
  const tier = roundTier(round);
  const prefixes = [...(tier === 'stone' ? [] : [TIERS[tier].prefix]), ...roundTags(round).map((t) => tagDef(t).prefix)];
  if (prefixes.length === 0) return baseName;
  return [...prefixes, baseName.toLowerCase()].join(' ');
}

/** A round's element, if any: it sets the damage type. */
export function elementOf(round: string): TagDef | undefined {
  return roundTags(round)
    .map((t) => tagDef(t))
    .find((t) => t.slot === 'element');
}

/** Whether a round has a tag giving this keyword (a Homing round, a Split round). */
export const hasTagKeyword = (round: string, keyword: KeywordId): boolean => roundTags(round).some((t) => TAGS[t]?.keyword === keyword);
