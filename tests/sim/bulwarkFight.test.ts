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
/** 041.7's damage target: at least this share of max health taken. */
const MIN_SHARE = 0.4;
/** The decent build is held to a pass rate over these seeds (review): at least ROBUST_PASSES meet all three targets, at most ROBUST_KOS are KO'd. */
const ROBUST = Array.from({ length: 20 }, (_, i) => i + 1);
const ROBUST_PASSES = 15;
const ROBUST_KOS = 2;

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


describe('the Bulwark with a decent build (041.7, 041.16)', () => {
  // Twenty fights of up to 6,000 ticks, all bot and sim, no idle time: about 15 s on a quiet machine, so it gets its own budget.
  it('wins in 60–90 s without a KO, taking at least 40% of its max health, on at least 15 of seeds 1–20, with at most 2 KOs', () => {
    const runs = ROBUST.map((seed) => fight(seed, TARGET.max + 600, decentBot()));
    const meets = (r: Fight): boolean => r.won && !r.ko && r.ticks >= TARGET.min && r.ticks <= TARGET.max && r.share >= MIN_SHARE;
    console.log('041 Bulwark, decent build, seeds 1–20 (ticks, damage taken, share of max health, ticks behind; * meets all three):', runs.map((r, i) => `${ROBUST[i]}: ${r.ko ? 'KO ' : ''}${r.ticks} ${r.taken} ${r.share} ${r.behind}${meets(r) ? ' *' : ''}`).join(' | '));
    // A chaotic fight: any change moves each seed's numbers, so the target is a share of seeds, not five picked ones.
    expect(runs.filter(meets).length).toBeGreaterThanOrEqual(ROBUST_PASSES);
    expect(runs.filter((r) => r.ko).length).toBeLessThanOrEqual(ROBUST_KOS);
  }, 120_000);
});

describe('a naive bot (041.7)', () => {
  // Five fights KO'd at about 900 ticks each: well under a second.
  it('walking at its front, holding fire and never rolling, is KO’d before it falls on every seed', () => {
    const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, naiveBot));
    console.log('041 Bulwark, naive bot (ticks to KO):', runs.map((r) => r.ticks).join(' '));
    for (const [i, r] of runs.entries()) expect(r, `seed ${SEEDS[i]}`).toMatchObject({ won: false, ko: true });
  }, 20_000);
});
