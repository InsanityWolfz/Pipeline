import { BOSS_WEIGHT } from './combat';
import type { EnemyBase } from './enemies';
import { CONDUCTOR_XP } from './leveling';

// The Conductor (064): the Stormcrown's boss, a robed storm construct with a rod staff in the Crown Spire, the design's
// "evasive movement" boss. It stands at one of six arena rods and blinks between them, telegraphed by the target rod's
// flash; a homing round follows it, and breaking rods leaves it fewer places to go (with fewer than 2 standing it is
// grounded). It lashes a line at the player, calls lightning down on and round them, and runs lightning along the
// lines between its rods. All numbers are starting values from the spec, tuned in playtest; the ones the spec doesn't
// give are marked (064's raised items).

/** One of its attacks' shared timing: a wind-up (its telegraph), the strike held `activeTicks`, a recovery, and its own cooldown from the wind-up's start. */
export interface ConductorAttack {
  windupTicks: number;
  activeTicks: number;
  recoverTicks: number;
  cooldownTicks: number;
  damage: number;
}

export interface ConductorDef extends EnemyBase {
  kind: 'conductor';
  /** A homing round with no target locks onto it when it comes within its lock radius (the spec's re-lock). */
  homingRelock: true;
  /** Ticks with the player outside its arena before it goes home and heals (the Forgewright's rule). */
  leashTicks: number;
  /** The six arena rods: each a hurtbox (px, centred `offsetY` above its socket) and health; a broken one regrows after `regrowTicks`. */
  rods: { hurtbox: { w: number; h: number; offsetY: number }; health: number; regrowTicks: number };
  /** Every `everyTicks` it blinks to another standing rod (picked by the seeded rng, never its own), which flashes `warnTicks` first. With fewer than `minRods` standing it is grounded. */
  blink: { everyTicks: number; warnTicks: number; minRods: number };
  /** The arc lash: a line from its rod toward the player, locked at the wind-up's start, `length` px long and `width` wide. */
  lash: ConductorAttack & { length: number; width: number; knockback: number; knockTicks: number };
  /** The storm call: `count` circles of `radius` px on and round the player (the others `spread` px off it), each striking after the wind-up. */
  call: ConductorAttack & { count: number; radius: number; spread: number };
  /** The rod chain: lines between neighbouring standing rods, `width` wide, lightning running along them for `activeTicks`. */
  chain: ConductorAttack & { width: number };
  /** Below `below` of its health, it blinks every `blinkTicks`. */
  enrage: { below: number; blinkTicks: number };
}

export const CONDUCTOR: ConductorDef = {
  kind: 'conductor',
  id: 'conductor',
  name: 'Conductor',
  boss: true,
  maxHealth: 6000,
  // It never walks: it stands at a rod, and blinks.
  walkSpeed: 0,
  feetBox: { w: 30, h: 14 },
  hurtbox: { w: 40, h: 64, offsetY: -30 },
  weight: BOSS_WEIGHT,
  hitKnockTicks: 4,
  hitFlashTicks: 6,
  homeTolerance: 4,
  homingRelock: true,
  leashTicks: 300,
  // The spec's 200 health and 20 s regrowth; the box is 064's (raised).
  rods: { hurtbox: { w: 20, h: 60, offsetY: -30 }, health: 200, regrowTicks: 1200 },
  // The spec's 240 ticks (4 s) and 0.75 s flash; grounded below 2 standing rods.
  blink: { everyTicks: 240, warnTicks: 45, minRods: 2 },
  // The spec's 45-tick wind-up and 50 damage with knockback; its length, width, knock, hold, recovery and cooldown are 064's (raised).
  lash: { windupTicks: 45, activeTicks: 8, recoverTicks: 30, cooldownTicks: 150, damage: 50, length: 360, width: 24, knockback: 40, knockTicks: 8 },
  // The spec's 3 circles of 40 px striking after 60 ticks for 40; their spread, recovery and cooldown are 064's (raised).
  call: { windupTicks: 60, activeTicks: 1, recoverTicks: 30, cooldownTicks: 240, damage: 40, count: 3, radius: 40, spread: 64 },
  // The spec's 60-tick wind-up, 30 ticks of lightning and 45 damage; its width, recovery and cooldown are 064's (raised).
  chain: { windupTicks: 60, activeTicks: 30, recoverTicks: 30, cooldownTicks: 360, damage: 45, width: 16 },
  enrage: { below: 0.5, blinkTicks: 150 },
  drops: {
    always: [
      { itemId: 'conductor-core', min: 1, max: 1 },
      { itemId: 'stormglass', min: 6, max: 8 },
      { itemId: 'storm-coil', min: 1, max: 2 },
    ],
    chance: 0,
    oneOf: [],
  },
  xp: CONDUCTOR_XP,
  anims: 'conductor',
};
