import { lobAmmo, mineAmmo, straightAmmo } from './ammo';
import { BULWARK } from './bulwark';
import { BOSS_WEIGHT } from './combat';
import { CHARGER, SHARDBACK } from './hollowsEnemies';
import { ROLLBREAKER } from './relics';
import { CLUSTER, COLD, HOMING, SPLIT } from './tags';
import { BLASTFLETCH } from './talents';
import type { StatId } from './statDefs';

// The keyword list (039): every rule a round, status or piece of content can have, by one
// fixed name from this closed list. Each has a group, a state (a reserved keyword exists in
// data but never shows in game), one rules line (`template`) with `{param}` slots and
// `{{id}}` references to other keywords and child nouns (rendered as their names; a suffix
// right after the braces makes a plural, and `{{id.form}}` reads one of a keyword's own
// `forms`), never a digit, the params it reads from data with their units, the stats
// content may change under it, and what it makes. src/data/rulesText.ts renders it.

export type KeywordId =
  | 'shot'
  | 'lob'
  | 'mine'
  | 'pierce'
  | 'homing'
  | 'split'
  | 'burst'
  | 'cluster'
  | 'knockback'
  | 'physical'
  | 'cold'
  | 'fire'
  | 'lightning'
  | 'poison'
  | 'chill'
  | 'freeze'
  | 'stun'
  | 'pool'
  | 'arrow'
  | 'bomb'
  | 'ley'
  | 'landmine'
  | 'shield'
  | 'boss'
  | 'burrowed';

export type KeywordGroup = 'delivery' | 'behaviour' | 'damage-type' | 'status' | 'ground' | 'family' | 'trait';

/** A param's unit. `multiplier` reads "×1.5"; `px-per-s`, `deg` and `deg-per-s` serve the glossary's speeds and arcs. */
export type ParamUnit = 'ticks' | 'px' | 'px-per-s' | 'deg' | 'deg-per-s' | 'deg-per-tick' | 'fraction' | 'multiplier' | 'count' | 'hp' | 'hp-per-s';

/** A param: fixed (one number from data), or per source (a number for each round, child, relic or enemy that carries it). */
export type KeywordParam = { unit: ParamUnit; value: number } | { unit: ParamUnit; perSource: Readonly<Record<string, number>> };

export interface KeywordDef {
  id: KeywordId;
  /** Title Case, as on a chip. */
  name: string;
  group: KeywordGroup;
  state: 'live' | 'reserved';
  template: string;
  params: Readonly<Record<string, KeywordParam>>;
  /** The stats content may change under this scope. */
  stats: readonly StatId[];
  /** What it makes on its own: Cold makes Chill, Chill makes Freeze, a Mine makes a Burst. */
  creates?: readonly KeywordId[];
  /** Other forms of its name a template may read (`{{freeze.adj}}`: "Frozen"). */
  forms?: Readonly<Record<string, string>>;
}

/** The two child nouns (039): reserved words like the keywords, never chips. */
export const NOUNS = { shard: 'Shard', bomblet: 'Bomblet' } as const;
export type NounId = keyof typeof NOUNS;

const ARROW = straightAmmo('arrow');
const LEY_BOLT = straightAmmo('ley-bolt');
const BOMB = lobAmmo('bomb');
const LANDMINE = mineAmmo('landmine');

const fixed = (unit: ParamUnit, value: number): KeywordParam => ({ unit, value });
const per = (unit: ParamUnit, perSource: Record<string, number>): KeywordParam => ({ unit, perSource });

const kw = (id: KeywordId, name: string, group: KeywordGroup, template: string, params: Record<string, KeywordParam> = {}, stats: readonly StatId[] = [], more: Partial<KeywordDef> = {}): KeywordDef => ({
  id,
  name,
  group,
  state: 'live',
  template,
  params,
  stats,
  ...more,
});

/** A reserved damage type (039: Fire, Lightning, Poison): its template is written from design.md when it ships. */
const reserved = (id: KeywordId, name: string): KeywordDef => ({ id, name, group: 'damage-type', state: 'reserved', template: '', params: {}, stats: [] });

const FAMILY = 'Any round of this family, and every {{shard}}, {{bomblet}} and {{burst}} it makes.';
const family = (id: KeywordId, name: string): KeywordDef => kw(id, name, 'family', FAMILY, {}, ['damage', 'fire-rate']);

export const KEYWORD_LIST: readonly KeywordDef[] = [
  kw('shot', 'Shot', 'delivery', 'Flies straight at the cursor up to {range} at {speed}. Stops at walls and {{shield}} fronts.', {
    range: per('px', { arrow: ARROW.range, 'ley-bolt': LEY_BOLT.range, shard: SPLIT.range }),
    speed: per('px-per-s', { arrow: ARROW.speed, 'ley-bolt': LEY_BOLT.speed, shard: SPLIT.speed }),
  }, ['damage', 'fire-rate', 'range', 'speed']),
  kw('lob', 'Lob', 'delivery', 'Arcs over everything to the cursor, up to {range} away, and lands. Ignores {{shield}}.', {
    range: per('px', { bomb: BOMB.maxRange }),
    speed: per('px-per-s', { bomb: BOMB.speed }),
  }, ['flight-time', 'range']),
  kw('mine', 'Mine', 'delivery', 'Arcs to the cursor, up to {range} away, lies armed and {{burst}}s {arm} after landing. Only its timer sets it off. Cleared when you leave the area.', {
    range: per('px', { landmine: LANDMINE.maxRange }),
    arm: per('ticks', { landmine: LANDMINE.armTicks }),
  }, ['arm-time'], { creates: ['burst'] }),
  kw('pierce', 'Pierce', 'behaviour', 'Passes through every enemy in its path, hitting each once. Stops at walls and {{shield}} fronts.'),
  kw('homing', 'Homing', 'behaviour', 'At launch, locks onto the enemy nearest the cursor within {lock} of it and turns up to {turn} toward it. Flies straight without a target.', {
    lock: fixed('px', HOMING.lockRadius),
    turn: fixed('deg-per-tick', HOMING.turnDegrees),
  }, ['turn-rate', 'lock-radius']),
  kw('split', 'Split', 'behaviour', 'On an enemy hit, sends {count} {{shard}}s in a star for {damage} each. A {{shard}} is a small {{shot}} that never {{pierce}}s or {{split}}s and can’t hit that enemy.', {
    count: fixed('count', SPLIT.shards),
    damage: fixed('count', SPLIT.damage),
  }, ['shards', 'shard-damage']),
  kw('burst', 'Burst', 'behaviour', 'Deals {damage} to every enemy within {radius}. Ignores {{shield}}. No {{knockback}}.', {
    damage: per('count', { bomb: BOMB.burstDamage, bomblet: CLUSTER.damage, landmine: LANDMINE.damage }),
    radius: per('px', { bomb: BOMB.burstRadius, bomblet: CLUSTER.radius, landmine: LANDMINE.radius, 'pool-burst': BLASTFLETCH.burstRadius }),
  }, ['damage', 'radius']),
  kw('cluster', 'Cluster', 'behaviour', '{delay} after its {{burst}}, {count} {{bomblet}}s land {distance} out, each a {{burst}} of {damage} in {radius}.', {
    delay: fixed('ticks', CLUSTER.delayTicks),
    count: fixed('count', CLUSTER.count),
    distance: fixed('px', CLUSTER.distance),
    damage: fixed('count', CLUSTER.damage),
    radius: fixed('px', CLUSTER.radius),
  }, ['bomblets']),
  kw('knockback', 'Knockback', 'behaviour', 'Each hit pushes the enemy {push} times its weight. A {{boss}} weighs {bossWeight}.', {
    push: per('px', { arrow: ARROW.knockback, 'ley-bolt': LEY_BOLT.knockback }),
    bossWeight: fixed('count', BOSS_WEIGHT),
  }, ['knockback']),
  kw('physical', 'Physical', 'damage-type', 'Plain damage, with no extra effect.'),
  kw('cold', 'Cold', 'damage-type', 'Each hit adds {chill} {{chill}}.', { chill: fixed('count', COLD.chillPerHit) }, [], { creates: ['chill'] }),
  reserved('fire', 'Fire'),
  reserved('lightning', 'Lightning'),
  reserved('poison', 'Poison'),
  kw('chill', 'Chill', 'status', 'Stacks up to {stacks}. Each stack slows the enemy’s movement {slow}. Lasts {duration}, refreshed by each {{cold}} hit. At {stacks} it {{freeze}}s.', {
    stacks: fixed('count', COLD.stacksToFreeze),
    slow: fixed('fraction', COLD.slowPerStack),
    duration: fixed('ticks', COLD.stackTicks),
  }, ['stacks-to-freeze', 'slow', 'duration'], { creates: ['freeze'] }),
  kw('freeze', 'Freeze', 'status', 'Can’t move or act for {duration} ({bossDuration} for a {{boss}}); a wind-up pauses. Still takes damage and {{knockback}}. Then can’t gain {{chill}} for {immune}.', {
    duration: fixed('ticks', COLD.freezeTicks),
    bossDuration: fixed('ticks', COLD.bossFreezeTicks),
    immune: fixed('ticks', COLD.refreezeTicks),
  }, ['duration', 'immunity'], { forms: { adj: 'Frozen' } }),
  kw('stun', 'Stun', 'status', 'Can’t move or act for {duration}, and a wind-up is cancelled. A {{boss}} or {{burrowed}} enemy can’t be {{stun}}ned.', {
    duration: per('ticks', { 'rollbreaker-greaves': ROLLBREAKER.stunTicks, charger: CHARGER.charge.stunTicks }),
  }, ['duration']),
  kw('pool', 'Pool', 'ground', 'A circle {radius} round that lies on the ground for {duration}. Its source says what it does.', {
    radius: per('px', { blastfletch: BOMB.burstRadius }),
    duration: per('ticks', { blastfletch: BLASTFLETCH.poolTicks }),
  }, ['duration']),
  family('arrow', 'Arrow'),
  family('bomb', 'Bomb'),
  family('ley', 'Ley'),
  family('landmine', 'Landmine'),
  kw('shield', 'Shield', 'trait', 'Blocks {{shot}}s, {{shard}}s and punches from its front {arc}. Turns {turn}.', {
    arc: per('deg', { bulwark: BULWARK.shield.arcDegrees, shardback: SHARDBACK.shield.arcDegrees }),
    turn: per('deg-per-s', { bulwark: BULWARK.shield.turnDegPerSec, shardback: SHARDBACK.shield.turnDegPerSec }),
  }),
  kw('boss', 'Boss', 'trait', 'Weighs {weight} against {{knockback}}, can’t be {{stun}}ned or pushed by a punch, and {{freeze}}s for less.', { weight: fixed('count', BOSS_WEIGHT) }),
  kw('burrowed', 'Burrowed', 'trait', 'Can’t be hit, and {{homing}} loses it.'),
];

export const KEYWORDS: Readonly<Record<KeywordId, KeywordDef>> = Object.fromEntries(KEYWORD_LIST.map((k) => [k.id, k])) as Record<KeywordId, KeywordDef>;

export function keywordDef(id: string): KeywordDef {
  const def = (KEYWORDS as Readonly<Record<string, KeywordDef>>)[id];
  if (!def) throw new Error(`Unknown keyword '${id}'`);
  return def;
}

/** Whether an id names a keyword. */
export const isKeyword = (id: string): id is KeywordId => id in KEYWORDS;

/**
 * Keywords already in the game that don't meet the new-keyword rule (039.2: at least one source and two payoffs). The
 * list only shrinks: a data test fails if one here now meets the rule, or one not here breaks it. The debt is the
 * missing build paths, for the content specs after 041.
 */
export const KEYWORD_DEBT: Readonly<Partial<Record<KeywordId, string>>> = {
  shot: 'Every arrow and ley bolt; no content scopes it yet.',
  lob: 'Bombs; Swift Arc is its one payoff.',
  mine: 'Landmines; nothing scopes it yet.',
  pierce: 'Arrows; spec 037 keeps talents off it.',
  homing: 'The ley guide; Seeker’s Lens is its one payoff.',
  split: 'The prism lens; Splinter is its one payoff.',
  cluster: 'The cluster die; no payoff yet (a relic such as "Cluster: +2 Bomblets" would be one).',
  knockback: 'Arrow and ley-bolt rounds; nothing raises it yet.',
  physical: 'Every round without an element; it has no rule to build on.',
  cold: 'The frost rune; Cold itself is no content line’s scope yet.',
  chill: 'Made by Cold; Rimecraft is its one payoff.',
  stun: 'Rollbreaker Greaves; nothing pays it off yet.',
  pool: 'Blastfletch makes and spends it; one payoff.',
  landmine: 'The landmine; only all-ammo talents reach it.',
};

/** Tags derived from a round's keywords, never assigned by hand (039.13: data only for now, neither scopes nor chips). */
export const DERIVED_TAGS = {
  aoe: { name: 'AOE', has: ['burst'] },
  projectile: { name: 'Projectile', has: ['shot'] },
  elemental: { name: 'Elemental', lacks: ['physical'] },
} as const satisfies Record<string, { name: string; has?: readonly KeywordId[]; lacks?: readonly KeywordId[] }>;

