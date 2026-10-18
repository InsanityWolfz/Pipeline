// The living population (017): once the first line fills the tube, each ring of
// the overworld keeps a number of packs alive. Ring 0 (round the foundry) stays
// calm. Ticks at 60 Hz; distances in px. Numbers are tuning values.

export interface PackDef {
  /** Packs this ring keeps alive. */
  packs: number;
  /** Pack size range, inclusive. */
  size: readonly [number, number];
  /** Enemy ids a pack member is picked from, in turn by the seeded RNG. */
  enemies: readonly string[];
}

export const POPULATION = {
  rings: {
    1: { packs: 4, size: [3, 4], enemies: ['husk'] },
    2: { packs: 8, size: [4, 5], enemies: ['husk', 'husk', 'wisp'] },
  } satisfies Record<1 | 2, PackDef>,
  /** A pack spawns at least this far from the player (1.5 half-screens; see the spec's open question on "1.5 screens"). */
  spawnDistance: 480,
  /** And every member stands at least this far outside the camera's view, px: near the map's edge the camera stops following, so distance alone isn't out of view. */
  viewMargin: 64,
  /** A wiped-out pack comes back this many ticks later (20 s). */
  respawnTicks: 1200,
  /** Pack members stand within this many tiles of the pack's centre. */
  spread: 2,
  /** No new pack spawns that could take the enemies within a screen of the player past this, and no more than this many wake there. */
  screenCap: 15,
  /** "Within a screen" of the player: this far either way, px (a whole view). */
  screen: { x: 640, y: 360 },
  /** Tries per tick to find open ground for a pack before waiting for the next tick. */
  tries: 12,
  /** Random spots tried per member when placing a pack round its centre. */
  memberTries: 4,
} as const;

/** A claimed pylon's safe zone (017): nothing spawns or walks in, radius in tiles. */
export const SAFE_RADIUS = 10;
