import { describe, it } from 'vitest';
import { CAP, clearTicks, FAMILIES, SCENARIOS, wins, type Family } from '../sim/ammoScenarios';
import { report, SEEDS, table } from './report';

// 041.9's ammo scenarios (docs/specs/041-balance.md): each family wins its own scenario,
// from one entrance with no talents, on seeds 1–5: the shortest time from its first round
// to the last death, by at least 10% over the next. A family that can't finish in 60 s
// scores 60 s and never wins. The scenarios draw no random numbers, so each seed plays out
// alike. By Shaun's answer to 041.14, bombs on the cluster and Homing ley bolts on the
// walled Wisps are recorded measurements, not targets, until more mechanics fold in.

describe('each ammo family wins its own scenario (041.9)', () => {
  it.for([
    ['line', 'arrow'],
    ['still', 'mine'],
  ] as const)('%s: %s over seeds 1–5', ([name, family], { task }) => {
    const runs = SEEDS.map((seed) => wins(seed, SCENARIOS[name], family));
    const won = runs.filter((r) => r.beaten === null).length;
    report(
      task,
      { name: `Ammo, ${name}: ${family}`, target: `${family} fastest by >= 10% on every seed`, result: `won ${won}/${runs.length}`, met: won === runs.length },
      table(['seed', 'ticks', 'beaten by'], runs.map((r, i) => [SEEDS[i] ?? 0, r.ticks, r.beaten ?? '-'])),
    );
  });

  // 041.14 (Shaun): balanced later, as more mechanics fold in; seed 1's time for each family is recorded.
  it.for(['cluster', 'walls'] as const)('%s: every family on seed 1 (recorded)', (name, { task }) => {
    const times = (Object.keys(FAMILIES) as Family[]).map((f) => ({ f, ticks: clearTicks(1, SCENARIOS[name], f, CAP) }));
    const best = times.reduce((a, b) => (b.ticks < a.ticks ? b : a));
    report(
      task,
      { name: `Ammo, ${name}`, target: 'none (041.14: recorded)', result: `fastest ${best.f} ${best.ticks} ticks`, met: null },
      table(['family', 'ticks', 'note'], times.map(({ f, ticks }) => [f, ticks, ticks >= CAP ? 'never finished (60 s)' : ''])),
    );
  });
});
