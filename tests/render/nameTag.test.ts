import { describe, expect, it } from 'vitest';
import { TEXT_STYLES } from '../../src/data/fonts';
import { HOVER_NAME } from '../../src/data/hudLayout';
import { INTERACT_PROMPTS } from '../../src/data/interact';
import { placeNameTag, type TagBox } from '../../src/render/nameTagPlace';

// 050 (A.2, 050.1): hover name tags are smaller (the label font) and sit under the hovered thing's feet, so the E prompt
// over it stays clear; where that would cover the player, above the thing, clear of the prompt.

const view: TagBox = { x: 0, y: 0, w: 640, h: 360 };
/** A boulder's feet at (320, 150); its E prompt sits a tile over its centre (045). */
const boulder = { cx: 320, below: 150 + HOVER_NAME.gap, above: 150 - HOVER_NAME.promptClear, w: 40, h: 11 };
const promptBox: TagBox = { x: 320 - 7, y: 150 - INTERACT_PROMPTS.node.rise - 14, w: 14, h: 14 };

const meets = (a: TagBox, b: TagBox): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('name tags (050)', () => {
  it('use the small label font', () => {
    expect(HOVER_NAME.style).toBe('label');
    expect(TEXT_STYLES[HOVER_NAME.style].size).toBeLessThan(TEXT_STYLES.display.size);
  });

  it('sit under the feet, clear of the E prompt', () => {
    const at = placeNameTag({ ...boulder, avoid: [], view, edge: 2 });
    expect(at.side).toBe('below');
    expect(at.y).toBe(boulder.below);
    expect(meets({ ...at, w: boulder.w, h: boulder.h }, promptBox)).toBe(false);
  });

  it('go above the thing, clear of its prompt, when below would cover the player standing there', () => {
    const player: TagBox = { x: 308, y: 150, w: 24, h: 44 };
    const at = placeNameTag({ ...boulder, avoid: [player], view, edge: 2 });
    expect(at.side).toBe('above');
    const box = { ...at, w: boulder.w, h: boulder.h };
    expect(meets(box, player)).toBe(false);
    expect(meets(box, promptBox)).toBe(false);
  });

  it('stay inside the view, and slide off the minimap when both places meet it', () => {
    const map: TagBox = { x: 500, y: 0, w: 140, h: 80 };
    const at = placeNameTag({ cx: 560, below: 40, above: 30, w: 40, h: 11, avoid: [map], view, edge: 2 });
    expect(meets({ ...at, w: 40, h: 11 }, map)).toBe(false);
    expect(at.x).toBeGreaterThanOrEqual(2);
    const edge = placeNameTag({ ...boulder, cx: 5, avoid: [], view, edge: 2 });
    expect(edge.x).toBe(2);
  });
});
