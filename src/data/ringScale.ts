// Difficulty by distance (041): each danger ring multiplies its enemies' max health and
// every attack's damage, on top of the tougher enemy types further out. A champion's
// multipliers (032) stack on these by multiplying; bosses keep their own numbers. The two
// fields are the same per ring today but tune apart.

export type Ring = 0 | 1 | 2 | 3;

/** Each danger ring's multipliers, ×: ring 0 (round the foundry, and every room but the overworld) as ring 1 (041.2). */
export const RING_SCALE: Readonly<Record<Ring, { health: number; damage: number }>> = {
  0: { health: 1, damage: 1 },
  1: { health: 1, damage: 1 },
  2: { health: 1.6, damage: 1.6 },
  3: { health: 2.5, damage: 2.5 },
};
