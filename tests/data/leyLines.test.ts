import { describe, expect, it } from 'vitest';
import { distanceToLine } from '../../src/data/curves';
import { RUIN_AREA } from '../../src/data/home';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { LINES_HOME } from '../../src/data/leyLines';
import { OVERWORLD } from '../../src/data/overworld';
import { ROADS } from '../../src/data/roads';
import type { TilePos } from '../../src/data/tiles';
import { WORLD } from '../../src/sim/world';

// Ley lines (053, D.3, Shaun: "the ley lines and the paths look kind of funky… random arrows… not overlapping each
// other"): each pylon's line home a single smooth curve from the pylon to the foundry's ruin, never meeting a road
// or another line; the vein seams meet only their own pylon.

const LINES = OVERWORLD.leyLines;
const ids = Object.keys(LINES);
/** A road's middle line in a ley line's terms (a ley point is its tile's centre, a road point its 2 × 2 block's corner). */
const ROAD_MIDS = ROADS.map((r) => r.map((t) => ({ tx: t.tx + 0.5, ty: t.ty + 0.5 })));

/** The nearest two lines come, leaving out points within `skip` tiles of any point in `near`. */
function gap(a: readonly TilePos[], b: readonly TilePos[], near: readonly TilePos[] = [], skip = 0): number {
  const far = (p: TilePos) => near.every((n) => Math.hypot(p.tx - n.tx, p.ty - n.ty) > skip);
  let best = Infinity;
  for (const p of a) if (far(p)) best = Math.min(best, distanceToLine(p, b.filter(far)));
  return best;
}

const onRuinEdge = (t: TilePos): boolean => {
  const x0 = RUIN_AREA.x0 - 0.5;
  const x1 = RUIN_AREA.x1 + 0.5;
  const y0 = RUIN_AREA.y0 - 0.5;
  const y1 = RUIN_AREA.y1 + 0.5;
  const inside = t.tx >= x0 - 0.01 && t.tx <= x1 + 0.01 && t.ty >= y0 - 0.01 && t.ty <= y1 + 0.01;
  return inside && Math.min(Math.abs(t.tx - x0), Math.abs(t.tx - x1), Math.abs(t.ty - y0), Math.abs(t.ty - y1)) < 0.02;
};

describe('ley lines home', () => {
  it('one for every pylon on the map, named by its site, from the pylon to the edge of the foundry ruin', () => {
    const pylons = WORLD[OVERWORLD.id]?.pylons ?? [];
    expect([...LINES_HOME].sort()).toEqual(pylons.map((p) => p.site).sort());
    for (const p of pylons) {
      const line = LINES[p.site] ?? [];
      expect(line[0], p.site).toEqual({ tx: p.tx, ty: p.ty });
      const end = line[line.length - 1];
      expect(end && onRuinEdge(end), `${p.site} ends at ${end?.tx},${end?.ty}`).toBe(true);
    }
  });

  it('are smooth single curves: no point turns sharply, no line doubles back', () => {
    for (const id of LINES_HOME) {
      const line = LINES[id] ?? [];
      for (let i = 1; i + 1 < line.length; i++) {
        const [a, b, c] = [line[i - 1], line[i], line[i + 1]];
        if (!a || !b || !c) continue;
        const turn = Math.abs(Math.atan2(c.ty - b.ty, c.tx - b.tx) - Math.atan2(b.ty - a.ty, b.tx - a.tx));
        expect(Math.min(turn, 2 * Math.PI - turn), `${id} at ${b.tx},${b.ty}`).toBeLessThan((40 * Math.PI) / 180);
      }
    }
  });

  it('never come within 2.5 tiles of a road', () => {
    for (const id of ids) {
      for (const [r, road] of ROAD_MIDS.entries()) expect(gap(LINES[id] ?? [], road), `${id} and road ${r}`).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('never meet another line but at a pylon they share, and reach the ruin at least 1.5 tiles apart', () => {
    const ends = (l: readonly TilePos[]) => [l[0], l[l.length - 1]].filter((t): t is TilePos => t !== undefined);
    for (const [i, a] of ids.entries()) {
      for (const b of ids.slice(i + 1)) {
        const A = LINES[a] ?? [];
        const B = LINES[b] ?? [];
        const shared = ends(A).filter((p) => ends(B).some((q) => Math.hypot(p.tx - q.tx, p.ty - q.ty) < 0.01));
        // Near the ruin every line home converges: there they keep 1.5 tiles apart; elsewhere 2.
        const ruin = { tx: (RUIN_AREA.x0 + RUIN_AREA.x1) / 2, ty: (RUIN_AREA.y0 + RUIN_AREA.y1) / 2 };
        expect(gap(A, B, shared, 3), `${a} and ${b}`).toBeGreaterThanOrEqual(1.5);
        expect(gap(A, B, [...shared, ruin], 10), `${a} and ${b}, away from the ruin`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('run through no landmark but their own', () => {
    for (const id of LINES_HOME) {
      for (const l of LANDMARK_LIST.filter((x) => x.pylon?.site !== id)) {
        const a = l.area;
        for (const p of LINES[id] ?? []) expect(p.tx >= a.x0 - 0.5 && p.tx <= a.x1 + 0.5 && p.ty >= a.y0 - 0.5 && p.ty <= a.y1 + 0.5, `${id} through ${l.id}`).toBe(false);
      }
    }
  });
});
