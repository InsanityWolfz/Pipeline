import { describe, expect, it } from 'vitest';
import { lazyWorld, NO_WORLD } from '../../src/render/world/worldShown';

// 077 (review): the world's report walks every built chunk only when the test hook reads it, never each frame.

describe('world report (077)', () => {
  it('works out the chunks only when they are read, and afresh each read', () => {
    let walks = 0;
    const shown = lazyWorld({ ...NO_WORLD, swayUpdated: 3 }, () => {
      walks += 1;
      return [{ key: '0,0', plants: walks, vines: 0, trees: 0, variants: 0, setPieces: [], shown: true }];
    });
    expect(walks).toBe(0);
    expect(shown.swayUpdated).toBe(3);
    expect(walks).toBe(0);
    expect(shown.chunks[0]?.plants).toBe(1);
    expect(shown.chunks[0]?.plants).toBe(2);
    // A copy (as the hook's JSON makes) carries them.
    expect(JSON.parse(JSON.stringify(shown)).chunks).toHaveLength(1);
  });
});
