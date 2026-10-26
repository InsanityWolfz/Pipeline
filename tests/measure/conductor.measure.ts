import { describe, it } from 'vitest';
import { carefulBot, fight, rodBreakerBot, TARGET, type Bot, type Fight } from '../sim/conductorBot';
import { report, seconds, table } from './report';

// The Conductor's target (068, docs/specs/068-late-boss-buffs.md; 064's was 90–150 s): a decent four-entrance
// homing-bolt build, breaking rods to drop his storm shield, kills it in about 120–180 s with at most 2 KOs over seeds
// 1–20. Recorded beside it: a no-homing, no-rod-breaking build (plain arrows at his body), and plain arrows breaking
// rods. Recorded, not tuned.

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const KOS = 2;

const outcome = (r: Fight): string => (r.won ? 'won' : r.ko ? 'KO' : 'timeout');
const inTime = (r: Fight): boolean => r.won && r.ticks >= TARGET.min && r.ticks <= TARGET.max;

function record(task: Parameters<typeof report>[0], name: string, round: string, bot: () => Bot): void {
  const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, bot(), round));
  const kos = runs.filter((r) => r.ko).length;
  const timed = runs.filter(inTime).length;
  const won = runs.filter((r) => r.won).length;
  const rows = runs.map((r, i) => [SEEDS[i] ?? 0, outcome(r), seconds(r.ticks), r.ticks, r.taken, r.share.toFixed(2), r.blinks, r.shieldDown > 0 ? seconds(r.shieldDown) : '-', inTime(r)]);
  report(
    task,
    { name, target: `won in 120–180 s; <= ${KOS} KOs over 20 seeds`, result: `${won}/20 won, ${timed}/20 in 120–180 s, ${kos} KO`, met: kos <= KOS && timed === won && won === SEEDS.length - kos },
    table(['seed', 'outcome', 's', 'ticks', 'taken', 'share', 'blinks', 'shield down s', '120–180 s'], rows),
  );
}

describe('the Conductor (068)', () => {
  it('a decent four-entrance homing-bolt build, breaking rods, over seeds 1–20', ({ task }) => {
    record(task, 'Conductor, decent four-entrance homing-bolt build, breaking rods', 'ley-bolt+homing', rodBreakerBot);
  });

  it('a decent four-entrance no-homing, no-rod-breaking build (arrows at his body) over seeds 1–20, recorded', ({ task }) => {
    record(task, 'Conductor, decent four-entrance arrow build (no homing, no rod breaking)', 'arrow', carefulBot);
  });

  it('a decent four-entrance arrow build breaking rods (no homing) over seeds 1–20, recorded', ({ task }) => {
    record(task, 'Conductor, decent four-entrance arrow build, breaking rods (no homing)', 'arrow', rodBreakerBot);
  });
});
