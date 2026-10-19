// Melee (023): with no tube, or nothing to fire, the fire button punches. Starting values from spec 023; tune in playtest.

/**
 * The punch: `damage` physical to every enemy whose hit box overlaps an arc
 * `arcDegrees` wide and `reach` px from the player, centred on the aim. One
 * every `cooldownTicks` while fire is held. Enemies that aren't bosses are
 * pushed `knockback` px straight away from the player over `knockTicks`.
 */
export const MELEE = {
  damage: 4,
  reach: 28,
  arcDegrees: 100,
  cooldownTicks: 24,
  knockback: 20,
  knockTicks: 8,
} as const;
