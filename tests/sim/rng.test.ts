import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from '../../src/sim/rng';

function sequence(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => nextFloat(rng));
}

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(sequence(1234, 1000)).toEqual(sequence(1234, 1000));
  });

  it('gives different sequences for different seeds', () => {
    expect(sequence(1, 100)).not.toEqual(sequence(2, 100));
  });

  it('keeps floats in [0, 1)', () => {
    for (const value of sequence(99, 10000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps ints inside the inclusive range and hits both ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = nextInt(rng, 3, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('continues the same sequence after saving and restoring its state', () => {
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) nextFloat(rng);
    const saved = JSON.parse(JSON.stringify(rng)) as typeof rng;
    const original = Array.from({ length: 100 }, () => nextFloat(rng));
    const restored = Array.from({ length: 100 }, () => nextFloat(saved));
    expect(restored).toEqual(original);
  });
});
