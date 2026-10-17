import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED } from '../../src/data/config';
import { parseSeed } from '../../src/render/seed';

describe('parseSeed', () => {
  it('reads ?seed=', () => {
    expect(parseSeed('?seed=777')).toBe(777);
  });

  it('accepts 0 as a real seed', () => {
    expect(parseSeed('?seed=0')).toBe(0);
  });

  it('falls back to the default when missing or invalid', () => {
    for (const search of ['', '?seed=', '?seed=abc', '?seed=1.5', '?seed=-3', '?seed=4294967296']) {
      expect(parseSeed(search)).toBe(DEFAULT_SEED);
    }
  });
});
