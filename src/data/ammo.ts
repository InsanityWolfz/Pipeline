import { SPRITES } from './assets';
import { elementOf, ROUNDS, roundBase, roundTags } from './tags';

// Ammo the tube can fire. Starting values from specs 003, 005 and 029; tune in playtest.
// Each tagged round (029) is derived from its base and its tags (src/data/tags.ts).

/** Damage types from docs/design.md that exist so far. Fire is back with the fire rune (029: bombs are physical until then). */
export type DamageType = 'physical' | 'fire' | 'cold';

interface AmmoBase {
  id: string;
  /** The inventory item a loaded round is made from. */
  itemId: string;
  /** The base ammo it's a round of (029): itself for a plain round. Volleys fan by it, and it fires from its slot. */
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

export type AmmoDef = StraightAmmo | LobAmmo;

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
    damage: 10,
    pierce: true,
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
    damage: 14,
    pierce: false,
    damageType: 'physical',
    sprite: SPRITES.leyBolt,
    shadow: SPRITES.leyBoltShadow,
  },
  bomb: {
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
    burstDamage: 15,
    damageType: 'physical',
    sprite: SPRITES.bomb,
    shadow: SPRITES.bombShadow,
  },
};

/** A tagged round: its base's numbers, its own id and tags, and its element's damage type. */
function tagged(round: string): AmmoDef {
  const base = BASE_AMMO[roundBase(round)];
  if (!base) throw new Error(`No base ammo for '${round}'`);
  return { ...base, id: round, itemId: round, tags: roundTags(round), damageType: elementOf(round)?.damageType ?? base.damageType };
}

/** Every ammo: the three bases, then every legal tagged round (029). */
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

export function lobAmmo(id: string): LobAmmo {
  const def = ammoDef(id);
  if (def.kind !== 'lob') throw new Error(`Ammo '${id}' isn't lobbed`);
  return def;
}
