// Champions (032): any non-boss enemy can spawn as a champion, a rule over its data:
// bigger, tougher, a little faster and harder-hitting, glowing and named, with richer
// drops. Starting values from Shaun's round 6; tune in playtest. Names are placeholders
// for Shaun to rewrite.

export const CHAMPIONS = {
  /** Its sprite, feet box and hurtbox, ×. */
  scale: 1.5,
  /** Max health, ×. */
  health: 1.5,
  /** Every attack's damage, ×, rounded. */
  damage: 1.3,
  /** Walk speed, ×. Attack timings, telegraphs and reach stay the enemy's own. */
  speed: 1.15,
  /** Its drop table is rolled this many times, inclusive, picked with the seeded RNG. */
  dropRolls: [2, 3] as const,
  /** Unidentified armor pieces it always drops, instead of the usual chance. */
  armor: 1,
  /** A spawning pack's chance of holding one, by danger ring (ring 0 has no population). Later regions add theirs. */
  chanceByRing: { 1: 1 / 8, 2: 1 / 5 } as Readonly<Record<number, number>>,
  /** The soft glow round its body: palette colour, radius px at 1× (scaled with it), a slow pulse between two alphas. */
  glow: { color: 'gold-trim', radius: 22, pulseMs: 1800, alpha: [0.3, 0.55] as const },
  /** Its overhead health bar's colour. */
  barColor: 'gold-trim',
  /** Short epithet-style names, by enemy id: one is picked with the seeded RNG. */
  names: {
    husk: ['Mossjaw', 'Rootgrip', 'Thornback', 'Barkhide', 'Gnarlfist', 'Briarmaw'],
    wisp: ['Palewick', 'Duskmote', 'Glimmerveil', 'Hollowlight', 'Ashflicker'],
  } as Readonly<Record<string, readonly string[]>>,
} as const;
