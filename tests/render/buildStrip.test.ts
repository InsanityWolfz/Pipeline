import { describe, expect, it } from 'vitest';
import { VIEW_WIDTH } from '../../src/data/config';
import { BUILD_STRIP, HUD_LAYOUT } from '../../src/data/hudLayout';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { TEXT_STYLES } from '../../src/data/fonts';
import { buildBarLabelTop, buildStripTop, tubeSlotBox } from '../../src/render/bottomHud';
import { buildStripEntries, buildStripLayout } from '../../src/render/buildStrip';
import { healthBlockBox } from '../../src/render/healthLayout';

// The build controls strip (045, note 9): place, rotate, flip, pick up, drag a line and exit, with the bound keys,
// just above the build bar, under the tube slot and clear of the HP block.

/** A generous width for a label-font string (its glyphs average about half an em; 0.6 leaves room). */
const est = (t: string) => Math.ceil(t.length * TEXT_STYLES.label.size * 0.6);

describe('the build controls strip (045)', () => {
  it('lists place, rotate, flip, pick up, drag a line and exit, with the default keys', () => {
    expect(buildStripEntries(DEFAULT_BINDINGS)).toEqual([
      { key: 'Click', does: 'place' },
      { key: 'R', does: 'rotate' },
      { key: 'G', does: 'flip' },
      { key: 'Right-click', does: 'pick up' },
      { key: 'Drag', does: 'line' },
      { key: 'B', does: 'exit' },
    ]);
  });

  it('shows the keys the player bound (042)', () => {
    const bound = buildStripEntries({ ...DEFAULT_BINDINGS, rotate: 'Q', flip: 'SPACE', build: 'V', dodge: 'SHIFT' });
    expect(bound.map((e) => e.key)).toEqual(['Click', 'Q', 'Space', 'Right-click', 'Drag', 'V']);
  });

  it('sits gap px above the build bar labels, centred, the tube slot gap px above it', () => {
    expect(buildStripTop() + BUILD_STRIP.h + BUILD_STRIP.gap).toBe(buildBarLabelTop());
    const entries = buildStripEntries(DEFAULT_BINDINGS);
    const L = buildStripLayout(entries.map((e) => ({ key: est(e.key), does: est(e.does) })));
    expect(Math.abs(L.back.x + L.back.w / 2 - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
    expect(L.back.y).toBe(buildStripTop());
    for (let n = 1; n <= 3; n++) expect(tubeSlotBox(n, true).y + tubeSlotBox(n, true).h).toBe(buildStripTop() - HUD_LAYOUT.gap);
    // Parts left to right, never overlapping.
    let right = -Infinity;
    L.parts.forEach((p, i) => {
      const w = entries[i];
      if (!w) return;
      expect(p.key.x).toBeGreaterThanOrEqual(right);
      right = p.does.x + est(w.does);
    });
  });

  it('stays clear of the HP block even when it rises over a wide build bar', () => {
    const entries = buildStripEntries(DEFAULT_BINDINGS);
    const L = buildStripLayout(entries.map((e) => ({ key: est(e.key), does: est(e.does) })));
    const hp = healthBlockBox({ x: 0, y: 0, w: VIEW_WIDTH, h: 10 });
    expect(L.back.x).toBeGreaterThanOrEqual(hp.x + hp.w + HUD_LAYOUT.gap);
  });
});
