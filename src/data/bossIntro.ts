// 080: a boss fight opens with a short show (docs/specs/080-boss-intros.md). The boss, and everything posted in its
// arena, is inactive and untargetable for the intro's ticks while the world runs on; the player moves freely and takes
// no damage. A first fight and every restart plays the full intro; a re-fight (a boss already beaten, summoned again
// at its altar) the short one. Render places every beat by these ticks (src/data/art/bossIntro.ts).

export const BOSS_INTRO = {
  /** A first fight and every restart: 2.75 s. */
  fullTicks: 165,
  /** An altar re-fight: 1 s, after the summon's 2 s crack. */
  shortTicks: 60,
} as const;
