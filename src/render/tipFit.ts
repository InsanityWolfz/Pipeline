import { TIP } from '../data/legibility';

// Fitting a tablet's rows (040), pure: at most `maxRows` drawn rows (the name's and chips'
// included) and, given a height, no taller than it. A line that would run past uses its
// short form first ("Reaches: 5 rounds"), then (062) its shorter one; if the rows still
// don't fit, the rules rows are cut (the last kept ends with "…") but a kept line (the
// bonus hint) always shows.

/** A line's rows as wrapped, its short (and 062: shorter) form's rows, and whether it must always show. */
export interface FitLine<R> {
  rows: R[];
  short?: R[];
  shorter?: R[];
  keep?: boolean;
}

/** The text rows a tablet has room for, after `chipRows` name and chip rows: at most `maxRows` in all and, with `maxH`, inside that height. */
export function textRoom(chipRows: number, maxRows: number, maxH?: number): number {
  const byRows = maxRows - chipRows;
  const byHeight = maxH === undefined ? byRows : Math.floor((maxH - 2 * TIP.pad - chipRows * TIP.nameRow) / TIP.lineHeight);
  return Math.max(0, Math.min(byRows, byHeight));
}

/** The rows that show in `room` text rows, in order, and whether any were cut (`cut` marks the last row kept before a cut). */
export function fitRows<R>(lines: readonly FitLine<R>[], room: number, cut: (row: R) => R): { rows: R[]; cut: boolean } {
  const count = (ls: readonly FitLine<R>[]) => ls.reduce((n, l) => n + l.rows.length, 0);
  if (count(lines) <= room) return { rows: lines.flatMap((l) => l.rows), cut: false };
  const short = lines.map((l) => (l.short ? { ...l, rows: l.short } : l));
  if (count(short) <= room) return { rows: short.flatMap((l) => l.rows), cut: false };
  const shortened = lines.map((l) => (l.shorter ? { ...l, rows: l.shorter } : l.short ? { ...l, rows: l.short } : l));
  if (count(shortened) <= room) return { rows: shortened.flatMap((l) => l.rows), cut: false };
  // Still too many: the kept lines' rows stay; the others fill what's left, in order, the last one cut.
  let left = room - count(shortened.filter((l) => l.keep));
  const rows: R[] = [];
  let lastFree = -1;
  let wasCut = false;
  for (const l of shortened) {
    for (const r of l.rows) {
      if (l.keep) rows.push(r);
      else if (left > 0) {
        lastFree = rows.push(r) - 1;
        left -= 1;
      } else wasCut = true;
    }
  }
  if (wasCut && lastFree >= 0) rows[lastFree] = cut(rows[lastFree] as R);
  return { rows, cut: wasCut };
}
