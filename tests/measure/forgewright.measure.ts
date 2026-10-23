import { describe, it } from 'vitest';
import { decentBot, fight, TARGET, type Fight } from '../sim/forgewrightBot';
import { report, seconds, table } from './report';

// 060's Forgewright target (docs/specs/060-emberworks.md): a decent three-entrance build kills it in about 60–90 s
// with at most 2 KOs over seeds 1–20. Recorded, not tuned in the build.

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const KOS = 2;

const outcome = (r: Fight): string => (r.won ? 'won' : r.ko ? 'KO' : 'timeout');
const inTime = (r: Fight): boolean => r.won && r.ticks >= TARGET.min && r.ticks <= TARGET.max;

describe('the Forgewright (060)', () => {
  it('a decent three-entrance build over seeds 1–20', ({ task }) => {
    const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, decentBot()));
    const kos = runs.filter((r) => r.ko).length;
    const timed = runs.filter(inTime).length;
    const won = runs.filter((r) => r.won).length;
    const rows = runs.map((r, i) => [SEEDS[i] ?? 0, outcome(r), seconds(r.ticks), r.ticks, r.taken, r.share.toFixed(2), r.vents, inTime(r)]);
    report(
      task,
      {
        name: 'Forgewright, decent three-entrance build',
        target: `won in 60–90 s; <= ${KOS} KOs over 20 seeds`,
        result: `${won}/20 won, ${timed}/20 in 60–90 s, ${kos} KO`,
        met: kos <= KOS && timed === won && won === SEEDS.length - kos,
      },
      table(['seed', 'outcome', 's', 'ticks', 'taken', 'share', 'vents', '60–90 s'], rows),
    );
  });
});
