import { describe, expect, it } from 'vitest';
import { TIP } from '../../src/data/legibility';
import { fitRows, textRoom } from '../../src/render/tipFit';

// Fitting a tablet's rows (040): a summary holds at most four drawn rows (its name and chip
// rows included), using a line's short form before cutting, and never losing the hint; a
// glossary entry holds what fits 170 px, with one chip row or two.

const cut = (r: string) => `${r}…`;

describe('fitRows', () => {
  it('keeps every row that fits', () => {
    expect(fitRows([{ rows: ['a', 'b'] }, { rows: ['hint'], keep: true }], 3, cut)).toEqual({ rows: ['a', 'b', 'hint'], cut: false });
  });

  it('uses a line’s short form before cutting anything', () => {
    const lines = [{ rows: ['rule'] }, { rows: ['reaches 1', 'reaches 2'], short: ['5 rounds'] }, { rows: ['hint'], keep: true }];
    expect(fitRows(lines, 3, cut)).toEqual({ rows: ['rule', '5 rounds', 'hint'], cut: false });
  });

  it('cuts the rules rows, never the hint, when even the short forms don’t fit', () => {
    const lines = [{ rows: ['r1', 'r2', 'r3'] }, { rows: ['reach'], short: ['n'] }, { rows: ['hint'], keep: true }];
    expect(fitRows(lines, 3, cut)).toEqual({ rows: ['r1', 'r2…', 'hint'], cut: true });
  });

  it('a summary’s text room is four rows less its name and chip rows', () => {
    expect(textRoom(1, TIP.summaryRows)).toBe(3);
    expect(textRoom(2, TIP.summaryRows)).toBe(2);
  });

  it('a glossary entry’s room keeps it inside 170 px with one chip row or two', () => {
    for (const chipRows of [1, 2]) {
      const room = textRoom(chipRows, TIP.maxLines, 170);
      expect(chipRows * TIP.nameRow + room * TIP.lineHeight + 2 * TIP.pad).toBeLessThanOrEqual(170);
      expect(chipRows * TIP.nameRow + (room + 1) * TIP.lineHeight + 2 * TIP.pad).toBeGreaterThan(170);
    }
  });
});
