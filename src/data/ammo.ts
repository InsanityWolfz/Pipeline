import { SPRITES } from './assets';

// Ammo the tube can fire. Starting values from specs 003 and 005; tune in playtest.

/** Damage types from docs/design.md that exist so far. */
export type DamageType = 'physical' | 'fire';

interface AmmoBase {
  id: string;
  /** The inventory item a loaded round is made from. */
  itemId: string;
  /** Minimum ticks between shots (and between dry fires) with this ammo. */
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
  /** Passes through enemies, hitting each once, instead of stopping at the first. */
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
  /** Damage over time on enemies caught in the burst. */
  burn: { damage: number; everyTicks: number; times: number };
}

export type AmmoDef = StraightAmmo | LobAmmo;

export const AMMO: Readonly<Record<string, AmmoDef>> = {
  arrow: {
    id: 'arrow',
    kind: 'straight',
    itemId: 'arrow',
    fireTicks: 15,
    speed: 480,
    range: 320,
    damage: 10,
    pierce: false,
    damageType: 'physical',
    sprite: SPRITES.arrow,
    shadow: SPRITES.arrowShadow,
  },
  'ley-bolt': {
    id: 'ley-bolt',
    kind: 'straight',
    itemId: 'ley-bolt',
    fireTicks: 20,
    speed: 300,
    range: 320,
    damage: 14,
    pierce: true,
    damageType: 'physical',
    sprite: SPRITES.leyBolt,
    shadow: SPRITES.leyBoltShadow,
  },
  bomb: {
    id: 'bomb',
    kind: 'lob',
    itemId: 'bomb',
    fireTicks: 40,
    speed: 200,
    maxRange: 192,
    arcPeak: 32,
    burstRadius: 32,
    burstDamage: 15,
    burn: { damage: 3, everyTicks: 30, times: 4 },
    damageType: 'fire',
    sprite: SPRITES.bomb,
    shadow: SPRITES.bombShadow,
  },
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
