import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { FONT_FILES } from '../../src/data/fonts';
import { KEYWORDS, SCOPES, withoutFireVerb, type KeywordId } from '../../src/data/keywords';
import { BUILD_TAB, CHILD_NAMES, CHIP, GLOSSARY, GROUP_NAMES, LANE_NAMES, LEGIBILITY_WORDS, PARAM_STATS, TALENT_TABS, TIP, WHEN_LINES } from '../../src/data/legibility';
import { paletteHex } from '../../src/data/palette';
import { formatDamage, formatParam, formatSeconds, REF, renderTemplate, SLOT } from '../../src/data/rulesText';
import { BASE_FAMILY } from '../../src/data/roundKeywords';
import { STATS } from '../../src/data/statDefs';
import { TALENT_PANEL } from '../../src/data/talentAssets';

// The legibility UI's data (040): the tablets fit the 640×360 view at their largest, every
// chip group has a colour, every param it resolves names a real param and stat, its words
// follow 039's rules (no digit, no keyword typed by hand), and the bundled fonts draw the
// symbols the numbers use.

const fits = (w: number, h: number) => {
  expect(w).toBeLessThanOrEqual(VIEW_WIDTH - 2 * TIP.edge);
  expect(h).toBeLessThanOrEqual(VIEW_HEIGHT - 2 * TIP.edge);
};

describe('sizes', () => {
  it('the summary, the breakdown (16 lines of 10 px) and the glossary fit the view at their largest', () => {
    expect(TIP.summaryW).toBe(200);
    expect(TIP.breakdownW).toBe(280);
    expect(TIP.maxLines * TIP.lineHeight).toBe(160);
    fits(TIP.summaryW, TIP.nameRow + 3 * TIP.lineHeight + 2 * TIP.pad);
    fits(TIP.breakdownW, TIP.nameRow + (TIP.maxLines - 1) * TIP.lineHeight + 2 * TIP.pad);
    expect(GLOSSARY.w).toBeLessThanOrEqual(260);
    expect(GLOSSARY.h).toBeLessThanOrEqual(170);
    fits(GLOSSARY.w, GLOSSARY.h);
  });

  it('a chip fits the name row and a line', () => {
    expect(CHIP.h).toBeLessThanOrEqual(TIP.nameRow);
    expect(CHIP.h).toBeLessThanOrEqual(TIP.lineHeight);
  });

  it('every round the game has, under a header per family, fits the 300 × 300 panel at 14 px a row in at most two columns', () => {
    expect(TALENT_PANEL.w).toBe(300);
    expect(TALENT_PANEL.h).toBe(300);
    expect(BUILD_TAB.rowH).toBe(14);
    const rows = Object.keys(AMMO).length + Object.keys(BASE_FAMILY).length;
    const perColumn = Math.floor((TALENT_PANEL.h - BUILD_TAB.top - TALENT_PANEL.pad) / BUILD_TAB.rowH);
    expect(Math.ceil(rows / perColumn)).toBeLessThanOrEqual(BUILD_TAB.columns);
  });

  it('in the Build tab the panel and a breakdown beside it fit the view side by side', () => {
    fits(TALENT_PANEL.w + BUILD_TAB.breakdownGap + TIP.breakdownW, TALENT_PANEL.h);
  });

  it('the two tabs fit the title card', () => {
    const n = TALENT_TABS.tabs.length;
    expect(n * TALENT_TABS.w + (n - 1) * TALENT_TABS.gap).toBeLessThanOrEqual(TALENT_PANEL.title.w);
    expect(TALENT_TABS.y + TALENT_TABS.h).toBeLessThanOrEqual(TALENT_PANEL.title.h);
  });
});

describe('colours and names', () => {
  it('every chip group has a palette colour and a name', () => {
    const groups = [...new Set(Object.values(KEYWORDS).map((k) => k.group)), 'all-ammo', 'you'] as const;
    for (const g of groups) {
      expect(() => paletteHex(CHIP.colors[g]), g).not.toThrow();
      expect(GROUP_NAMES[g], g).toBeTruthy();
    }
    for (const c of [...Object.values(TIP.colors), CHIP.edge, BUILD_TAB.header.color, BUILD_TAB.hover.color]) expect(() => paletteHex(c), c).not.toThrow();
  });
});

describe('params resolve through stats', () => {
  it('every entry names a live keyword, one of its params and a real stat', () => {
    for (const [id, params] of Object.entries(PARAM_STATS)) {
      const def = KEYWORDS[id as KeywordId];
      expect(def.state, id).toBe('live');
      for (const [name, p] of Object.entries(params ?? {})) {
        expect(def.params[name], `${id}.${name}`).toBeDefined();
        expect(STATS[p.stat], `${id}.${name}`).toBeDefined();
      }
    }
  });
});

describe('words follow 039’s rules', () => {
  const templates = [...Object.values(LEGIBILITY_WORDS), ...Object.values(WHEN_LINES), ...Object.values(SCOPES).flatMap((x) => ['sources' in x ? x.sources : '', x.template]), ...Object.values(CHILD_NAMES), ...Object.values(LANE_NAMES)];

  it('no template holds a digit, and every reference resolves', () => {
    for (const t of templates) {
      expect(t, t).not.toMatch(/\d/);
      expect(() => renderTemplate(t), t).not.toThrow();
    }
  });

  it('no template types a keyword or noun name by hand', () => {
    const names = [...Object.values(KEYWORDS).filter((k) => k.state === 'live').map((k) => k.name), 'Shard', 'Bomblet', 'Frozen'];
    // The Pool-burst is a child noun like Shard and Bomblet (039's spec writes it so): its "burst" is the noun's own.
    const nouns = Object.values(CHILD_NAMES) as readonly string[];
    for (const t of templates.filter((x) => !nouns.includes(x))) {
      // 060: "you fire" is the verb (FIRE_VERB_PHRASES), not the Fire keyword.
      const bare = withoutFireVerb(t.replace(REF, '').replace(SLOT, ''));
      for (const n of names) expect(new RegExp(`\\b${n}`, 'i').test(bare), `"${t}" types "${n}"`).toBe(false);
    }
  });
});

describe('number formats (039’s formatter, 040)', () => {
  it('damage to 1 decimal without a trailing ".0"', () => {
    expect(formatDamage(11.6)).toBe('11.6');
    expect(formatDamage(15)).toBe('15');
    expect(formatDamage(10 * 1.1)).toBe('11');
  });

  it('times to 1 decimal, or with precise to 2 where 1 isn’t exact (039.8)', () => {
    expect(formatSeconds(40)).toBe('0.7 s');
    expect(formatSeconds(40, true)).toBe('0.67 s');
    expect(formatSeconds(90, true)).toBe('1.5 s');
    expect(formatSeconds(300, true)).toBe('5.0 s');
    expect(formatParam(45, 'ticks', true)).toBe('0.75 s');
  });
});

/** The code points a TrueType font maps (its cmap table, formats 4 and 12). */
function cmap(buf: Buffer): Set<number> {
  const tables = buf.readUInt16BE(4);
  let at = -1;
  for (let i = 0; i < tables; i++) if (buf.toString('ascii', 12 + i * 16, 16 + i * 16) === 'cmap') at = buf.readUInt32BE(12 + i * 16 + 8);
  const out = new Set<number>();
  for (let i = 0; i < buf.readUInt16BE(at + 2); i++) {
    const sub = at + buf.readUInt32BE(at + 4 + i * 8 + 4);
    const format = buf.readUInt16BE(sub);
    if (format === 4) {
      const seg2 = buf.readUInt16BE(sub + 6);
      const ends = sub + 14;
      const starts = ends + seg2 + 2;
      const deltas = starts + seg2;
      const ranges = deltas + seg2;
      for (let s = 0; s < seg2 / 2; s++) {
        const [end, start, delta, range] = [buf.readUInt16BE(ends + 2 * s), buf.readUInt16BE(starts + 2 * s), buf.readInt16BE(deltas + 2 * s), buf.readUInt16BE(ranges + 2 * s)];
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const raw = range === 0 ? c : buf.readUInt16BE(ranges + 2 * s + range + 2 * (c - start));
          if (range !== 0 && raw === 0) continue;
          if ((raw + delta) & 0xffff) out.add(c);
        }
      }
    } else if (format === 12) {
      for (let g = 0; g < buf.readUInt32BE(sub + 12); g++) {
        const group = sub + 16 + g * 12;
        for (let c = buf.readUInt32BE(group); c <= buf.readUInt32BE(group + 4); c++) out.add(c);
      }
    }
  }
  return out;
}

describe('the bundled fonts draw the numbers’ symbols (040)', () => {
  const glyphs = (key: keyof typeof FONT_FILES) => cmap(readFileSync(new URL(`../../assets/fonts/${FONT_FILES[key].file}`, import.meta.url)));
  const SYMBOLS = [...'+−%×·→°/0123456789'];

  it('the body face (numbers and rules) draws + − % × · → ° / and every digit', () => {
    const body = glyphs('body');
    for (const ch of SYMBOLS) expect(body.has(ch.codePointAt(0) ?? 0), ch).toBe(true);
  });

  it('the display face (names) draws them too, all but → (names never hold one)', () => {
    const display = glyphs('display');
    for (const ch of SYMBOLS.filter((c) => c !== '→')) expect(display.has(ch.codePointAt(0) ?? 0), ch).toBe(true);
  });
});
