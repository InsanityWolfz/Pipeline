import { describe, it } from 'vitest';
import { EMBER_PACK, emberPackClear, type PackFight } from '../sim/packBot';
import { report, seconds, table, ticks } from './report';

// 061's ring 4 target (docs/specs/061-emberworks-enemies.md): a decent four-entrance Fire build clears a ring 4 pack
// in about 15–30 s with at most one KO over seeds 1–20. Recorded, not tuned in the build. Timed from the first round
// fired at the pack to its last death, the golem's whelps included (tests/sim/packBot.ts).

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const BAND = { min: 15, max: 30 } as const;
const KOS = 1;

const outcome = (f: PackFight): string => (f.cleared ? 'cleared' : f.ko ? 'KO' : 'timeout');
const inBand = (f: PackFight): boolean => f.cleared && f.ticks >= ticks(BAND.min) && f.ticks <= ticks(BAND.max);

describe('ring 4 packs (061)', () => {
  it('a decent four-entrance Fire build over seeds 1–20', ({ task }) => {
    const runs = SEEDS.map(emberPackClear);
    const kos = runs.filter((f) => f.ko).length;
    const met = runs.filter(inBand).length;
    const cleared = runs.filter((f) => f.cleared);
    const times = cleared.map((f) => seconds(f.ticks));
    report(
      task,
      {
        name: 'Ring 4 pack, decent four-entrance Fire build',
        target: `${BAND.min}–${BAND.max} s; <= ${KOS} KO over 20 seeds`,
        result: `${met}/20 in band, ${cleared.length}/20 cleared${times.length ? ` in ${Math.min(...times)}–${Math.max(...times)} s` : ''}, ${kos} KO`,
        met: kos <= KOS && met === SEEDS.length - kos,
      },
      `${EMBER_PACK.ids.join(', ')}; ${EMBER_PACK.lines.join(', ')} lines\n` +
        table(['seed', 'outcome', 's', 'ticks', 'taken', 'in band'], runs.map((f, i) => [SEEDS[i] ?? 0, outcome(f), seconds(f.ticks), f.ticks, f.taken, inBand(f)])),
    );
  });
});
