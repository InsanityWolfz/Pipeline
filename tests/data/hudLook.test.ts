import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as hudLayout from '../../src/data/hudLayout';
import * as hudPanels from '../../src/data/hudPanels';
import * as flowLayout from '../../src/data/flowLayout';
import { MINIMAP } from '../../src/data/minimap';
import { FOUNDRY_MAP } from '../../src/data/foundryMap';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { TEXT_STYLES } from '../../src/data/fonts';
import { BOSS_BAR_FRAME, CONTRAST_FLOOR, HUD_EDGES, MENU_MOTION, TABLET, TEXT_TABLETS, type TextTablet } from '../../src/data/hudLook';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import { BOMB_SPHERE } from '../../src/data/art/items';
import { ITEM_SPRITES_VECTOR } from '../../src/data/art/items';
import { SPRITES } from '../../src/data/assets';

// 081: the polish moves nothing and shrinks nothing (rules 2 and 3), keeps every text readable on its tablet in every
// mood (rule 4), and keeps every menu motion short (rule 5).

const MAIN = JSON.parse(readFileSync(new URL('../fixtures/hudLayoutMain.json', import.meta.url), 'utf8')) as Record<string, Record<string, unknown>>;
const plain = (m: Record<string, unknown>) => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v !== 'function')))) as Record<string, unknown>;

describe('081: layout and sizes as on main', () => {
  it("keeps every box, size, gap and wrap width in the HUD's layout files", () => {
    const layout = plain(hudLayout);
    delete layout.MENU_FEEDBACK;
    expect(layout).toEqual(MAIN.hudLayout);
    expect(plain(hudPanels)).toEqual(MAIN.hudPanels);
    expect(plain(flowLayout)).toEqual(MAIN.flowLayout);
    expect(JSON.parse(JSON.stringify(MINIMAP))).toEqual(MAIN.minimap);
    expect(JSON.parse(JSON.stringify(FOUNDRY_MAP))).toEqual(MAIN.foundryMap);
    expect(JSON.parse(JSON.stringify(HOLLOWS_LOOK.bossBar))).toEqual(MAIN.bossBar);
  });

  it('keeps every text style at its size, weight, line height and outline', () => {
    for (const [key, was] of Object.entries(MAIN.textSizes ?? {})) {
      const s = TEXT_STYLES[key as keyof typeof TEXT_STYLES];
      expect({ font: s.font, size: s.size, weight: s.weight, lineHeight: s.lineHeight, strokeWidth: s.strokeWidth }, key).toEqual(was);
    }
    // Titles in pale brass, body text in snow; the boss name at the display size with an ink outline.
    expect(TEXT_STYLES.title.fill).toBe('brass-light');
    expect(TEXT_STYLES.body.fill).toBe('snow');
    expect(TEXT_STYLES.bossName).toMatchObject({ font: 'display', size: TEXT_STYLES.display.size, weight: TEXT_STYLES.display.weight, stroke: 'ink', strokeWidth: 1.6 });
  });

  it("frames the boss bar at today's outer box", () => {
    const B = HOLLOWS_LOOK.bossBar;
    expect([BOSS_BAR_FRAME.w, BOSS_BAR_FRAME.h]).toEqual([B.w + 4 * B.border, B.h + 4 * B.border]);
    expect(BOSS_BAR_FRAME.inset).toBe(2 * B.border);
  });
});

describe('081: menu motion', () => {
  it('ends every motion inside 150 ms, the press flash at 140', () => {
    for (const k of ['openMs', 'hoverMs', 'tabMs', 'pressMs'] as const) expect(MENU_MOTION[k], k).toBeLessThan(MENU_MOTION.maxMs);
    expect(MENU_MOTION.maxMs).toBe(150);
    expect(MENU_MOTION).toMatchObject({ openMs: 120, rise: 4, hoverMs: 80, tabMs: 80, pressMs: 140 });
    expect(hudLayout.MENU_FEEDBACK.pressMs).toBe(140);
  });
});

// WCAG relative luminance and contrast, over sRGB 0..1.
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luma = ([r, g, b]: readonly number[]) => 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luma(a), luma(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};
const rgb = (id: string) => hexToRgb(paletteHex(id)).map((c) => c / 255);
const over = (under: readonly number[], top: readonly number[], alpha: number) => under.map((u, i) => u * (1 - alpha) + (top[i] ?? 0) * alpha);

/** The tablet's pixel at its lightest (the gradient's top stop), as drawTablet composites it: the ink edge at `alpha`, then the stone at fillAlpha × alpha. */
const tabletPixel = (ground: readonly number[], alpha: number) => over(over(ground, rgb(TABLET.edge), alpha), rgb(TABLET.top), TABLET.fillAlpha * alpha);
const grounds = (t: TextTablet) => (t.over === 'world' ? [rgb('snow'), rgb('ink')] : [tabletPixel(rgb('ink'), 1)]);

describe('081: readable in every mood', () => {
  it('keeps every colour a palette id', () => {
    const ids = [TABLET.top, TABLET.fill, TABLET.edge, TABLET.bevel, TABLET.base, TABLET.inner.color, TABLET.brass, TABLET.brassLit, ...TEXT_TABLETS.map((t) => t.text)];
    const edges = JSON.stringify(HUD_EDGES).match(/"(color|top|foot|edge)":"[a-z-]+"/g) ?? [];
    for (const e of edges) ids.push(e.split(':')[1]?.replaceAll('"', '') ?? '');
    for (const id of ids) expect(() => paletteHex(id), id).not.toThrow();
  });

  it('gives snow text and pale-brass titles at least 4.5:1 on every text-carrying tablet, over snow and over ink', () => {
    expect(CONTRAST_FLOOR).toBe(4.5);
    for (const t of TEXT_TABLETS) {
      for (const ground of grounds(t)) {
        const back = tabletPixel(ground, t.alpha);
        const fore = over(back, rgb(t.text), t.textAlpha);
        expect(contrast(fore, back), `${t.id} ${t.text}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      }
    }
    // The titles on the full tablets, in pale brass.
    for (const ground of [rgb('snow'), rgb('ink')]) expect(contrast(rgb('brass-light'), tabletPixel(ground, 1))).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  });
});

describe('081: icons', () => {
  it('no longer draws the casing as the bomb’s sphere', () => {
    const casing = ITEM_SPRITES_VECTOR.find((s) => s.key === SPRITES.itemCasing);
    expect(casing).toBeDefined();
    const shapes = JSON.stringify(casing?.frames[0]);
    expect(shapes).not.toContain(JSON.stringify(BOMB_SPHERE[0]));
  });
});
