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

/** The rings that keep a population: ring 0 stays calm; ring 3 is Stonefall Hollows (034). */
export type PopulatedRing = 1 | 2 | 3;

export const POPULATION = {
  rings: {
    1: { packs: 4, size: [3, 4], enemies: ['husk'] },
    2: { packs: 8, size: [4, 5], enemies: ['husk', 'husk', 'wisp'] },
    // 035's counts; ring 2's Husks and Wisps stand in until 035's enemies ship (034.14).
    3: { packs: 6, size: [4, 5], enemies: ['husk', 'husk', 'wisp'] },
  } satisfies Record<PopulatedRing, PackDef>,
  /** A pack spawns at least this far from the player (1.5 half-screens; see the spec's open question on "1.5 screens"). */
  spawnDistance: 480,
  /** And every member stands at least this far outside the camera's view, px: near the map's edge the camera stops following, so distance alone isn't out of view. */
  viewMargin: 64,
  /** A wiped-out pack comes back this many ticks later (20 s). */
  respawnTicks: 1200,
  /** Pack members stand within this many tiles of the pack's centre. */
  spread: 2,
  /** No new pack spawns that could take the enemies within a screen of the player past this. It caps spawning only: everything on screen wakes, however many the player rounds up (Shaun, 2026-10-18). */
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
