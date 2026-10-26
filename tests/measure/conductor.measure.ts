import { describe, it } from 'vitest';
import { carefulBot, fight, TARGET, type Fight } from '../sim/conductorBot';
import { report, seconds, table } from './report';

// 064's Conductor target (docs/specs/064-stormcrown.md): a decent four-entrance homing-bolt build kills it in about
// 90–150 s with at most 2 KOs over seeds 1–20; a no-homing build (plain arrows) recorded beside it. Recorded, not tuned.

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const KOS = 2;

const outcome = (r: Fight): string => (r.won ? 'won' : r.ko ? 'KO' : 'timeout');
const inTime = (r: Fight): boolean => r.won && r.ticks >= TARGET.min && r.ticks <= TARGET.max;

function record(task: Parameters<typeof report>[0], name: string, round: string): void {
  const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, carefulBot(), round));
  const kos = runs.filter((r) => r.ko).length;
  const timed = runs.filter(inTime).length;
  const won = runs.filter((r) => r.won).length;
  const rows = runs.map((r, i) => [SEEDS[i] ?? 0, outcome(r), seconds(r.ticks), r.ticks, r.taken, r.share.toFixed(2), r.blinks, inTime(r)]);
  report(
    task,
    { name, target: `won in 90–150 s; <= ${KOS} KOs over 20 seeds`, result: `${won}/20 won, ${timed}/20 in 90–150 s, ${kos} KO`, met: kos <= KOS && timed === won && won === SEEDS.length - kos },
    table(['seed', 'outcome', 's', 'ticks', 'taken', 'share', 'blinks', '90–150 s'], rows),
  );
}

describe('the Conductor (064)', () => {
  it('a decent four-entrance homing-bolt build over seeds 1–20', ({ task }) => {
    record(task, 'Conductor, decent four-entrance homing-bolt build', 'ley-bolt+homing');
  });

  it('a decent four-entrance no-homing build (arrows) over seeds 1–20, recorded', ({ task }) => {
    record(task, 'Conductor, decent four-entrance arrow build (no homing)', 'arrow');
  });
});
