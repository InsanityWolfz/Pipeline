// Tube tuning. Starting values from spec 003; tune in playtest.

/** The ammo hotbar slot 1 starts with, and goes back to on a KO. */
export const STARTING_AMMO = 'arrow';

/** Ammo the slot can be switched to, in key order: keys 1, 2, 3. */
export const SLOT_AMMOS: readonly string[] = ['arrow', 'bomb', 'ley-bolt'];

/** Rounds the tube holds loaded. */
export const TUBE_CAPACITY = 6;

/** Ticks to load one round from the inventory. */
export const LOAD_TICKS = 15;

/** Ticks the dry-fire flag stays set after an empty-tube shot. */
export const DRY_FIRE_TICKS = 10;

/** Shots spawn this far from the player's feet along the aim, px. */
export const MUZZLE_OFFSET = 12;

/** Projectiles are drawn this far above their ground point, px. */
export const DRAW_HEIGHT = 14;
