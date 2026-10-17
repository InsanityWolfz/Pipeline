// Tube tuning. Starting values from spec 003; tune in playtest.

/** The ammo id in hotbar slot 1, the only slot so far. */
export const SLOT_AMMO = 'arrow';

/** Rounds the tube holds loaded. */
export const TUBE_CAPACITY = 6;

/** Ticks to load one round from the inventory. */
export const LOAD_TICKS = 15;

/** Minimum ticks between shots (and between dry fires). */
export const FIRE_TICKS = 15;

/** Ticks the dry-fire flag stays set after an empty-tube shot. */
export const DRY_FIRE_TICKS = 10;

/** Shots spawn this far from the player's feet along the aim, px. */
export const MUZZLE_OFFSET = 12;

/** Projectiles are drawn this far above their ground point, px. */
export const DRAW_HEIGHT = 14;
