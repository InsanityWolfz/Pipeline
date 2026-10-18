import { describe, expect, it } from 'vitest';
import { clickMods, isLeftPress } from '../../src/render/clickInput';
import { clickAmount } from '../../src/render/menuRequests';

// 022 review: on macOS Phaser reports Ctrl+left-click as a right click, so a left
// press is read off the DOM event's button whenever Ctrl is held.

describe('isLeftPress', () => {
  it('trusts the DOM button when Ctrl is held, whatever Phaser says', () => {
    expect(isLeftPress({ button: 0, ctrlKey: true }, false)).toBe(true);
    expect(isLeftPress({ button: 2, ctrlKey: true }, false)).toBe(false);
  });

  it("goes by Phaser's left button otherwise", () => {
    expect(isLeftPress({ button: 0, ctrlKey: false }, true)).toBe(true);
    expect(isLeftPress({ button: 2, ctrlKey: false }, false)).toBe(false);
  });

  it('a touch (no button) goes by Phaser', () => {
    expect(isLeftPress({ ctrlKey: true }, true)).toBe(true);
  });
});

describe('clickMods and clickAmount', () => {
  it('a plain click is one, Shift half, Ctrl all, and Ctrl wins over Shift', () => {
    expect(clickAmount(clickMods({ shiftKey: false, ctrlKey: false }))).toBe('one');
    expect(clickAmount(clickMods({ shiftKey: true, ctrlKey: false }))).toBe('half');
    expect(clickAmount(clickMods({ shiftKey: false, ctrlKey: true }))).toBe('all');
    expect(clickAmount(clickMods({ shiftKey: true, ctrlKey: true }))).toBe('all');
  });
});
