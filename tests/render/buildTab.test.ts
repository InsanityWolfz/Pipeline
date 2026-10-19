import { describe, expect, it } from 'vitest';
import { BUILD_TAB } from '../../src/data/legibility';
import { TALENT_PANEL } from '../../src/data/talentAssets';
import { buildTabGroups, buildTabLayout, type BuildTabGroup } from '../../src/render/buildTabLayout';
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
    expect(frost).toMatchObject({ round: 'arrow+frost', damage: '11', perSecond: '4.0/s', sources: 1, sourcesText: '1 source' });
    expect(frost?.chips.map((c) => c.id)).toEqual(['cold']);
    expect(groups[1]?.rows[0]?.chips.map((c) => c.id)).toEqual(['homing', 'physical']);
  });

  it('every round the game has fits one column at 14 px a row', () => {
    const s = createSim(1);
    s.crafted = roundsByFamily();
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

  it('takes two columns when the rows don’t fit, a header never last in a column', () => {
    const row = (i: number) => ({ round: `r${i}`, name: '', icon: '', chips: [], damage: '', perSecond: '', sources: 0, sourcesText: '' });
    const groups: BuildTabGroup[] = ['arrow', 'bomb', 'ley', 'landmine'].map((family, g) => ({ family: family as BuildTabGroup['family'], label: family, rows: Array.from({ length: 6 }, (_, i) => row(g * 10 + i)) }));
    const L = buildTabLayout(PANEL, groups);
    expect(L.columns).toBe(2);
    const xs = new Set(L.rows.map((r) => r.box.x));
    expect(xs.size).toBe(2);
    for (const h of L.headers) expect(L.rows.some((r) => r.box.x === h.x && r.box.y === h.y + BUILD_TAB.rowH)).toBe(true);
  });
});
