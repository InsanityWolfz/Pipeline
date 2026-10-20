import { describe, expect, it } from 'vitest';
import type { EnemyState } from '../../src/sim/enemies';
import { angleDiff } from '../../src/sim/shield';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { ROLLER, steer, takenThisTick, walkTo } from './bots';
import { decentBuild, feed, lines } from './builds';
import { run } from './fight';
import { forum } from './forum';

// 041's Bulwark targets (041.7, held after 041.16's changes), seeds 1–5: a decent build wins
// in 60–90 s without a KO, taking real damage, and a naive bot that walks into its front is
// KO'd first. The build: two entrances fed by an arrow line and a bomb line, level 7 with Fletcher's Eye, Quick Nock, Black Powder,
// Oiled Breech, Steady Grip and Hard Bore, four Common pieces at mid-roll (builds.ts).
// Measured (ticks to the kill / damage taken, share of max health): see each test.

const SEEDS = [1, 2, 3, 4, 5] as const;
const TARGET = { min: 60 * 60, max: 90 * 60 } as const;

/** What a fight came to. */
interface Fight {
  won: boolean;
  ko: boolean;
  ticks: number;
  /** Damage taken over the fight, HP, and as a share of the build's max health. */
  taken: number;
  share: number;
  /** Ticks the player spent behind it (outside its shield arc). */
  behind: number;
}

/** Runs a fight for up to `limit` ticks, the bot choosing each tick's command. */
function fight(seed: number, limit: number, bot: (s: SimState, b: EnemyState) => Parameters<typeof run>[2]): Fight {
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

/** The decent bot's distances: it circles 100 px out and steps out of the rear arc to 45° off its facing. */
const DECENT = { radius: 100, sideDeg: 45 } as const;

/**
 * 041.7's decent bot: it keeps behind the Bulwark when it can (circling to its back, 100 px out) and holds fire on it.
 * It reads every telegraph on screen a quarter second after it shows (the Bulwark's bombs, pound, stomp and back wave,
 * and its adds' lanes and arcs): it rolls through one as it lands, walks or rolls out in time of one a roll won't save
 * from (041.12's second ring), and steps out of the rear arc to its flank once it sees the stomp's half-disc, back once
 * it has landed. It never reads anything hidden, such as the stomp's counter.
 */
function decentBot(): (s: SimState, b: EnemyState) => Parameters<typeof run>[2] {
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
const naiveBot = (s: SimState, b: EnemyState): Parameters<typeof run>[2] => ({ ...walkTo(s, { x: b.x + Math.cos(b.angle) * 30, y: b.y + Math.sin(b.angle) * 30 }), fire: true, aimX: b.x, aimY: b.y - 20 });

let decentRuns: Fight[] | null = null;
/** The decent fights, run once for this file's tests. */
const decent = (): Fight[] => (decentRuns ??= SEEDS.map((seed) => fight(seed, TARGET.max + 600, decentBot())));

describe('the Bulwark with a decent build (041.7, 041.16)', () => {
  // Five fights of up to 6,000 ticks, all bot and sim, no idle time: about 4 s on a quiet machine, so it gets its own budget.
  it('wins in 60–90 s on every seed, without a KO, taking at least 40% of its max health', () => {
    const runs = decent();
    console.log('041 Bulwark, decent build (ticks, damage taken, share of max health, ticks behind):', runs.map((r) => `${r.ticks} ${r.taken} ${r.share} ${r.behind}`).join(' | '));
    // Measured: 4,287 / 5,059 / 4,198 / 4,433 / 4,015 ticks (71.5, 84.3, 70.0, 73.9, 66.9 s), shares 0.61 / 0.83 / 0.79 /
    // 0.88 / 0.86. Seeds 6–20 for robustness (not asserted): 12 of those 15 also meet all three; two take under 40%
    // and two are KO'd.
    for (const [i, r] of runs.entries()) {
      expect(r, `seed ${SEEDS[i]}`).toMatchObject({ won: true, ko: false });
      expect(r.ticks, `seed ${SEEDS[i]}`).toBeGreaterThanOrEqual(TARGET.min);
      expect(r.ticks, `seed ${SEEDS[i]}`).toBeLessThanOrEqual(TARGET.max);
      expect(r.share, `seed ${SEEDS[i]}`).toBeGreaterThanOrEqual(0.4);
    }
  }, 60_000);
});

describe('a naive bot (041.7)', () => {
  // Five fights KO'd at about 900 ticks each: well under a second.
  it('walking at its front, holding fire and never rolling, is KO’d before it falls on every seed', () => {
    const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, naiveBot));
    console.log('041 Bulwark, naive bot (ticks to KO):', runs.map((r) => r.ticks).join(' '));
    for (const [i, r] of runs.entries()) expect(r, `seed ${SEEDS[i]}`).toMatchObject({ won: false, ko: true });
  }, 20_000);
});
