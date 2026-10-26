import { SPRITES } from './assets';
import { MINE_SPRITES } from './mineAssets';
import { elementOf, ROUNDS, roundBase, roundTags, roundTier, SPLIT, tagDef, withTier } from './tags';
import { TIER_ARMED, TIER_PROJECTILES } from './tierAssets';

// Ammo the tube can fire. Starting values from specs 003, 005 and 029; tune in playtest.
// Each tagged round (029) is derived from its base and its tags (src/data/tags.ts).

/**
 * Damage types from docs/design.md. Nothing deals fire in Milestone 1 (029: bombs are physical, with no burn), but it
 * stays in the type because design.md's damage types include it and Milestone 2's fire rune brings it back as a tag.
 */
export type DamageType = 'physical' | 'fire' | 'cold';

interface AmmoBase {
  id: string;
  /** The inventory item a loaded round is made from. */
  itemId: string;
  /** The base ammo it's a round of (029): itself for a plain round. It fires from its slot. */
  base: string;
  /** Its tags, elements first (029); none for a plain round. */
  tags: readonly string[];
  /** Minimum ticks between shots with this ammo. */
  fireTicks: number;
  damageType: DamageType;
  /** Atlas frames for the projectile (pointing right) and its ground shadow. */
  sprite: string;
  shadow: string;
}

/** Flies straight at the cursor until it hits something, a wall, or its range. */
export interface StraightAmmo extends AmmoBase {
  kind: 'straight';
  /** Flight speed, px per second. */
  speed: number;
  /** Distance flown before it vanishes, px. */
  range: number;
  damage: number;
  /** Passes through every enemy in its path, hitting each once, until its range runs out or it hits a solid (029: without limit). */
  pierce: boolean;
  /** Knockback (039): each hit pushes the enemy this many px times its weight; its Shards push as far. */
  knockback: number;
}

/** Arcs over everything to the cursor and bursts where it lands. */
export interface LobAmmo extends AmmoBase {
  kind: 'lob';
  /** Ground speed, px per second. */
  speed: number;
  /** Farthest landing point from the player's feet, px. */
  maxRange: number;
  /** Height at the top of the arc, px (render only). */
  arcPeak: number;
  burstRadius: number;
  burstDamage: number;
}

/**
 * A landmine (038): lobbed to the aim like a bomb, it arms where it lands and bursts `armTicks` later for `damage`
 * on every enemy within `radius` px. Only its timer sets it off.
 */
export interface MineAmmo extends AmmoBase {
  kind: 'mine';
  speed: number;
  maxRange: number;
  arcPeak: number;
  armTicks: number;
  damage: number;
  radius: number;
  /** Its sprite lying armed on the ground. */
  armed: string;
}

export type AmmoDef = StraightAmmo | LobAmmo | MineAmmo;

/** Anything that arcs to the aim: a bomb or a landmine. */
export type LobbedAmmo = LobAmmo | MineAmmo;

/** The bomb (029: a 48 px blast, no burn). The landmine (038) flies as it does. */
const BOMB: LobAmmo = {
  id: 'bomb',
  kind: 'lob',
  itemId: 'bomb',
  base: 'bomb',
  tags: [],
  fireTicks: 40,
  speed: 200,
  maxRange: 192,
  arcPeak: 32,
  burstRadius: 48,
  /** 041: 12 per hit (was 15), with the ley bolt under the arrow: landmine > arrow > ley bolt ≈ bomb. */
  burstDamage: 12,
  damageType: 'physical',
  sprite: SPRITES.bomb,
  shadow: SPRITES.bombShadow,
};

const BASE_AMMO: Readonly<Record<string, AmmoDef>> = {
  arrow: {
    id: 'arrow',
    kind: 'straight',
    itemId: 'arrow',
    base: 'arrow',
    tags: [],
    fireTicks: 15,
    speed: 480,
    range: 320,
    /** 041: 14 per hit (was 10). */
    damage: 14,
    pierce: true,
    knockback: 6,
    damageType: 'physical',
    sprite: SPRITES.arrow,
    shadow: SPRITES.arrowShadow,
  },
  'ley-bolt': {
    id: 'ley-bolt',
    kind: 'straight',
    itemId: 'ley-bolt',
    base: 'ley-bolt',
    tags: [],
    fireTicks: 20,
    speed: 300,
    range: 320,
    /** 041: 9 per hit (was 14). */
    damage: 9,
    pierce: false,
    knockback: 6,
    damageType: 'physical',
    sprite: SPRITES.leyBolt,
    shadow: SPRITES.leyBoltShadow,
  },
  bomb: BOMB,
  // 038: large damage in a small radius on a delay; lobbed with a bomb's arc, speed and range, at a bomb's rate (038.7).
  landmine: {
    id: 'landmine',
    kind: 'mine',
    itemId: 'landmine',
    base: 'landmine',
    tags: [],
    fireTicks: BOMB.fireTicks,
    speed: BOMB.speed,
    maxRange: BOMB.maxRange,
    arcPeak: BOMB.arcPeak,
    armTicks: 300,
    damage: 60,
    radius: 24,
    damageType: 'physical',
    sprite: MINE_SPRITES.landmine,
    shadow: MINE_SPRITES.landmineShadow,
    armed: MINE_SPRITES.armed,
  },
};

/** A tagged or tiered round: its base's numbers (its speed scaled by its tags', 054), its own id and tags, its element's damage type, and (062) its tier's look. */
function tagged(round: string): AmmoDef {
  const base = BASE_AMMO[roundBase(round)];
  if (!base) throw new Error(`No base ammo for '${round}'`);
  const tags = roundTags(round);
  const speed = tags.reduce((v, t) => v * (tagDef(t).speedScale ?? 1), base.speed);
  const def: AmmoDef = { ...base, id: round, itemId: round, tags, speed, damageType: elementOf(round)?.damageType ?? base.damageType };
  // 062: a tiered round flies as its plain tiered round's recoloured projectile (a steel landmine lies armed in steel too).
  const tier = roundTier(round);
  if (tier === 'stone') return def;
  const plain = withTier(base.id, tier);
  const sprite = TIER_PROJECTILES[plain]?.key ?? def.sprite;
  if (def.kind === 'mine') return { ...def, sprite, armed: TIER_ARMED[plain]?.key ?? def.armed };
  return { ...def, sprite };
}

/** Every ammo: the four bases, then every legal tagged round (029). */
export const AMMO: Readonly<Record<string, AmmoDef>> = {
  ...BASE_AMMO,
  ...Object.fromEntries(ROUNDS.map((r) => [r, tagged(r)])),
};

export function ammoDef(id: string): AmmoDef {
  const def = AMMO[id];
  if (!def) throw new Error(`Unknown ammo '${id}'`);
  return def;
}

export function straightAmmo(id: string): StraightAmmo {
  const def = ammoDef(id);
  if (def.kind !== 'straight') throw new Error(`Ammo '${id}' doesn't fly straight`);
  return def;
}

/** A Split round's Shard's damage before stats (054): its round's damage times SPLIT.damageShare. */
export const shardBaseDamage = (roundId: string): number => straightAmmo(roundId).damage * SPLIT.damageShare;

/** A bomb or a landmine: anything that arcs to the aim (038). */
export function lobbedAmmo(id: string): LobbedAmmo {
  const def = ammoDef(id);
  if (def.kind === 'straight') throw new Error(`Ammo '${id}' isn't lobbed`);
  return def;
}

/** A landmine (038): its arm time, damage and radius. */
export function mineAmmo(id: string): MineAmmo {
  const def = ammoDef(id);
  if (def.kind !== 'mine') throw new Error(`Ammo '${id}' isn't a mine`);
  return def;
}

export function lobAmmo(id: string): LobAmmo {
  const def = ammoDef(id);
  if (def.kind !== 'lob') throw new Error(`Ammo '${id}' isn't lobbed`);
  return def;
}
