import { describe, it } from 'vitest';
import { PACKS, packClear, type PackFight } from '../sim/packBot';
import { report, seconds, SEEDS, table, ticks } from './report';

// 041.8's ring-matched packs (docs/specs/041-balance.md): a pack cleared with a fitting
// volley, timed from the first round fired at it to its last death, on seeds 1–5. Ring 3
// in 8–18 s (041.13, Shaun), rings 1 and 2 within 15 s and recorded (no floor), never KO'd.
// Damage taken is printed (041.11). Each pack stands on open ground in its ring
// (tests/sim/packBot.ts), the player 6 to 7 tiles off.

/** Each ring's band, seconds. */
const BAND: Record<keyof typeof PACKS, { min: number; max: number }> = { 1: { min: 0, max: 15 }, 2: { min: 0, max: 15 }, 3: { min: 8, max: 18 } };

describe('ring-matched packs (041.8)', () => {
  it.for([1, 2, 3] as const)('ring %i over seeds 1–5', (ring, { task }) => {
    const band = BAND[ring];
    const inBand = (f: PackFight): boolean => f.cleared && !f.ko && f.ticks >= ticks(band.min) && f.ticks <= ticks(band.max);
    const runs = SEEDS.map((seed) => packClear(ring, seed));
    const met = runs.filter(inBand).length;
    const times = runs.map((f) => seconds(f.ticks));
    report(
      task,
      {
        name: `Ring ${ring} pack`,
        target: `${band.min > 0 ? `${band.min}–${band.max} s` : `<= ${band.max} s`}, never KO’d, every seed`,
        result: `${met}/${runs.length} in band, ${Math.min(...times)}–${Math.max(...times)} s`,
        met: met === runs.length,
      },
      `${PACKS[ring].ids.join(', ')}; ${PACKS[ring].lines.join(' and ')} lines\n` +
        table(['seed', 'cleared', 'KO', 's', 'ticks', 'taken', 'in band'], runs.map((f, i) => [SEEDS[i] ?? 0, f.cleared, f.ko, seconds(f.ticks), f.ticks, f.taken, inBand(f)])),
    );
  });
});
