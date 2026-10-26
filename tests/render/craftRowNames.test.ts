import { describe, expect, it } from 'vitest';
import { CRAFT_MENU_LAYOUT } from '../../src/data/hudLayout';
import { rowNameXs } from '../../src/render/craftMenuLayout';

// 066: a crafting row's item names (026: each centred under its icon, or from its left edge when wider) must stay
// inside the row and clear of each other. The storm tier's long names ("Stormsteel arrowhead") don't, so a name that
// would run into the next one or past the row's end moves left just enough, and one that would then run into the
// name before it moves right past it. A row whose names already fit is drawn exactly as before.

const L = CRAFT_MENU_LAYOUT;
const ICONS3 = [L.input.x, L.input.x + L.input.step, L.input.x + 2 * L.input.step, L.output.x];
const ICONS1 = [L.input.x, L.output.x];
const ideal = (icon: number, w: number): number => icon + Math.max(0, Math.round((L.iconSize - w) / 2));

/** Each name's [x, end] from its icon's x and width. */
function placed(icons: readonly number[], widths: readonly number[]): [number, number][] {
  const xs = rowNameXs(icons.map((iconX, i) => ({ iconX, w: widths[i] ?? 0 })));
  return xs.map((x, i) => [x, x + (widths[i] ?? 0)]);
}

function clear(spans: readonly [number, number][]): void {
  for (const [i, [x, end]] of spans.entries()) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(end).toBeLessThanOrEqual(L.rowWidth);
    const next = spans[i + 1];
    if (next) expect(end).toBeLessThan(next[0]);
  }
}

describe('a crafting row’s item names (066)', () => {
  it('stay where 026 put them when they fit: Shaft, Arrowhead, Rope, Arrow', () => {
    const widths = [16, 31, 15, 18];
    expect(placed(ICONS3, widths).map(([x]) => x)).toEqual(ICONS3.map((icon, i) => ideal(icon, widths[i] ?? 0)));
  });

  it('a long middle name moves left clear of the next: Shaft, Stormsteel arrowhead, Rope, Stormsteel arrow', () => {
    const spans = placed(ICONS3, [16, 61, 15, 48]);
    clear(spans);
    // Rope and the output keep their places; the long name ends just short of Rope's.
    expect(spans[2]?.[0]).toBe(ideal(ICONS3[2] ?? 0, 15));
    expect(spans[3]?.[0]).toBe(L.output.x);
  });

  it('a long first name pushes the next one right: Stormsteel casing, Fuse, Ley dust, Stormsteel bomb', () => {
    const spans = placed(ICONS3, [49, 14, 24, 47]);
    clear(spans);
    expect(spans[0]?.[0]).toBe(L.input.x);
  });

  it('a long output name moves left to end inside the row: Stormsteel, Stormsteel arrowhead', () => {
    const spans = placed(ICONS1, [31, 61]);
    clear(spans);
    expect(spans[1]?.[1]).toBeLessThanOrEqual(L.rowWidth - L.input.x);
    expect(spans[0]?.[0]).toBe(L.input.x);
  });
});
