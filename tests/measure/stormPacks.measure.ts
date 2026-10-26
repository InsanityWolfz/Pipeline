import { describe, it } from 'vitest';
import type { PackFight } from '../sim/packBot';
import { STORM_PACK, stormPackClear } from '../sim/stormPackBot';
import { report, seconds, table } from './report';

// 065's ring 5 packs (docs/specs/065-stormcrown-enemies.md): a decent five-entrance Lightning build against a ring 5
// pack (×10), at steel and at stone, over seeds 1–20. Recorded, not tuned: the spec sets no target. Timed from the
// first round fired at the pack to its last death (tests/sim/packBot.ts).

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

const outcome = (f: PackFight): string => (f.cleared ? 'cleared' : f.ko ? 'KO' : 'timeout');

describe('ring 5 packs (065)', () => {
  for (const tier of ['steel', 'stone'] as const) {
    it(`a decent five-entrance ${tier} Lightning build over seeds 1–20`, ({ task }) => {
      const runs = SEEDS.map((seed) => stormPackClear(seed, tier));
      const kos = runs.filter((f) => f.ko).length;
      const cleared = runs.filter((f) => f.cleared);
      const times = cleared.map((f) => seconds(f.ticks));
      report(
        task,
        {
          name: `Ring 5 pack, decent five-entrance ${tier} Lightning build`,
          target: 'recorded (no target)',
          result: `${cleared.length}/20 cleared${times.length ? ` in ${Math.min(...times)}–${Math.max(...times)} s` : ''}, ${kos} KO, ${runs.filter((f) => !f.cleared && !f.ko).length} timed out`,
          met: true,
        },
        `${STORM_PACK.ids.join(', ')}; ${tier}: ${STORM_PACK.lines.join(', ')} lines\n` +
          table(['seed', 'outcome', 's', 'ticks', 'taken'], runs.map((f, i) => [SEEDS[i] ?? 0, outcome(f), seconds(f.ticks), f.ticks, f.taken])),
      );
    });
  }
});
