import type { DamageType } from './ammo';

// Tags (029): what a stage machine adds to a finished round. A round is its base
// ammo plus at most one element tag and at most one shape tag; its id is the base
// then its tags, elements first, joined by '+' (`arrow+frost`). Every legal
// combination's item and ammo are derived from this data, so new tags make new
// rounds without new code. Numbers are starting values; tune in playtest.

/** An element sets the round's damage type; a shape changes how it flies or hits. */
export type TagSlot = 'element' | 'shape';

/** What a tag does in the sim: each has its own numbers below. */
export type TagBehaviour = 'cold' | 'homing' | 'split' | 'cluster';

export interface TagDef {
  id: string;
  slot: TagSlot;
  /** Put before the base ammo's name: "Frost arrow". */
  prefix: string;
  /** The base ammo it applies to. */
  appliesTo: string;
  behaviour: TagBehaviour;
  /** An element's damage type, which the round takes on. */
  damageType?: DamageType;
}

/**
 * Cold: each cold hit adds a chill stack (up to `stacksToFreeze`) and refreshes the chill for `stackTicks`; each
 * stack slows movement by `slowPerStack`. The hit that reaches `stacksToFreeze` freezes the enemy for `freezeTicks`
 * (a boss for `bossFreezeTicks`); after the thaw it gains no stacks for `refreezeTicks`.
 */
export const COLD = { slowPerStack: 0.15, stacksToFreeze: 4, stackTicks: 120, freezeTicks: 90, bossFreezeTicks: 45, refreezeTicks: 120 } as const;

/** Homing: at launch it locks onto the living enemy nearest the cursor within `lockRadius` px, then turns toward it by at most `turnDegrees` a tick. */
export const HOMING = { lockRadius: 64, turnDegrees: 4 } as const;

/**
 * The Split: a Split round that hits an enemy bursts into `shards` shards, `360 / shards` degrees apart, each
 * flying `range` px at `speed` px/s for `damage` physical damage. Shards are the `projectile`, not an item.
 */
export const SPLIT = { shards: 5, damage: 4, range: 64, speed: 360, projectile: 'shard' } as const;

/**
 * The cluster split (038): `delayTicks` after a cluster bomb bursts, `count` bomblets land evenly round the burst point
 * at `distance` px, the first along its flight, each bursting for `damage` in `radius` px.
 */
export const CLUSTER = { delayTicks: 12, count: 4, distance: 40, damage: 8, radius: 20 } as const;

export const TAGS: Readonly<Record<string, TagDef>> = {
  frost: { id: 'frost', slot: 'element', prefix: 'Frost', appliesTo: 'arrow', behaviour: 'cold', damageType: 'cold' },
  homing: { id: 'homing', slot: 'shape', prefix: 'Homing', appliesTo: 'ley-bolt', behaviour: 'homing' },
  split: { id: 'split', slot: 'shape', prefix: 'Split', appliesTo: 'ley-bolt', behaviour: 'split' },
  cluster: { id: 'cluster', slot: 'shape', prefix: 'Cluster', appliesTo: 'bomb', behaviour: 'cluster' },
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

/** A round's tags, elements first. */
export const roundTags = (round: string): string[] => round.split(SEP).slice(1);

/** True if every tag applies to the base, with at most one per slot. */
function legal(base: string, tags: readonly string[], table: Readonly<Record<string, TagDef>>): boolean {
  if (new Set(tags).size !== tags.length) return false;
  const defs = tags.map((t) => table[t]);
  if (defs.some((d) => !d || d.appliesTo !== base)) return false;
  return SLOT_ORDER.every((slot) => defs.filter((d) => d?.slot === slot).length <= 1);
}

/** A round's id from its base and tags, elements first. Throws on an illegal combination. */
export function roundId(base: string, tags: readonly string[], table: Readonly<Record<string, TagDef>> = TAGS): string {
  if (!legal(base, tags, table)) throw new Error(`Illegal round '${[base, ...tags].join(SEP)}'`);
  const sorted = [...tags].sort((a, b) => SLOT_ORDER.indexOf(tagDef(a, table).slot) - SLOT_ORDER.indexOf(tagDef(b, table).slot));
  return [base, ...sorted].join(SEP);
}

/** The round with `tag` added, or null if its base doesn't take it or that slot is already taken. */
export function withTag(round: string, tag: string, table: Readonly<Record<string, TagDef>> = TAGS): string | null {
  const tags = [...roundTags(round), tag];
  return legal(roundBase(round), tags, table) ? roundId(roundBase(round), tags, table) : null;
}

/** The round with `tag` taken off (a stage's input from its output). */
export function withoutTag(round: string, tag: string): string {
  return [roundBase(round), ...roundTags(round).filter((t) => t !== tag)].join(SEP);
}

/** Every legal tagged round, base by base: each element alone, each shape alone, then each element with each shape. */
function legalRounds(table: Readonly<Record<string, TagDef>>): string[] {
  const bases = [...new Set(Object.values(table).map((t) => t.appliesTo))];
  return bases.flatMap((base) => {
    const of = (slot: TagSlot) => Object.values(table).filter((t) => t.appliesTo === base && t.slot === slot).map((t) => t.id);
    const elements = of('element');
    const shapes = of('shape');
    const combos = [...elements.map((e) => [e]), ...shapes.map((s) => [s]), ...elements.flatMap((e) => shapes.map((s) => [e, s]))];
    return combos.map((tags) => roundId(base, tags, table));
  });
}

/** Every legal tagged round (the plain bases are not in it). */
export const ROUNDS: readonly string[] = legalRounds(TAGS);

/** A round's name from its base's: the tags' prefixes, elements first, then the base name in lower case. */
export function roundName(baseName: string, round: string): string {
  const tags = roundTags(round);
  if (tags.length === 0) return baseName;
  return [...tags.map((t) => tagDef(t).prefix), baseName.toLowerCase()].join(' ');
}

/** A round's element, if any: it sets the damage type. */
export function elementOf(round: string): TagDef | undefined {
  return roundTags(round)
    .map((t) => tagDef(t))
    .find((t) => t.slot === 'element');
}

/** Whether a round has a tag with this behaviour (a homing round, a split round). */
export const hasBehaviour = (round: string, behaviour: TagBehaviour): boolean => roundTags(round).some((t) => TAGS[t]?.behaviour === behaviour);
