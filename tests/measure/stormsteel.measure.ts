import { describe, it } from 'vitest';
import type { PackFight } from '../sim/packBot';
import { STORM_PACK, stormPackClear } from '../sim/stormPackBot';
import { report, seconds, table } from './report';

// 066's measurement (docs/specs/066-stormsteel.md): 065's ring 5 pack fight (the decent five-entrance Lightning build,
// three arrow lines and two bomb lines) with every line's round at stormsteel against steel, over seeds 1–20. Recorded,
// not tuned: the ×1.6 over steel is a proposal for playtest. Timed from the first round fired at the pack to its last
// death (tests/sim/packBot.ts).

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

const outcome = (f: PackFight): string => (f.cleared ? 'cleared' : f.ko ? 'KO' : 'timeout');
const mean = (runs: readonly PackFight[]): number => seconds(runs.reduce((n, f) => n + f.ticks, 0) / runs.length);
const cleared = (runs: readonly PackFight[]): number => runs.filter((f) => f.cleared).length;
const kos = (runs: readonly PackFight[]): number => runs.filter((f) => f.ko).length;

describe('stormsteel rounds against steel (066)', () => {
  it('ring 5 pack, the decent five-entrance Lightning build (065), seeds 1–20', ({ task }) => {
    const steel = SEEDS.map((seed) => stormPackClear(seed, 'steel'));
    const storm = SEEDS.map((seed) => stormPackClear(seed, 'stormsteel'));
    const ratio = Math.round((mean(storm) / mean(steel)) * 100);
    report(
      task,
      {
        name: 'Ring 5 pack, stormsteel vs steel',
        target: 'none (066: recorded)',
        result: `steel ${mean(steel)} s mean (${cleared(steel)} cleared, ${kos(steel)} KO), stormsteel ${mean(storm)} s (${cleared(storm)} cleared, ${kos(storm)} KO): ${ratio}% of steel's time`,
        met: null,
      },
      `${STORM_PACK.ids.join(', ')}; lines: ${STORM_PACK.lines.join(', ')}\n` +
        table(
          ['seed', 'steel', 's', 'taken', 'stormsteel', 's', 'taken'],
          SEEDS.map((seed, i) => [seed, outcome(steel[i] as PackFight), seconds(steel[i]?.ticks ?? 0), steel[i]?.taken ?? 0, outcome(storm[i] as PackFight), seconds(storm[i]?.ticks ?? 0), storm[i]?.taken ?? 0]),
        ),
    );
  });
});
