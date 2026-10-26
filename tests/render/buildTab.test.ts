import { describe, expect, it } from 'vitest';
import { BUILD_TAB } from '../../src/data/legibility';
import { TALENT_PANEL } from '../../src/data/talentAssets';
import { buildTabGroups, buildTabLayout, rowFields, type BuildTabGroup } from '../../src/render/buildTabLayout';
import { roundsByFamily } from '../../src/sim/knownRounds';
import { createSim } from '../../src/sim/state';

// The Build tab (040): every known round under a header per family, a family with none
// hidden, each row's chips and numbers; one column while the rows fit the 300 × 300 panel
// at 14 px a row, else two (031's rule).

const PANEL = { x: 28, y: 50, w: TALENT_PANEL.w, h: TALENT_PANEL.h };
const named = (r: string) => r;

describe('the Build tab', () => {
  it('lists the known rounds under their family’s header, hiding a family with none', () => {
    const s = createSim(1);
    s.crafted = ['arrow', 'arrow+frost', 'ley-bolt+homing'];
    s.talents = ['start', 'a1'];
    const groups = buildTabGroups(s, named, named);
    expect(groups.map((g) => g.label)).toEqual(['Arrow', 'Ley']);
    const frost = groups[0]?.rows[1];
    // 041: 14 × 1.1 (was 11 from 10).
    expect(frost).toMatchObject({ round: 'arrow+frost', damage: '15.4', perSecond: '4.0/s', sources: 1, sourcesText: '1 source' });
    expect(frost?.chips.map((c) => c.id)).toEqual(['cold']);
    expect(groups[1]?.rows[0]?.chips.map((c) => c.id)).toEqual(['homing', 'physical']);
  });

  it('every round before Fire fits one column at 14 px a row', () => {
    const s = createSim(1);
    s.crafted = roundsByFamily().filter((r) => !r.includes('fire') && !r.includes('lightning'));
    const groups = buildTabGroups(s, named, named);
    const L = buildTabLayout(PANEL, groups);
    expect(L.columns).toBe(1);
    expect(L.rows).toHaveLength(14);
    for (const r of L.rows) {
      expect(r.box.h).toBe(BUILD_TAB.rowH);
      expect(r.box.y + r.box.h).toBeLessThanOrEqual(PANEL.y + PANEL.h - TALENT_PANEL.pad);
      expect(r.box.x + r.box.w).toBeLessThanOrEqual(PANEL.x + PANEL.w - TALENT_PANEL.pad);
    }
  });

  it('060: every round the game has (the Fire rounds too; 064: and Lightning) takes two columns, every row inside the panel', () => {
    const s = createSim(1);
    s.crafted = roundsByFamily();
    const groups = buildTabGroups(s, named, named);
    const L = buildTabLayout(PANEL, groups);
    expect(L.columns).toBe(2);
    expect(L.rows).toHaveLength(28);
    for (const r of L.rows) {
      expect(r.box.h).toBe(BUILD_TAB.rowH);
      expect(r.box.y + r.box.h).toBeLessThanOrEqual(PANEL.y + PANEL.h - TALENT_PANEL.pad);
      expect(r.box.x + r.box.w).toBeLessThanOrEqual(PANEL.x + PANEL.w - TALENT_PANEL.pad);
    }
  });

  it('takes two columns when the rows don’t fit, a header never last in a column', () => {
    const row = (i: number) => ({ round: `r${i}`, name: '', icon: '', chips: [], damage: '', perSecond: '', sources: 0, sourcesText: '' });
    const groups: BuildTabGroup[] = ['arrow', 'bomb', 'ley', 'landmine'].map((family, g) => ({ family: family as BuildTabGroup['family'], label: family, rows: Array.from({ length: 6 }, (_, i) => row(g * 10 + i)) }));
    const L = buildTabLayout(PANEL, groups);
    expect(L.columns).toBe(2);
    const xs = new Set(L.rows.map((r) => r.box.x));
    expect(xs.size).toBe(2);
    for (const h of L.headers) expect(L.rows.some((r) => r.box.x === h.x && r.box.y === h.y + BUILD_TAB.rowH)).toBe(true);
  });

  it('draws each row’s fields inside its own column, never over each other, one column or two', () => {
    const one = buildTabLayout(PANEL, buildTabGroups(Object.assign(createSim(1), { crafted: roundsByFamily() }), named, named));
    const row = (i: number) => ({ round: `r${i}`, name: '', icon: '', chips: [], damage: '', perSecond: '', sources: 0, sourcesText: '' });
    const many: BuildTabGroup[] = ['arrow', 'bomb', 'ley', 'landmine'].map((family, g) => ({ family: family as BuildTabGroup['family'], label: family, rows: Array.from({ length: 6 }, (_, i) => row(g * 10 + i)) }));
    const two = buildTabLayout(PANEL, many);
    expect(two.columns).toBe(2);
    for (const L of [one, two]) {
      const f = rowFields(L.columnW);
      const F = BUILD_TAB.fields;
      expect(f.compact).toBe(L.columns === 2);
      // Left to right: name, chips (a full column), damage, shots/s, sources; each inside the column.
      const spans = [
        [f.name.x, f.name.x + f.name.w],
        ...(f.chipsX !== null ? [[f.chipsX, f.chipsX + F.chipsW]] : []),
        [f.damageRight - F.damageW, f.damageRight],
        [f.rateRight - F.rateW, f.rateRight],
        [f.rateRight, f.sourcesRight],
      ];
      expect(f.name.w).toBeGreaterThan(30);
      for (let i = 1; i < spans.length; i++) expect(spans[i]?.[0], `field ${i}`).toBeGreaterThanOrEqual(spans[i - 1]?.[1] ?? 0);
      expect(spans.at(-1)?.[1]).toBeLessThanOrEqual(L.columnW);
      // Columns never overlap.
      const xs = [...new Set(L.rows.map((r) => r.box.x))].sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] ?? 0).toBeGreaterThanOrEqual((xs[i - 1] ?? 0) + L.columnW);
    }
  });
});
