import { BOSS_WEIGHT } from './combat';
import type { AttackTiming, EnemyBase } from './enemyBase';
import { FORGEWRIGHT_XP } from './leveling';

// The Forgewright (060): the Emberworks' boss, a plated smith construct in the Anvil Hall. Its plating blocks every
// hit on its body until it is vented, by breaking both its bellows (one on each side of it, 2 tiles out, square to
// its facing) at once, or one then the other before the first patches itself. A heat gauge fills toward its Forge
// Flood; up close it slams its hammer, at range it sprays embers. All numbers are starting values from the spec,
// tuned in playtest; the ones the spec doesn't give are marked (060's raised items).

/** One bellows' numbers: where it sits, its hurtbox, its health and how long it stays broken. */
export interface BellowsDef {
  /** Px from the Forgewright's feet, square to its facing, each side. */
  offset: number;
  /** Box hits land in, px, centred `offsetY` above its ground point (as an enemy's hurtbox is above its feet). */
  hurtbox: { w: number; h: number; offsetY: number };
  health: number;
  /** A broken bellows patches itself back to full after this long, ticks. */
  patchTicks: number;
}

/** The Forgewright: plated, two bellows, heat toward the Forge Flood, a hammer slam and an ember spray. */
export interface ForgewrightDef extends EnemyBase {
  kind: 'forgewright';
  /** It turns to face the player at no more than this, °/s; its bellows turn with it. */
  turnDegPerSec: number;
  /** Ticks with the player outside its arena before it walks home and heals (the Bulwark's rule, 034). */
  leashTicks: number;
  /** It stops walking at this fraction of the slam's trigger range from the player. */
  standOff: number;
  bellows: BellowsDef;
  /** Both bellows broken at once: it staggers this long, plating open, heat to 0; then both come back whole. */
  ventTicks: number;
  /** Its heat gauge, 0 to `max`, filling over `fillTicks` (each Chill stack slows it as it slows a walk). */
  heat: { max: number; fillTicks: number };
  /**
   * The Forge Flood at full heat: it raises its hammer for `windupTicks` while the half of the hall the player stands in
   * is shaded red, brings it down (the pose holds `swipeTicks`, then `recoverTicks`), and fire pools cover that half for
   * `floodTicks`, dealing `damage` every `everyTicks` to a player standing in them. Heat resets to 0 as they dry.
   */
  flood: { windupTicks: number; swipeTicks: number; recoverTicks: number; floodTicks: number; damage: number; everyTicks: number };
  /** The hammer slam: with the player's feet within `triggerRange`, a red circle of `radius` px `reach` px ahead of it grows over the wind-up, then lands. */
  slam: AttackTiming & { triggerRange: number; reach: number; radius: number; damage: number; knockback: number; knockTicks: number };
  /** The ember spray at range: `count` embers fanned over `coneDegrees` toward the player after the wind-up, each a slow orb. */
  spray: AttackTiming & { count: number; coneDegrees: number; speed: number; damage: number; range: number; size: number; knockback: number; knockTicks: number };
  /** Below `below` of its health, heat fills `heatRate` times as fast. */
  enrage: { below: number; heatRate: number };
}

export const FORGEWRIGHT: ForgewrightDef = {
  kind: 'forgewright',
  id: 'forgewright',
  name: 'Forgewright',
  boss: true,
  maxHealth: 4000,
  // 060 (raised): "walking slowly"; a little slower than the Bulwark's 18.
  walkSpeed: 16,
  feetBox: { w: 40, h: 16 },
  hurtbox: { w: 52, h: 64, offsetY: -28 },
  weight: BOSS_WEIGHT,
  hitKnockTicks: 4,
  hitFlashTicks: 6,
  homeTolerance: 4,
  // 060 (raised): it turns to face the player at 60°/s, so a player who circles can line up its bellows.
  turnDegPerSec: 60,
  leashTicks: 300,
  standOff: 0.75,
  /** 2 tiles out each side (128 px apart face-on); the box is 060's (raised). */
  bellows: { offset: 64, hurtbox: { w: 30, h: 30, offsetY: -24 }, health: 150, patchTicks: 240 },
  ventTicks: 360,
  heat: { max: 100, fillTicks: 1800 },
  // The spec's 90-tick wind-up, 300 ticks of pools at 20 a second; the pose's hold and recovery are 060's (raised).
  flood: { windupTicks: 90, swipeTicks: 12, recoverTicks: 30, floodTicks: 300, damage: 20, everyTicks: 60 },
  // The spec's 54-tick wind-up and 45 damage; its range, reach, radius, knock and cooldown are 060's (raised).
  slam: { triggerRange: 80, reach: 40, radius: 48, windupTicks: 54, swipeTicks: 8, recoverTicks: 48, cooldownTicks: 150, damage: 45, knockback: 40, knockTicks: 8 },
  // The spec's 7 embers over 45° at 120 px/s for 20 each after 45 ticks; their range, box, knock and cooldown are 060's (raised).
  spray: { count: 7, coneDegrees: 45, speed: 120, damage: 20, range: 360, size: 10, knockback: 10, knockTicks: 4, windupTicks: 45, swipeTicks: 10, recoverTicks: 30, cooldownTicks: 180 },
  enrage: { below: 0.5, heatRate: 1.5 },
  drops: {
    always: [
      { itemId: 'forgewright-core', min: 1, max: 1 },
      { itemId: 'cinderite', min: 6, max: 8 },
      { itemId: 'forge-rivet', min: 1, max: 2 },
    ],
    chance: 0,
    oneOf: [],
  },
  xp: FORGEWRIGHT_XP,
  anims: 'forgewright',
};
