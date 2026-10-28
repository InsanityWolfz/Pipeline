import { TICK_RATE } from '../../src/data/config';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { HOMING } from '../../src/data/tags';
import { rodBox, rodPoint, standing, stormShielded } from '../../src/sim/conductorRods';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { tileCentre } from '../../src/sim/tiles';
import { CAREFUL, steer, takenThisTick, type Reading } from './bots';
import { decentBuild, feed, lines } from './builds';
import { run } from './fight';
import { CONDUCTOR, spire } from './spire';

// 064's Conductor fights (test code), shared by tests/sim/conductorFight.test.ts and the measurement in
// tests/measure/conductor.measure.ts: 041.7's decent build with four entrances fed by one round's lines (the spec's
// homing bolts, or plain arrows for the no-homing record), and a careful bot that keeps to the spire's middle (clear
// of the rod chain's hexagon), off the lash's line and out of the storm call's circles, firing at the Conductor where
// it last saw it (a blink read after a player's reaction delay, as every bot reads a telegraph). 068: with his storm
// shield, the rod breaker shoots his rods down first.

/** 068's target: a decent four-entrance homing-bolt build kills it in about 120–180 s (064's was 90–150 s). */
export const TARGET = { min: 120 * TICK_RATE, max: 180 * TICK_RATE } as const;

/** What a fight came to: won, KO'd or out of time; when; damage taken (HP, and a share of max health); its blinks. */
export interface Fight {
  won: boolean;
  ko: boolean;
  ticks: number;
  taken: number;
  share: number;
  blinks: number;
  /** 068: the first tick his storm shield was down (0: never). */
  shieldDown: number;
}

/** A bot: the command it sends each tick. */
export type Bot = (s: SimState, c: EnemyState) => Parameters<typeof run>[2];

/** Runs a fight for up to `limit` ticks from just inside the spire's door, four entrances fed with `round`. */
export function fight(seed: number, limit: number, bot: Bot, round: string): Fight {
  const enter = tileCentre(CROWN_SPIRE.door.enterTo);
  const middle = tileCentre(CROWN_SPIRE.middle);
  const { s, c } = spire(enter.y - middle.y, seed, enter.x - middle.x);
  // 080: the intro the helper stepped out (2.75 s) counts toward the fight's length, from walking in.
  const intro = s.tick;
  decentBuild(s);
  lines(s, round, round, round, round);
  const max = playerStats(s).maxHealth;
  let taken = 0;
  let blinks = 0;
  let shieldDown = 0;
  const end = (won: boolean, ko: boolean, t: number): Fight => ({ won, ko, ticks: t + intro, taken, share: Math.round((taken / max) * 100) / 100, blinks, shieldDown });
  for (let t = 1; t <= limit; t++) {
    feed(s);
    run(s, 1, bot(s, c));
    taken += takenThisTick(s);
    blinks += s.events.blinks.length;
    if (shieldDown === 0 && !stormShielded(c)) shieldDown = t;
    if (s.bossDefeats.includes('conductor')) return end(true, false, t);
    if (s.player.dying > 0) return end(false, true, t);
  }
  return end(false, false, limit);
}

/** The careful bot's numbers: it stands `off` from the middle, on the side away from the Conductor; the rod breaker stands `atRod` in from a rod it shoots. */
const CAREFUL_BOT = { off: 48, atRod: 56 } as const;

/**
 * The careful bot: near the spire's middle, a little off it away from the Conductor, walking round what it reads, fire
 * held at its body. It reads the Conductor's place as a player does (041's bot rule): after a blink it keeps to the old
 * spot, aim and all, until the new one has shown `read.react` ticks.
 */
export function carefulBot(read: Reading = CAREFUL): Bot {
  return shooter(read, false);
}

/**
 * 068's rod breaker: the careful bot, but while his storm shield holds (3 or more rods standing) it walks up to the
 * nearest standing rod clear of where it last saw him (so a homing bolt aimed there doesn't lock onto him) and shoots
 * it; with the shield down it goes back to firing at him.
 */
export function rodBreakerBot(read: Reading = CAREFUL): Bot {
  return shooter(read, true);
}

/** The careful bot's walk and reading, firing at him, or (`breaksRods`) at his rods while his shield holds. */
function shooter(read: Reading, breaksRods: boolean): Bot {
  const middle = tileCentre(CROWN_SPIRE.middle);
  let seen: { x: number; y: number } | null = null;
  let shown = 0;
  return (s, c) => {
    seen ??= { x: c.x, y: c.y };
    if (c.x === seen.x && c.y === seen.y) shown = 0;
    else if (++shown >= read.react) {
      seen = { x: c.x, y: c.y };
      shown = 0;
    }
    const d = Math.hypot(middle.x - seen.x, middle.y - seen.y) || 1;
    let goal = { x: middle.x + ((middle.x - seen.x) / d) * CAREFUL_BOT.off, y: middle.y + ((middle.y - seen.y) / d) * CAREFUL_BOT.off };
    let aim = { x: seen.x, y: seen.y + CONDUCTOR.hurtbox.offsetY };
    const rod = breaksRods && stormShielded(c) ? rodToBreak(c, seen, s.player) : null;
    if (rod !== null) {
      // Up close to it, on the middle's side, so the whole fan lands on it.
      const at = rodPoint(rod);
      const r = Math.hypot(middle.x - at.x, middle.y - at.y) || 1;
      goal = { x: at.x + ((middle.x - at.x) / r) * CAREFUL_BOT.atRod, y: at.y + ((middle.y - at.y) / r) * CAREFUL_BOT.atRod };
      const box = rodBox(CONDUCTOR, rod);
      aim = { x: box.x, y: box.y };
    }
    return { ...steer(s, goal, read).cmd, fire: true, aimX: aim.x, aimY: aim.y };
  };
}

/**
 * The rod to break: of the standing rods clear of where it last saw him (twice a homing round's lock radius, so a bolt
 * aimed at the rod never locks onto him), the one nearest the player; null if none is clear.
 */
function rodToBreak(c: EnemyState, seen: { x: number; y: number }, from: { x: number; y: number }): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const i of c.conductor.rods.keys()) {
    const p = rodPoint(i);
    if (!standing(c, i) || Math.hypot(p.x - seen.x, p.y - seen.y) < 2 * HOMING.lockRadius) continue;
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}
