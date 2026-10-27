import { describe, expect, it } from 'vitest';
import { schemeFromQuery } from '../../src/render/wandererScheme';

// 075: `?scheme=` swaps the wanderer's colour scheme in render, for comparing in the preview; a bad value is the default.

describe('the scheme query (075)', () => {
  it('reads cobalt, rust and bone, and anything else as cobalt', () => {
    expect(schemeFromQuery('?scheme=cobalt')).toBe('cobalt');
    expect(schemeFromQuery('?scheme=rust')).toBe('rust');
    expect(schemeFromQuery('?start=field&scheme=bone')).toBe('bone');
    expect(schemeFromQuery('')).toBe('cobalt');
    expect(schemeFromQuery('?scheme=')).toBe('cobalt');
    expect(schemeFromQuery('?scheme=Rust')).toBe('cobalt');
    expect(schemeFromQuery('?scheme=toString')).toBe('cobalt');
    expect(schemeFromQuery('?scheme=purple')).toBe('cobalt');
  });
});
