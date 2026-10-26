// Difficulty by distance (041): each danger ring multiplies its enemies' max health and
// every attack's damage, on top of the tougher enemy types further out. A champion's
// multipliers (032) stack on these by multiplying; bosses keep their own numbers. The two
// fields tune apart. Each region steps up by more than the one before (Shaun, 2026-10-26): the
// Hollows ×1.56 over Region 1's outer ring, the Emberworks ×1.6, the Stormcrown ×2.5 (health) and ×2 (damage).

export type Ring = 0 | 1 | 2 | 3 | 4 | 5;

/** Each danger ring's multipliers, ×: ring 0 (round the foundry, and every room but the overworld) as ring 1 (041.2). */
export const RING_SCALE: Readonly<Record<Ring, { health: number; damage: number }>> = {
  0: { health: 1, damage: 1 },
  1: { health: 1, damage: 1 },
  2: { health: 1.6, damage: 1.6 },
  3: { health: 2.5, damage: 2.5 },
  // 060: the Emberworks.
  4: { health: 4, damage: 4 },
  // 064: the Stormcrown (Shaun: "a step harder ... like x10"); damage ×8 (Shaun, 2026-10-26: at ×10 nearly every hit
  // one-shot even the best gear).
  5: { health: 10, damage: 8 },
};
