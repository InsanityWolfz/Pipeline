import { describe, it } from 'vitest';
import { decentBot, fight, meets, MIN_SHARE, naiveBot, TARGET, type Fight } from '../sim/bulwarkBot';
import { report, seconds, table } from './report';

// 041.7's Bulwark targets, held after 041.16's changes (docs/specs/041-balance.md): the
// decent build wins in 60–90 s without a KO, taking at least 40% of its max health, on at
// least 15 of seeds 1–20 with at most 2 KOs (the fight is chaotic: any change moves each
// seed's numbers, so the target is a share of seeds); a naive bot walking into its front is
// KO'd first.

const ROBUST = Array.from({ length: 20 }, (_, i) => i + 1);
const PASSES = 15;
const KOS = 2;
const NAIVE = [1, 2, 3, 4, 5] as const;

const outcome = (r: Fight): string => (r.won ? 'won' : r.ko ? 'KO' : 'timeout');

describe('the Bulwark (041.7)', () => {
  it('a decent build over seeds 1–20', ({ task }) => {
    const runs = ROBUST.map((seed) => fight(seed, TARGET.max + 600, decentBot()));
    const passes = runs.filter(meets).length;
    const kos = runs.filter((r) => r.ko).length;
    const rows = runs.map((r, i) => [ROBUST[i] ?? 0, outcome(r), seconds(r.ticks), r.ticks, r.taken, r.share.toFixed(2), r.behind, meets(r)]);
    report(
      task,
      {
        name: 'Bulwark, decent build',
        target: `won in 60–90 s, no KO, share >= ${MIN_SHARE} on >= ${PASSES}/20; <= ${KOS} KOs`,
        result: `${passes}/20 meet all three, ${kos} KO`,
        met: passes >= PASSES && kos <= KOS,
      },
      table(['seed', 'outcome', 's', 'ticks', 'taken', 'share', 'behind', 'meets'], rows),
    );
  });

  it('a naive bot over seeds 1–5', ({ task }) => {
    const runs = NAIVE.map((seed) => fight(seed, TARGET.max * 2, naiveBot));
    const kod = runs.filter((r) => r.ko && !r.won).length;
    report(
      task,
      { name: 'Bulwark, naive bot', target: 'KO’d before it falls on every seed', result: `KO’d on ${kod}/${runs.length}`, met: kod === runs.length },
      table(['seed', 'outcome', 's', 'ticks', 'taken'], runs.map((r, i) => [NAIVE[i] ?? 0, outcome(r), seconds(r.ticks), r.ticks, r.taken])),
    );
  });
});
