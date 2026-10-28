// 080: a boss fight opens with a short show (docs/specs/080-boss-intros.md). The boss, and everything posted in its
// arena, is inactive and untargetable for the intro's ticks while the world runs on; the player moves freely and takes
// no damage. A first fight and every restart plays the full intro; a re-fight (a boss already beaten, summoned again
// at its altar) the short one. Render places every beat by these ticks (src/data/art/bossIntro.ts).

export const BOSS_INTRO = {
  /** A first fight and every restart: 2.75 s. */
  fullTicks: 165,
  /** An altar re-fight: 1 s, after the summon's 2 s crack. */
  shortTicks: 60,
  /**
   * A full intro's extra beat for a boss whose pan comes back from far off, ticks: it holds still, ready, after the
   * camera is home, so its first attack isn't telegraphed off screen (Shaun, 2026-10-28, on 080.27: "The fight should
   * start a beat later"). The Conductor wakes 290 px away.
   */
  settleTicks: { conductor: 30 } as Readonly<Record<string, number>>,
} as const;

/** A boss's intro length, ticks: the short one for a re-fight, else the full one plus its settle beat. */
export const introTicksFor = (bossId: string, short: boolean): number =>
  short ? BOSS_INTRO.shortTicks : BOSS_INTRO.fullTicks + (BOSS_INTRO.settleTicks[bossId] ?? 0);
