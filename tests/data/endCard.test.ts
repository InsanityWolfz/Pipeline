import { describe, expect, it } from 'vitest';
import { END_CARD } from '../../src/data/endCard';
import { CARD } from '../../src/data/titleScreen';
import { FLOW_ROWS, MENU_ROW_W } from '../../src/data/flowLayout';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { TEXT_STYLES } from '../../src/data/fonts';
import { widthOf } from './textFit';

// 042: the end card's words and size: three to five "What's next" lines, all of it on one 640×360 screen.

describe('end card data (042)', () => {
  it('ends the demo on the last boss (064: the Conductor), 180 ticks after its first kill', () => {
    expect(END_CARD.boss).toBe('conductor');
    expect(END_CARD.delayTicks).toBe(180);
  });

  it("lists three to five things in what's next", () => {
    expect(END_CARD.next.length).toBeGreaterThanOrEqual(3);
    expect(END_CARD.next.length).toBeLessThanOrEqual(5);
  });

  it('fits its title, lines and buttons on the card, and the card on screen', () => {
    const inner = END_CARD.width - 2 * CARD.pad;
    expect(END_CARD.width).toBeLessThan(VIEW_WIDTH);
    expect(widthOf(END_CARD.title, 'title')).toBeLessThan(inner);
    for (const l of END_CARD.next) expect(widthOf(l, 'body')).toBeLessThan(inner);
    for (const b of Object.values(END_CARD.buttons)) expect(widthOf(b, 'display') + FLOW_ROWS.label.x).toBeLessThan(MENU_ROW_W);
    const promptLines = Math.ceil(widthOf(END_CARD.prompt, 'body') / inner);
    const textH = TEXT_STYLES.title.lineHeight + (END_CARD.next.length + 2 + promptLines) * (TEXT_STYLES.body.lineHeight + CARD.lineGap) + 16;
    const h = 2 * CARD.pad + textH + CARD.buttonGap + 2 * 20 + FLOW_ROWS.gap;
    expect(h).toBeLessThan(VIEW_HEIGHT);
  });
});
