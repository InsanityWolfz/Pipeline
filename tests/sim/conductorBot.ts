import { TICK_RATE } from '../../src/data/config';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { tileCentre } from '../../src/sim/tiles';
import { CAREFUL, steer, takenThisTick } from './bots';
import { decentBuild, feed, lines } from './builds';
import { run } from './fight';
import { CONDUCTOR, spire } from './spire';

// 064's Conductor fights (test code), shared by tests/sim/conductorFight.test.ts and the measurement in
// tests/measure/conductor.measure.ts: 041.7's decent build with four entrances fed by one round's lines (the spec's
// homing bolts, or plain arrows for the no-homing record), and a careful bot that keeps to the spire's middle (clear
// of the rod chain's hexagon), off the lash's line and out of the storm call's circles, firing at the Conductor.

/** The spec's target: a decent four-entrance homing-bolt build kills it in about 90–150 s. */
export const TARGET = { min: 90 * TICK_RATE, max: 150 * TICK_RATE } as const;

/** What a fight came to: won, KO'd or out of time; when; damage taken (HP, and a share of max health); its blinks. */
export interface Fight {
  won: boolean;
  ko: boolean;
  ticks: number;
  taken: number;
  share: number;
  blinks: number;
}

/** A bot: the command it sends each tick. */
export type Bot = (s: SimState, c: EnemyState) => Parameters<typeof run>[2];

/** Runs a fight for up to `limit` ticks from just inside the spire's door, four entrances fed with `round`. */
export function fight(seed: number, limit: number, bot: Bot, round: string): Fight {
  const enter = tileCentre(CROWN_SPIRE.door.enterTo);
  const middle = tileCentre(CROWN_SPIRE.middle);
  const { s, c } = spire(enter.y - middle.y, seed, enter.x - middle.x);
  decentBuild(s);
  lines(s, round, round, round, round);
  const max = playerStats(s).maxHealth;
  let taken = 0;
  let blinks = 0;
  const end = (won: boolean, ko: boolean, t: number): Fight => ({ won, ko, ticks: t, taken, share: Math.round((taken / max) * 100) / 100, blinks });
  for (let t = 1; t <= limit; t++) {
    feed(s);
    run(s, 1, bot(s, c));
    taken += takenThisTick(s);
    blinks += s.events.blinks.length;
    if (s.bossDefeats.includes('conductor')) return end(true, false, t);
    if (s.player.dying > 0) return end(false, true, t);
  }
  return end(false, false, limit);
}

/** The careful bot's numbers: it stands this far from the middle, on the side away from the Conductor. */
const CAREFUL_BOT = { off: 48 } as const;

/** The careful bot: near the spire's middle, a little off it away from the Conductor, walking round what it reads, fire held at its body. */
export function carefulBot(): Bot {
  const middle = tileCentre(CROWN_SPIRE.middle);
  return (s, c) => {
    const d = Math.hypot(middle.x - c.x, middle.y - c.y) || 1;
    const goal = { x: middle.x + ((middle.x - c.x) / d) * CAREFUL_BOT.off, y: middle.y + ((middle.y - c.y) / d) * CAREFUL_BOT.off };
    return { ...steer(s, goal, CAREFUL).cmd, fire: true, aimX: c.x, aimY: c.y + CONDUCTOR.hurtbox.offsetY };
  };
}
