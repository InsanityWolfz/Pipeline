import { describe, expect, it } from 'vitest';
import { MADE_POPUP } from '../../src/data/assets';
import { madeText, mergeInto, stackedTop, type PopupBox } from '../../src/render/popupStack';

// The "+ part" popups (027, 031), pure: a popup that would overlap a live one starts
// stackGap above its top; the same machine and item within mergeMs merge into a count.

const overlaps = (a: PopupBox, b: PopupBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('stacking', () => {
  it('a popup clear of the live ones keeps its place', () => {
    const live = [{ x: 0, y: 0, w: 30, h: 9 }];
    expect(stackedTop({ x: 40, y: 0, w: 30, h: 9 }, live, MADE_POPUP.stackGap)).toBe(0);
  });

  it('one that would overlap starts stackGap above the live one, and above any it then meets', () => {
    const a = { x: 100, y: 50, w: 30, h: 9 };
    const b = { x: 110, y: 41 - MADE_POPUP.stackGap, w: 40, h: 9 };
    const top = stackedTop({ x: 105, y: 52, w: 36, h: 9 }, [a, b], MADE_POPUP.stackGap);
    expect(top).toBe(b.y - MADE_POPUP.stackGap - 9);
    const placed = { x: 105, y: top, w: 36, h: 9 };
    expect(overlaps(placed, a)).toBe(false);
    expect(overlaps(placed, b)).toBe(false);
  });
});

describe('merging', () => {
  it('the same machine and item inside the window merge; another machine, item or a late one do not', () => {
    const live = [{ pieceId: 7, itemId: 'shaft', bornMs: 1000, count: 1 }];
    expect(mergeInto(live, 7, 'shaft', 1000 + MADE_POPUP.mergeMs - 1)).toBe(live[0]);
    expect(mergeInto(live, 8, 'shaft', 1001)).toBeUndefined();
    expect(mergeInto(live, 7, 'rope', 1001)).toBeUndefined();
    expect(mergeInto(live, 7, 'shaft', 1000 + MADE_POPUP.mergeMs + 1)).toBeUndefined();
  });

  it('reads "+ shaft", then "+ shaft ×2" once merged', () => {
    expect(madeText('shaft', 1)).toBe('+ shaft');
    expect(madeText('shaft', 2)).toBe('+ shaft ×2');
  });
});
