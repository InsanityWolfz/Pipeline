import { describe, expect, it } from 'vitest';
import { CACHE_BURST } from '../../src/data/landmarks';
import { burstPhase } from '../../src/render/cacheBurst';

// 045: a cache's item waits in the chest for its turn, flies out, lies there with its name, then is the magnet's.

const B = CACHE_BURST;
const total = (delay: number) => delay + B.flightTicks + B.holdTicks;
const at = (delay: number, elapsed: number) => burstPhase({ burst: { x: 0, y: 0, delay }, wait: total(delay) - elapsed });

describe('the cache burst (045)', () => {
  it('waits in the chest for its turn, flies, then lands and waits', () => {
    expect(at(12, 0)).toEqual({ phase: 'chest' });
    expect(at(12, 11)).toEqual({ phase: 'chest' });
    expect(at(12, 12)).toEqual({ phase: 'flight', t: 0 });
    expect(at(12, 12 + B.flightTicks / 2)).toEqual({ phase: 'flight', t: 0.5 });
    expect(at(12, 12 + B.flightTicks)).toEqual({ phase: 'landed' });
  });

  it('is over once the wait runs out, and never for an ordinary drop', () => {
    expect(at(0, total(0))).toBeNull();
    expect(burstPhase({})).toBeNull();
    expect(burstPhase({ wait: 5 })).toBeNull();
  });

  it('the timings are data, about a second from opening to the first pull', () => {
    expect(B.flightTicks + B.holdTicks).toBeGreaterThanOrEqual(30);
    expect(B.flightTicks + B.holdTicks).toBeLessThanOrEqual(90);
    expect(B.staggerTicks).toBeGreaterThan(0);
  });
});
