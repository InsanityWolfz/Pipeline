import { introDue, introLength } from '../../src/sim/bossIntro';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { shrine } from './bossWake';
import { run } from './fight';
import { forum } from './forum';
import { hall } from './hall';
import { spire } from './spire';

// 080: tests that wake a boss step its intro out first. The intro holds the boss and its arena's posted enemies still
// and untargetable, and the player safe; the tick after its last is the boss's wake, as the first tick was before.

/**
 * Steps a due (or running) intro out to its last tick (the player standing, aim kept), so the next tick wakes the boss exactly as
 * the first tick did before 080. Returns the ticks stepped: 0 if no intro was due.
 */
export function runIntro(s: SimState): number {
  const running = s.enemies.some((x) => x.mode === 'intro');
  if (!running && !introDue(s)) return 0;
  if (!running) run(s, 1);
  const e = s.enemies.find((x) => x.mode === 'intro');
  if (!e) throw new Error('no intro started');
  const rest = introLength(s, e) - e.modeTicks;
  run(s, rest);
  return rest + (running ? 0 : 1);
}

export const BOSSES = ['pylon-warden', 'bulwark', 'forgewright', 'conductor'] as const;
export type Boss = (typeof BOSSES)[number];

/** The player just inside each boss's arena, its intro not yet started. */
export function entered(boss: Boss): { s: SimState; b: EnemyState } {
  if (boss === 'pylon-warden') {
    const { s, w } = shrine();
    return { s, b: w };
  }
  if (boss === 'bulwark') return forum(160, 11, false);
  if (boss === 'forgewright') {
    const { s, f } = hall(160, 11, 0, false);
    return { s, b: f };
  }
  const { s, c } = spire(0, 11, 0, false);
  return { s, b: c };
}
