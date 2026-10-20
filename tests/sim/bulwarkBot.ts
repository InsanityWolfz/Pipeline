import type { EnemyState } from '../../src/sim/enemies';
import { angleDiff } from '../../src/sim/shield';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { ROLLER, steer, takenThisTick, walkTo } from './bots';
import { decentBuild, feed, lines } from './builds';
import { run } from './fight';
import { forum } from './forum';

// 041's Bulwark fights (test code), shared by tests/sim/bulwarkFight.test.ts and the
// measurements in tests/measure: 041.7's decent build, two entrances fed by an arrow line
// and a bomb line, level 7 with Fletcher's Eye, Quick Nock, Black Powder, Oiled Breech,
// Steady Grip and Hard Bore, four Common pieces at mid-roll (builds.ts), and two bots.

/** 041.7's fight length target, ticks: 60–90 s. */
export const TARGET = { min: 60 * 60, max: 90 * 60 } as const;
/** 041.7's damage target: at least this share of max health taken. */
export const MIN_SHARE = 0.4;

/** What a fight came to. */
export interface Fight {
  won: boolean;
  ko: boolean;
  ticks: number;
  /** Damage taken over the fight, HP, and as a share of the build's max health. */
  taken: number;
  share: number;
  /** Ticks the player spent behind it (outside its shield arc). */
  behind: number;
}

/** A bot: the command it sends each tick. */
export type Bot = (s: SimState, b: EnemyState) => Parameters<typeof run>[2];

/** Runs a fight for up to `limit` ticks, the bot choosing each tick's command. */
export function fight(seed: number, limit: number, bot: Bot): Fight {
  const { s, b } = forum(160, seed);
  decentBuild(s);
  lines(s, 'bomb', 'arrow');
  const max = playerStats(s).maxHealth;
  let taken = 0;
  let behind = 0;
  for (let t = 1; t <= limit; t++) {
    feed(s);
    if (Math.abs(angleDiff(b.angle, Math.atan2(s.player.y - b.y, s.player.x - b.x))) > Math.PI / 2) behind += 1;
    run(s, 1, bot(s, b));
    taken += takenThisTick(s);
    const end = (won: boolean, ko: boolean): Fight => ({ won, ko, ticks: t, taken, share: Math.round((taken / max) * 100) / 100, behind });
    if (s.bossDefeats.length > 0) return end(true, false);
    if (s.player.dying > 0) return end(false, true);
  }
  return { won: false, ko: false, ticks: limit, taken, share: taken / max, behind };
}

/** Whether a fight meets all three of 041.7's targets: won without a KO, in 60–90 s, taking at least 40% of max health. */
export const meets = (r: Fight): boolean => r.won && !r.ko && r.ticks >= TARGET.min && r.ticks <= TARGET.max && r.share >= MIN_SHARE;

/** The decent bot's distances: it circles 100 px out and steps out of the rear arc to 45° off its facing. */
const DECENT = { radius: 100, sideDeg: 45 } as const;

/**
 * 041.7's decent bot: it keeps behind the Bulwark when it can (circling to its back, 100 px out) and holds fire on it.
 * It reads every telegraph on screen a quarter second after it shows (the Bulwark's bombs, pound, stomp and back wave,
 * and its adds' lanes and arcs): it rolls through one as it lands, walks or rolls out in time of one a roll won't save
 * from (041.12's second ring), and steps out of the rear arc to its flank once it sees the stomp's half-disc, back once
 * it has landed. It never reads anything hidden, such as the stomp's counter.
 */
export function decentBot(): Bot {
  return (s, b) => {
    const p = s.player;
    const bearing = Math.atan2(p.y - b.y, p.x - b.x);
    const fromBack = angleDiff(bearing, b.angle + Math.PI);
    const out = b.mode === 'stomp-windup' && b.modeTicks >= ROLLER.react;
    const at = out ? b.angle + Math.sign(angleDiff(b.angle, bearing) || 1) * ((DECENT.sideDeg * Math.PI) / 180) : bearing + Math.sign(fromBack || 1) * Math.min(0.7, Math.abs(fromBack));
    const goal = { x: b.x + Math.cos(at) * DECENT.radius, y: b.y + Math.sin(at) * DECENT.radius };
    return { ...steer(s, goal, ROLLER).cmd, fire: true, aimX: b.x, aimY: b.y - 20 };
  };
}

/** The naive bot: walks straight at its front, fire held on it, never rolling. */
export const naiveBot: Bot = (s, b) => ({ ...walkTo(s, { x: b.x + Math.cos(b.angle) * 30, y: b.y + Math.sin(b.angle) * 30 }), fire: true, aimX: b.x, aimY: b.y - 20 });
