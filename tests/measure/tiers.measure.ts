import { describe, it } from 'vitest';
import type { PackFight } from '../sim/packBot';
import { ringFourClear, ringThreeClear } from '../sim/tierPacks';
import { report, seconds, SEEDS, table } from './report';

// 062's measurement (docs/specs/062-material-tiers.md): the same builds' pack-clear times with steel rounds against
// stone, in ring 3 (041.8's pack and volley, seeds 1–5) and ring 4 (061's decent Fire build, seeds 1–20). Recorded,
// not tuned: the ×1.6 is a proposal for playtest.

const RING4_SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

const outcome = (f: PackFight): string => (f.cleared ? 'cleared' : f.ko ? 'KO' : 'timeout');
const mean = (runs: readonly PackFight[]): number => seconds(runs.reduce((n, f) => n + f.ticks, 0) / runs.length);

function compare(name: string, seeds: readonly number[], fight: (seed: number, tier: 'stone' | 'steel') => PackFight, task: Parameters<typeof report>[0]): void {
  const stone = seeds.map((seed) => fight(seed, 'stone'));
  const steel = seeds.map((seed) => fight(seed, 'steel'));
  const cleared = (runs: readonly PackFight[]): number => runs.filter((f) => f.cleared).length;
  const kos = (runs: readonly PackFight[]): number => runs.filter((f) => f.ko).length;
  const ratio = Math.round((mean(steel) / mean(stone)) * 100);
  report(
    task,
    {
      name,
      target: 'none (062: recorded)',
      result: `stone ${mean(stone)} s mean (${cleared(stone)} cleared, ${kos(stone)} KO), steel ${mean(steel)} s (${cleared(steel)} cleared, ${kos(steel)} KO): ${ratio}% of stone's time`,
      met: null,
    },
    table(
      ['seed', 'stone', 's', 'taken', 'steel', 's', 'taken'],
      seeds.map((seed, i) => [seed, outcome(stone[i] as PackFight), seconds(stone[i]?.ticks ?? 0), stone[i]?.taken ?? 0, outcome(steel[i] as PackFight), seconds(steel[i]?.ticks ?? 0), steel[i]?.taken ?? 0]),
    ),
  );
}

describe('steel rounds against stone (062)', () => {
  it('ring 3 pack, its own volley (041.8), seeds 1–5', ({ task }) => compare('Ring 3 pack, steel vs stone', SEEDS, ringThreeClear, task));
  it('ring 4 pack, the decent Fire build (061), seeds 1–20', ({ task }) => compare('Ring 4 pack, steel vs stone', RING4_SEEDS, ringFourClear, task));
});
