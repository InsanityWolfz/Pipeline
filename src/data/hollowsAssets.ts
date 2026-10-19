// Asset keys and look numbers for Stonefall Hollows' art (034): its standing terrain,
// the ley-iron seam and item, the barrier, the Bulwark's enemy bombs and pound, the altar,
// the boss bar and the minimap's aqueduct icon. Render draws by these keys; the shapes are
// in src/data/art/hollows.ts and src/data/art/bulwark.ts. Times ms, sizes world px, alphas 0..1.

export const HOLLOWS_SPRITES = {
  /** A cliff tile's face with its lit top edge, by tile hash; `cliffTop` where another cliff stands in front (south). */
  cliffs: ['ow-cliff-0', 'ow-cliff-1', 'ow-cliff-2'],
  cliffTop: 'ow-cliff-top',
  /** An aqueduct pillar (or colonnade column), a standing arch's span over a walkable bay, a fallen span's heap. */
  pillar: 'ow-aqueduct-pillar',
  arch: 'ow-aqueduct-arch',
  fallen: ['ow-fallen-span-0', 'ow-fallen-span-1'],
  /** Loose rubble on the Hollows' grey-blue stone (its rock tiles). */
  rubble: ['ow-rubble-0', 'ow-rubble-1'],
  /** The ley-iron item: a rust-skinned ingot-lump with cyan veins. */
  itemLeyIron: 'item-ley-iron',
  /** The forum's altar stone: dim, awake (its runes lit) and summoning (blazing red). */
  altar: { dim: 'altar-dim', awake: 'altar-awake', summoning: 'altar-summoning' },
  /** The Bulwark's lobbed bomb: a riveted stone shell with a red fuse-glow. */
  enemyBomb: 'enemy-bomb',
} as const;
