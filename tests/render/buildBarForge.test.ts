import { describe, expect, it } from 'vitest';
import { VIEW_WIDTH } from '../../src/data/config';
import { BUILD_BAR_LAYOUT } from '../../src/data/hudLayout';
import { BUILD_BAR, pieceDef } from '../../src/data/pieces';
import { buildBarBox, buildBarCells, buildBarGroups } from '../../src/render/foundryLayout';

// 066: the Tempering coil is the build bar's 26th piece, the Forge group's third. The cells already touch (064.9), so
// the groups sit 3 px apart (062.5: 6) and the whole bar still fits the 640 px view.

describe('the build bar with the Tempering coil (066)', () => {
  it('shows the Forge group as the Smelter, the kiln and the coil', () => {
    const forge = buildBarGroups(BUILD_BAR).find((g) => g.category === 'forge');
    expect(forge?.label).toBe('Forge');
    expect(buildBarCells(BUILD_BAR).filter((c) => pieceDef(c.pieceId).category === 'forge').map((c) => c.pieceId)).toEqual(['smelter', 'kiln', 'tempering-coil']);
  });

  it('fits all 26 pieces in the view, the groups 3 px apart', () => {
    expect(BUILD_BAR).toHaveLength(26);
    expect(BUILD_BAR_LAYOUT.groupGap).toBe(3);
    const bar = buildBarBox(BUILD_BAR);
    expect(bar.x).toBeGreaterThanOrEqual(0);
    expect(bar.x + bar.w).toBeLessThanOrEqual(VIEW_WIDTH);
  });
});
