import { describe, expect, it } from 'vitest';
import { TALENT_PANEL } from '../../src/data/talentAssets';
import { buildTabGroups, buildTabLayout } from '../../src/render/buildTabLayout';
import { roundsByFamily } from '../../src/sim/knownRounds';
import { createSim } from '../../src/sim/state';

// 062: in the Build tab (040) a tiered round shares its stone round's row, so every round the game has still fits two
// columns. The row is the stone round's while that is known, marked with each known tier ("Frost arrow · Steel"); a
// tiered round known without its stone one has the row to itself.

const PANEL = { x: 28, y: 50, w: TALENT_PANEL.w, h: TALENT_PANEL.h };
const named = (r: string) => r;

describe('tiered rounds in the Build tab (062)', () => {
  it('fold into their stone round’s row, its name marked with the tier', () => {
    const s = createSim(1);
    s.crafted = ['arrow', 'arrow+steel', 'arrow+frost', 'arrow+steel+fire'];
    const rows = buildTabGroups(s, named, named)[0]?.rows ?? [];
    expect(rows.map((r) => [r.round, r.name])).toEqual([
      ['arrow', 'arrow · Steel'],
      ['arrow+frost', 'arrow+frost'],
      ['arrow+steel+fire', 'arrow+steel+fire'],
    ]);
    expect(rows[0]?.damage).toBe('14');
  });

  it('every round the game has, tiers too, takes two columns of stone rows', () => {
    const s = createSim(1);
    s.crafted = roundsByFamily();
    const L = buildTabLayout(PANEL, buildTabGroups(s, named, named));
    expect(L.columns).toBe(2);
    // 064: the seven Lightning rounds too.
    expect(L.rows).toHaveLength(28);
  });
});
