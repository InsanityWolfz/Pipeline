import { describe, expect, it } from 'vitest';
import { GROTTO_MOUTH } from '../../src/data/grotto';
import { HOLLOWS } from '../../src/data/hollows';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD } from '../../src/data/overworld';
import { COURTYARD, ROAD_DEFS, ROADS } from '../../src/data/roads';
import { WALKABLE } from '../../src/data/rooms';
import type { TilePos, TileRect } from '../../src/data/tiles';
import { fromCentre } from '../../src/data/worldShape';
import { generateOverworld } from '../../src/sim/overworldGen';

// The road network (053, D.3, Shaun: "the paths are kind of like random lines that overlap, like two popsicle
// sticks, when it should just be one path"): one connected network out of the foundry's courtyard, without
// crossings or doubled-up strips, joining the foundry, the landmarks and both arenas.

const room = generateOverworld();
/** A road point's middle: it covers its tile and the ones right of and below it. */
const mid = (t: TilePos): TilePos => ({ tx: t.tx + 1, ty: t.ty + 1 });
const LINES = ROADS.map((r) => r.map(mid));
const key = (t: TilePos) => `${t.tx},${t.ty}`;

/** True if segments ab and cd cross (touching at an end doesn't count). */
function cross(a: TilePos, b: TilePos, c: TilePos, d: TilePos): boolean {
  const o = (p: TilePos, q: TilePos, r: TilePos) => (q.tx - p.tx) * (r.ty - p.ty) - (q.ty - p.ty) * (r.tx - p.tx);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9;
}

const segToSeg = (a: TilePos, b: TilePos, c: TilePos, d: TilePos): number => {
  if (cross(a, b, c, d)) return 0;
  const ps = (p: TilePos, q: TilePos, r: TilePos) => {
    const dx = r.tx - q.tx;
    const dy = r.ty - q.ty;
    const l = dx * dx + dy * dy;
    const k = l === 0 ? 0 : Math.max(0, Math.min(1, ((p.tx - q.tx) * dx + (p.ty - q.ty) * dy) / l));
    return Math.hypot(p.tx - (q.tx + k * dx), p.ty - (q.ty + k * dy));
  };
  return Math.min(ps(a, c, d), ps(b, c, d), ps(c, a, b), ps(d, a, b));
};

/** The nearest two roads come, leaving out every segment within `skip` tiles of `except`. */
function gap(i: number, j: number, except?: TilePos, skip = 0): number {
  const A = LINES[i] ?? [];
  const B = LINES[j] ?? [];
  const far = (p: TilePos) => !except || Math.hypot(p.tx - except.tx, p.ty - except.ty) > skip;
  let best = Infinity;
  for (let a = 0; a + 1 < A.length; a++) {
    for (let b = 0; b + 1 < B.length; b++) {
      const [p, q, r, s] = [A[a], A[a + 1], B[b], B[b + 1]];
      if (!p || !q || !r || !s || !far(p) || !far(q) || !far(r) || !far(s)) continue;
      best = Math.min(best, segToSeg(p, q, r, s));
    }
  }
  return best;
}

describe('the roads', () => {
  it('are the network the world lays: OVERWORLD.paths', () => {
    expect(OVERWORLD.paths).toBe(ROADS);
    expect(ROAD_DEFS.map((r) => r.id)).toEqual([...new Set(ROAD_DEFS.map((r) => r.id))]);
  });

  it("are one connected network: each road leaves the foundry's courtyard or starts on a waypoint of the road it branches from", () => {
    for (const r of ROAD_DEFS) {
      const first = r.waypoints[0];
      if (!first) throw new Error(`${r.id} is empty`);
      if (!r.from) {
        expect(fromCentre(mid(first).tx, mid(first).ty), r.id).toBeLessThanOrEqual(COURTYARD.radius);
        continue;
      }
      const parent = ROAD_DEFS.find((p) => p.id === r.from);
      expect(parent?.waypoints.map(key), r.id).toContain(key(first));
    }
  });

  it('meet at the courtyard on foot: from the stairs every road out of it is reached without leaving it', () => {
    const arrive = OVERWORLD.entrance.arrive;
    const seen = new Set([key(arrive)]);
    const queue = [arrive];
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = { tx: t.tx + dx, ty: t.ty + dy };
        const s = room.rows[n.ty]?.[n.tx];
        if (seen.has(key(n)) || s === undefined || !WALKABLE.includes(s) || fromCentre(n.tx, n.ty) > COURTYARD.radius + 1) continue;
        seen.add(key(n));
        queue.push(n);
      }
    }
    for (const r of ROAD_DEFS.filter((x) => !x.from)) expect(seen.has(key(r.waypoints[0] ?? arrive)), r.id).toBe(true);
  });

  it('never cross', () => {
    for (let i = 0; i < LINES.length; i++) {
      for (let j = i + 1; j < LINES.length; j++) {
        const A = LINES[i] ?? [];
        const B = LINES[j] ?? [];
        for (let a = 0; a + 1 < A.length; a++) {
          for (let b = 0; b + 1 < B.length; b++) {
            const [p, q, r, s] = [A[a], A[a + 1], B[b], B[b + 1]];
            if (p && q && r && s) expect(cross(p, q, r, s), `${ROAD_DEFS[i]?.id} × ${ROAD_DEFS[j]?.id}`).toBe(false);
          }
        }
      }
    }
  });

  it('never run side by side (no doubled-up strips): two roads stay 3 tiles apart but where a branch leaves its road', () => {
    for (let i = 0; i < LINES.length; i++) {
      for (let j = i + 1; j < LINES.length; j++) {
        const [a, b] = [ROAD_DEFS[i], ROAD_DEFS[j]];
        if (!a || !b) continue;
        const branch = b.from === a.id ? b : a.from === b.id ? a : null;
        const at = branch ? mid(branch.waypoints[0] ?? { tx: 0, ty: 0 }) : undefined;
        expect(gap(i, j, at, 5), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('join the foundry, every landmark, the shrine gate, the Grotto mouth and the forum way in', () => {
    const near = (t: TilePos, d: number) => LINES.some((l) => l.some((p) => Math.hypot(p.tx - t.tx - 0.5, p.ty - t.ty - 0.5) <= d));
    const nearRect = (r: TileRect, d: number) => LINES.some((l) => l.some((p) => p.tx >= r.x0 - d && p.tx <= r.x1 + 1 + d && p.ty >= r.y0 - d && p.ty <= r.y1 + 1 + d));
    // A landmark is joined with a road at its edge, or through a joined landmark it touches (the Ley-iron Cut, behind the Cistern Terrace).
    const touch = (a: TileRect, b: TileRect) => a.x0 <= b.x1 + 1 && b.x0 <= a.x1 + 1 && a.y0 <= b.y1 + 1 && b.y0 <= a.y1 + 1;
    const joined = LANDMARK_LIST.filter((l) => nearRect(l.area, 2));
    for (const l of LANDMARK_LIST) expect(joined.includes(l) || joined.some((j) => touch(j.area, l.area)), l.id).toBe(true);
    for (const t of OVERWORLD.shrine.door) expect(near(t, 3)).toBe(true);
    expect(near(GROTTO_MOUTH, 3)).toBe(true);
    expect(near(HOLLOWS.arena.door.leaveTo, 3)).toBe(true);
    expect(near(HOLLOWS.crossing, 2)).toBe(true);
  });
});
