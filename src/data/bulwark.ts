import { BOSS_WEIGHT } from './combat';
import type { AttackTiming, EnemyBase, ShieldDef } from './enemyBase';

// The Bulwark (034): Stonefall Hollows' boss, a slow-turning construct behind a shield
// plate that blocks straight shots and punches into its front. It lobs bombs marked by
// two red circles and pounds the ground round itself up close. Starting values from the
// spec, tuned in playtest so triple arrows from behind kill it in about 30–45 s. 041 made
// it a real fight: an enrage below 30%, a rear stomp that punishes circling, and adds at
// half health (bulwarkPhases.ts). fix-bulwark-ease (Shaun's playtest: "ridiculously hard…
// just nerf him"): back to 900 HP, one bomb a lob enraged, and only a slight enraged speed-up.

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
    /** 041.12: its shockwave ignores a roll's i-frames; only leaving the circle saves the player. */
    rollProof: boolean;
  };
  /** Its enrage (041.4). */
  enrage: {
    below: number;
    roarTicks: number;
    turnDegPerSec: number;
    lobCooldownTicks: number;
    /** fix-bulwark-ease: the bombs each enraged lob throws (Shaun: "single bombs"), in place of `lob.count`. */
    lobCount: number;
    rollProofLobs: boolean;
    /** 041.16: each attack's telegraph while enraged, ticks (never under MIN_TELEGRAPH_TICKS): the pound's, lob's, stomp's and back wave's wind-ups and its bombs' fuse. */
    windups: { pound: number; lob: number; stomp: number; wave: number; fuse: number };
  };
  /** Its back wave (041.16). */
  wave: { everyTicks: number; windupTicks: number; radius: number; arcDegrees: number; damage: number; knockback: number; knockTicks: number; rollProof: boolean };
  /** Its rear stomp (041.5). */
  stomp: {
    range: number;
    behindTicks: number;
    behindDecay: number;
    windupTicks: number;
    swipeTicks: number;
    radius: number;
    arcDegrees: number;
    damage: number;
    knockback: number;
    knockTicks: number;
    recoverTicks: number;
    cooldownTicks: number;
  };
  /** Its adds (041.6): enemy ids, risen at the arena's add tiles. */
  adds: { below: number; enemies: readonly string[]; riseTicks: number; minDistance: number; everyTicks: number; maxAlive: number };
}

/** The group the Bulwark's adds carry (041.6): not a population pack, so never counted toward packs or the spawn cap. */
export const ADDS_GROUP = 'bulwark-adds';

export const BULWARK: BulwarkDef = {
  kind: 'bulwark',
  id: 'bulwark',
  name: 'Bulwark',
  boss: true,
  /**
   * fix-bulwark-ease (Shaun, playtest: "900 health is fine"): 900, as 034 had it. 041 had raised it to 3,800 for a
   * 60–90 s fight; with that and the rest of 041's retune he found it "ridiculously hard". Later regions' bosses are
   * to be tougher than this second region's.
   */
  maxHealth: 900,
  walkSpeed: 18,
  feetBox: { w: 36, h: 14 },
  hurtbox: { w: 44, h: 54, offsetY: -22 },
  weight: BOSS_WEIGHT,
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
  pound: { triggerRange: 72, windupTicks: 60, swipeTicks: 8, radius: 112, damage: 35, knockback: 40, knockTicks: 8, recoverTicks: 60, cooldownTicks: 300, rollProof: true },
  /**
   * Once per fight, when its health first drops below `below` of its max (041.4), it enrages at its next free moment
   * (a wind-up already running finishes first): it roars `roarTicks`, starting no attack, then until it dies or resets
   * its shield turns at `turnDegPerSec`, its lob cooldown is `lobCooldownTicks` and each lob throws `lobCount` bombs;
   * with `rollProofLobs` (041.12) the bombs it lobs then ignore a roll's i-frames. 041.16 (Shaun): its telegraphs
   * shorten to `windups`, never under MIN_TELEGRAPH_TICKS.
   */
  // fix-bulwark-ease (Shaun: "he does speed up a slight amount, but nothing crazy"): every speed-up is 10–15% over
  // its unenraged value (the turn 40 → 45°/s, was 110; the lob cooldown 240 → 210, was 160; the pound's wind-up
  // 60 → 53, was 36; the stomp's 40 → 35, was 30; the back wave's 36 → 32, was 30; the fuse 90 → 80, was 45); the
  // lob's wind-up stays at MIN_TELEGRAPH_TICKS (30). One bomb a lob (was the lob's 3: "he just throws single bombs").
  enrage: {
    below: 0.3,
    roarTicks: 60,
    turnDegPerSec: 45,
    lobCooldownTicks: 210,
    lobCount: 1,
    rollProofLobs: true,
    windups: { pound: 53, lob: 30, stomp: 35, wave: 32, fuse: 80 },
  },
  /**
   * Its back wave (041.16, Shaun: standing behind it always costs something): every `everyTicks` while it fights, a
   * wave builds off its back for `windupTicks` (its own rippling arcs on the ground over a rear arc of `radius` px,
   * `arcDegrees` wide, locked as it starts), then breaks for `damage` and `knockback` px over `knockTicks` on feet
   * inside it; with `rollProof` a roll's i-frames don't save from it (as 041.12's pound), so standing behind costs a
   * step out or a hit. It runs beside its other attacks, never holding them up, and waits out the roar (041.17).
   */
  wave: { everyTicks: 180, windupTicks: 36, radius: 150, arcDegrees: 140, damage: 20, knockback: 30, knockTicks: 6, rollProof: true },
  /**
   * The rear stomp (041.5): its `behind` counter gains 1 a tick while the player's feet are outside its shield arc and
   * within `range` px, and loses `behindDecay` a tick otherwise (never below 0). At `behindTicks` with its cooldown
   * ready and no other attack winding up, it winds up `windupTicks` without turning, a red half-disc of `radius` px
   * (`arcDegrees` wide) over its rear half; then stomps for `damage` and `knockback` px over `knockTicks` on feet inside
   * it (a roll's i-frames dodge it), holds the pose `swipeTicks` and recovers `recoverTicks` without turning. The
   * cooldown counts from the wind-up's start.
   */
  // 041.7 tuning: 120 ticks behind (2 s; the spec's 3 s let a decent build win in under 60 s).
  stomp: { range: 160, behindTicks: 120, behindDecay: 2, windupTicks: 40, swipeTicks: 8, radius: 96, arcDegrees: 180, damage: 30, knockback: 40, knockTicks: 8, recoverTicks: 40, cooldownTicks: 360 },
  /**
   * The first time in a fight its health drops below `below` of its max (041.6), one of each of `enemies` rises at the
   * arena's add tiles (the other tile when one is within `minDistance` px of the player's feet) over `riseTicks`; then
   * another pair every `everyTicks` it fights (041.16: they keep coming), each add on its own tile; a pair due waits
   * while it would take the living adds past `maxAlive` (041.17).
   */
  // 041.16 tuning: a pair every 25 s (Shaun's "about every 20 s"; 20 s left the decent build KO'd more often).
  adds: { below: 0.5, enemies: ['shardback', 'charger'], riseTicks: 60, minDistance: 96, everyTicks: 1500, maxAlive: 4 },
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
