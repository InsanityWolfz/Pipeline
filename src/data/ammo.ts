import { SPRITES } from './assets';

// Ammo the tube can fire. Starting values from spec 003; tune in playtest.

/** Damage types from docs/design.md. Only physical exists so far. */
export type DamageType = 'physical';

export interface AmmoDef {
  id: string;
  /** The inventory item a loaded round is made from. */
  itemId: string;
  /** Flight speed, px per second. */
  speed: number;
  /** Distance flown before it vanishes, px. */
  range: number;
  damage: number;
  damageType: DamageType;
  /** Atlas frames for the projectile (pointing right) and its ground shadow. */
  sprite: string;
  shadow: string;
}

export const AMMO: Readonly<Record<string, AmmoDef>> = {
  arrow: {
    id: 'arrow',
    itemId: 'arrow',
    speed: 480,
    range: 320,
    damage: 10,
    damageType: 'physical',
    sprite: SPRITES.arrow,
    shadow: SPRITES.arrowShadow,
  },
};
