import type { AttackTiming, EnemyBase, ShieldDef } from './enemies';

// The Bulwark (034): Stonefall Hollows' boss, a slow-turning construct behind a shield
// plate that blocks straight shots and punches into its front. It lobs bombs marked by
// two red circles and pounds the ground round itself up close. Starting values from the
// spec, tuned in playtest so triple arrows from behind kill it in about 30–45 s.

/** The Bulwark (034): a shielded wall that lobs bombs and pounds up close, guarding its arena. Its values are below. */
export interface BulwarkDef extends EnemyBase {
  kind: 'bulwark';
  shield: ShieldDef;
  /** Ticks with the player outside its arena before it walks home and heals. */
  leashTicks: number;
  /** It stops walking at this fraction of the pound's trigger range from the player, rather than walking into them. */
  standOff: number;
  lob: {
    cooldownTicks: number;
    windupTicks: number;
    throwTicks: number;
    count: number;
    scatter: number;
    radius: number;
    fuseTicks: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
  pound: AttackTiming & {
    triggerRange: number;
    radius: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
}

export const BULWARK: BulwarkDef = {
  kind: 'bulwark',
  id: 'bulwark',
  name: 'Bulwark',
  boss: true,
  maxHealth: 900,
  walkSpeed: 18,
  feetBox: { w: 36, h: 14 },
  hurtbox: { w: 44, h: 54, offsetY: -22 },
  hitKnockback: 0,
  hitKnockTicks: 4,
  hitFlashTicks: 6,
  homeTolerance: 4,
  /** A half turn takes 4.5 s: slow enough that a player who gets behind it has time to hit it. */
  shield: { arcDegrees: 180, turnDegPerSec: 40 },
  /** It walks home and heals after this long with the player outside its arena (5 s). */
  leashTicks: 300,
  /** It walks at the player until three quarters of the pound's trigger range away. */
  standOff: 0.75,
  /**
   * Every `cooldownTicks` while engaged (counted from its wind-up's start), it rears back for `windupTicks`, throws
   * `count` bombs (one at the player's feet, the rest within `scatter` px of it) and holds the throw `throwTicks`.
   * Each bomb's ring is `radius` px; its inner circle fills it over `fuseTicks`, then it bursts for `damage` and
   * `knockback` px over `knockTicks` on a player whose feet are inside.
   */
  lob: { cooldownTicks: 240, windupTicks: 30, throwTicks: 12, count: 3, scatter: 80, radius: 40, fuseTicks: 90, damage: 25, knockback: 24, knockTicks: 6 },
  /**
   * With the player's feet within `triggerRange` and its cooldown (300 from its wind-up's start) ready, it plants its
   * shield for `windupTicks`, pounds everything within `radius` (the pose holds `swipeTicks`), then recovers without
   * turning for `recoverTicks`: the window to punish it.
   */
  pound: { triggerRange: 72, windupTicks: 60, swipeTicks: 8, radius: 112, damage: 35, knockback: 40, knockTicks: 8, recoverTicks: 60, cooldownTicks: 300 },
  drops: {
    always: [
      { itemId: 'bulwark-core', min: 1, max: 1 },
      { itemId: 'ley-iron', min: 4, max: 6 },
      { itemId: 'aqueduct-valve', min: 1, max: 2 },
    ],
    chance: 0,
    oneOf: [],
  },
  xp: 300,
  anims: 'bulwark',
};
