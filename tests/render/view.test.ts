import { describe, expect, it } from 'vitest';
import { otherView, parseView } from '../../src/render/view';

describe('parseView', () => {
  it('reads top and 34', () => {
    expect(parseView('?view=top')).toBe('top');
    expect(parseView('?view=34&seed=2')).toBe('34');
  });

  it('defaults to three-quarter when missing or unknown', () => {
    expect(parseView('')).toBe('34');
    expect(parseView('?view=side')).toBe('34');
  });

  it('toggles between the two views', () => {
    expect(otherView('34')).toBe('top');
    expect(otherView('top')).toBe('34');
  });
});
