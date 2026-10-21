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
  /** At most this many of an enemy id in one pack (035: so a pack can always be read); a member is picked from those still under. */
  limits?: Readonly<Record<string, number>>;
}

/** The rings that keep a population: ring 0 stays calm; ring 3 is Stonefall Hollows (034). */
export type PopulatedRing = 1 | 2 | 3;

/**
 * 053: the round world is about twice the old map's area, and the pack counts grew with it (4, 8, 6 before): rings 1
 * and 3 doubled, ring 2 by half again (doubled, its packs settled round the shrine in the open and swamped its fight),
 * which still fills 017's ring 2 crowd. Every ring is a little sparser than it was, the Hollows most (see the spec's
 * "Raised after the build").
 */
export const POPULATION = {
  rings: {
    1: { packs: 8, size: [3, 4], enemies: ['husk'] },
    2: { packs: 12, size: [4, 5], enemies: ['husk', 'husk', 'wisp'] },
    // Stonefall Hollows (035): its four, at most one Sniper and two Burrowers to a pack.
    3: { packs: 12, size: [4, 5], enemies: ['shardback', 'charger', 'charger', 'burrower', 'sniper'], limits: { sniper: 1, burrower: 2 } },
  } satisfies Record<PopulatedRing, PackDef>,
  /** A pack spawns at least this far from the player (1.5 half-screens; see the spec's open question on "1.5 screens"). */
  spawnDistance: 480,
  /** And every member stands at least this far outside the camera's view, px: near the map's edge the camera stops following, so distance alone isn't out of view. */
  viewMargin: 64,
  /** A wiped-out pack comes back this many ticks later (20 s). */
  respawnTicks: 1200,
  /**
   * No pack's centre or member stands within this many tiles of the shrine's site, either way (053: in the round
   * world the shrine stands in open ring 2 ground, and packs homed round it woke on the way in and joined the Warden's
   * fight through its side gaps). With the pack spread, a home this far out sits past the aggro box (half a view,
   * 10 × 5.6 tiles) of a player anywhere in the site or on its side and front approaches.
   */
  shrineMargin: { x: 14, y: 9 },
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
