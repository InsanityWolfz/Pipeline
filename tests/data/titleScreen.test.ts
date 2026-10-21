import { describe, expect, it } from 'vitest';
import { TITLE_SCENE } from '../../src/data/art/title';
import { inksOf } from '../../src/data/art/types';
import { MENU_ROW_W, FLOW_ROWS } from '../../src/data/flowLayout';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { CARD, CONFIRMS, CONTINUE_LINE, FAREWELL, TITLE_ROWS, TITLE_SCREEN } from '../../src/data/titleScreen';
import { widthOf } from './textFit';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';

// 042: the title screen's data: colours from the palette, the rows in order, and every text fits where it's drawn.

const daylight = new Set(DAYLIGHT_PALETTE.map((c) => c.id));


describe('title screen data', () => {
  it('colours the painted scene and its live parts from the daylight palette', () => {
    const used = [...TITLE_SCENE.flatMap((l) => l.shapes.flatMap(inksOf)), TITLE_SCREEN.pipeGlow.color, TITLE_SCREEN.motes.color, TITLE_SCREEN.logo.glow.color];
    expect(used.length).toBeGreaterThan(20);
    for (const id of used) expect(daylight, id).toContain(id);
  });

  it('has the four rows in order: New game, Continue, Settings, Quit', () => {
    expect(TITLE_ROWS.map((r) => TITLE_SCREEN.rows[r])).toEqual(['New game', 'Continue', 'Settings', 'Quit']);
  });

  it('fits the logo, the menu and the Continue line inside 640×360', () => {
    const L = TITLE_SCREEN.logo;
    const logoW = widthOf(L.text, 'title', L.scale / 2);
    expect(L.cx - logoW / 2).toBeGreaterThan(0);
    expect(L.cx + logoW / 2).toBeLessThan(VIEW_WIDTH);
    const M = TITLE_SCREEN.menu;
    const k = M.scale;
    expect(M.x + MENU_ROW_W * k).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(M.y + (TITLE_ROWS.length * (20 + FLOW_ROWS.gap) + FLOW_ROWS.subH) * k).toBeLessThan(VIEW_HEIGHT);
    for (const r of TITLE_ROWS) expect((widthOf(TITLE_SCREEN.rows[r], 'display') + FLOW_ROWS.label.x) * k).toBeLessThan(MENU_ROW_W * k);
    const line = [CONTINUE_LINE.level(30), CONTINUE_LINE.pylons(12), 'Bulwark', CONTINUE_LINE.saved('19 Oct, 21:40')].join(CONTINUE_LINE.join);
    // The line under a row ends at the row's right end and grows leftward.
    expect(widthOf(line, 'body', k)).toBeLessThan(M.x + (MENU_ROW_W - FLOW_ROWS.sub.x) * k);
    expect(widthOf(CONTINUE_LINE.newer, 'body', k)).toBeLessThan(M.x + MENU_ROW_W * k);
  });

  it('050: the logo and the menu are bigger than 042\'s, centred where they were (the logo on x 500, the menu on 500, 182)', () => {
    const L = TITLE_SCREEN.logo;
    expect(L.scale).toBeGreaterThan(5);
    expect(L.cx).toBe(500);
    const M = TITLE_SCREEN.menu;
    expect(M.scale).toBeGreaterThan(1);
    const rowsH = (TITLE_ROWS.length * 20 + (TITLE_ROWS.length - 1) * FLOW_ROWS.gap) * M.scale;
    expect(M.x + (MENU_ROW_W * M.scale) / 2).toBeCloseTo(500, 0);
    expect(Math.abs(M.y + rowsH / 2 - 182)).toBeLessThanOrEqual(1);
    // The logo's letters stay clear of the menu's top.
    expect(L.y + 1.4 * 14 * (L.scale / 2)).toBeLessThan(M.y);
  });

  it('fits the confirm and farewell buttons on their rows, and their text in a few lines of the card', () => {
    for (const c of [...Object.values(CONFIRMS), { text: FAREWELL.text, yes: FAREWELL.back, no: '' }]) {
      for (const b of [c.yes, c.no]) expect(widthOf(b, 'display') + FLOW_ROWS.label.x).toBeLessThan(MENU_ROW_W);
      expect(widthOf(c.text, 'display') / (CARD.w - 2 * CARD.pad)).toBeLessThan(4);
    }
  });
});
