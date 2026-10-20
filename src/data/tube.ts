// Tube tuning. Starting values from specs 003 and 007; tune in playtest.

/** The ammo hotbar slot 1 starts with, and goes back to on a KO. */
export const STARTING_AMMO = 'arrow';

/** Ammo the slot can be switched to, in key order: keys 1, 2, 3 and 4 (038: landmines). */
export const SLOT_AMMOS: readonly string[] = ['arrow', 'bomb', 'ley-bolt', 'landmine'];

/**
 * The attune (019), ticks per beat, played the first time the player walks into
 * the foundry, holding them still throughout: the tube's rings light one by one
 * (`gun`), the camera pans to the intake pipe (`panTo`), the pipe's rings light
 * the same way (`pipe`), and the camera pans back (`panBack`).
 */
export const ATTUNE = { gun: 60, panTo: 45, pipe: 60, panBack: 45 } as const;

/** Ticks the whole attune lasts. */
export const ATTUNE_TICKS = ATTUNE.gun + ATTUNE.panTo + ATTUNE.pipe + ATTUNE.panBack;

/** Shots spawn this far from the player's feet along the aim, px. */
export const MUZZLE_OFFSET = 12;

/** Projectiles are drawn this far above their ground point, px. */
export const DRAW_HEIGHT = 14;
