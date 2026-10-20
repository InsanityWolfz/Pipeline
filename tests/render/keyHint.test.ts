import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { boundLetter, keyLabel, withKeys } from '../../src/render/keyHint';

// 042: every on-screen key hint shows the bound key, not a fixed letter.

const rebound = { ...DEFAULT_BINDINGS, interact: 'Q', menu: 'V', build: 'N', flip: 'X', dodge: 'SHIFT' };

describe('key hints (042)', () => {
  it('leaves hints as they are with the default keys', () => {
    for (const t of ['Craft arrows (C)', 'Press B and place a hopper', 'Hold E to break the seal.', 'E sets it, G flips the side.', 'Level 7 · talent point (T)'])
      expect(withKeys(t, DEFAULT_BINDINGS)).toBe(t);
  });

  it('shows the bound key in every kind of hint', () => {
    expect(withKeys('Craft arrows (C)', rebound)).toBe('Craft arrows (V)');
    expect(withKeys('Press B and place a hopper', rebound)).toBe('Press N and place a hopper');
    expect(withKeys('Hold E to break the seal.', rebound)).toBe('Hold Q to break the seal.');
    expect(withKeys('Restore a part at its diagram in the foundry: walk up and press E.', rebound)).toBe('Restore a part at its diagram in the foundry: walk up and press Q.');
    expect(withKeys('Sends one chosen item out its side. E sets it, G flips the side.', rebound)).toBe('Sends one chosen item out its side. Q sets it, X flips the side.');
  });

  it("names keys as they read: Space, 1, Shift; leaves other capitals alone", () => {
    expect(keyLabel('SPACE')).toBe('Space');
    expect(keyLabel('ONE')).toBe('1');
    expect(boundLetter('E', rebound)).toBe('Q');
    expect(withKeys('The Bulwark (A) waits', rebound)).toBe('The Bulwark (A) waits');
    expect(withKeys('Ley Spring', rebound)).toBe('Ley Spring');
  });
});
