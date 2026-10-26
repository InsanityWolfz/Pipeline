import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { BUILD_BAR } from '../../src/data/pieces';
import { BUILD_STRIP } from '../../src/data/buildStrip';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { TEXT_STYLES } from '../../src/data/fonts';
import { buildBarLabelTop } from '../../src/render/bottomHud';
import { buildBarBox } from '../../src/render/foundryLayout';
import { buildStripEntries, buildStripLayout } from '../../src/render/buildStrip';
import { ghostHover, toolCells, toolsBox } from '../../src/render/blueprintLayout';
import type { StampPiece } from '../../src/sim/stamp';

// 063: the build bar's Tools group (the Area tool, then Blueprints) sits at the bar's right end, raised a row: inside
// the view, clear of the full bar, its labels and the build controls strip.

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const est = (t: string) => Math.ceil(t.length * TEXT_STYLES.label.size * 0.6);

describe('the Tools group (063)', () => {
  it('has the Area tool then Blueprints, inside the view', () => {
    const cells = toolCells();
    expect(cells.map((c) => c.tool)).toEqual(['area', 'list']);
    const box = toolsBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.h).toBeLessThanOrEqual(VIEW_HEIGHT);
  });

  it('stays clear of the full build bar, its labels and the controls strip', () => {
    const box = toolsBox();
    expect(overlaps(box, buildBarBox(BUILD_BAR))).toBe(false);
    expect(box.y + box.h).toBeLessThanOrEqual(buildBarLabelTop());
    const entries = buildStripEntries(DEFAULT_BINDINGS);
    const strip = buildStripLayout(entries.map((e) => ({ key: est(e.key), does: est(e.does) }))).back;
    expect(strip.h).toBe(BUILD_STRIP.h);
    expect(overlaps(box, strip)).toBe(false);
  });
});

describe("the ghost's hover (063)", () => {
  const pieces: StampPiece[] = [
    { pieceId: 'hopper', dx: 0, dy: 0, facing: 'right', tx: 4, ty: 4, fail: null },
    { pieceId: 'assembler', dx: 1, dy: 0, facing: 'right', tx: 6, ty: 4, fail: 'locked' },
    { pieceId: 'conduit', dx: 0, dy: 1, facing: 'right', tx: 4, ty: 5, fail: 'occupied' },
  ];

  it('reads "Not unlocked" over any tile of a locked piece', () => {
    expect(ghostHover(pieces, { tx: 6, ty: 4 })).toBe('Not unlocked');
    expect(ghostHover(pieces, { tx: 6, ty: 3 })).toBe('Not unlocked');
    expect(ghostHover(pieces, { tx: 6, ty: 5 })).toBe('Not unlocked');
    expect(ghostHover(pieces, { tx: 7, ty: 4 })).toBeNull();
  });

  it('is off elsewhere: over a piece that fits, a red piece for another reason, empty floor, or no cursor', () => {
    expect(ghostHover(pieces, { tx: 4, ty: 4 })).toBeNull();
    expect(ghostHover(pieces, { tx: 4, ty: 5 })).toBeNull();
    expect(ghostHover(pieces, { tx: 9, ty: 9 })).toBeNull();
    expect(ghostHover(pieces, null)).toBeNull();
  });
});
