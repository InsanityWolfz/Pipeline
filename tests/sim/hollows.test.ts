import { describe, expect, it } from 'vitest';
import { HOLLOWS, inHollows, REGION_1_X, regionAt } from '../../src/data/hollows';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { blocksShot, isSolid } from '../../src/sim/collision';
import { generateOverworld } from '../../src/sim/overworldGen';
import { summarize } from '../../src/sim/summary';
import { reachable, tileKey } from '../fixtures/reach';
import { arena, fireAt, hold, movePlayer, run, runUntil } from './fight';
import { tileCentre } from '../../src/sim/tiles';

// Stonefall Hollows (034): the map grows west by a 40×45 region generated from the
// fixed seed with its own settings; the old map moves +40 tiles and stays as it was.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const B = HOLLOWS.bounds;

/** FNV-1a over a string: a stable fingerprint of a block of tiles. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

describe('the map', () => {
  it('is about 120×45: the Hollows west of Region 1, which starts at column 40', () => {
    expect(OVERWORLD.width).toBe(120);
    expect(room.rows).toHaveLength(45);
    for (const row of room.rows) expect(row).toHaveLength(120);
    expect(REGION_1_X).toBe(40);
    expect(B).toEqual({ x0: 0, y0: 0, x1: 39, y1: 44 });
  });

  it('is generated the same every run, and the Hollows differ for another seed', () => {
    expect(generateOverworld().rows).toEqual(room.rows);
    const other = generateOverworld(OVERWORLD.seed + 1).rows.map((r) => r.slice(0, REGION_1_X));
    expect(other).not.toEqual(room.rows.map((r) => r.slice(0, REGION_1_X)));
  });

  it("keeps Region 1 exactly as the seed made it before 034, moved +40, but for the road west and the gap's approach", () => {
    // Fingerprint of the pre-034 map's 80 columns, with the road's tiles (x 40–53, rows 27–28) and the approach clearing
    // (x 40–45, rows 25–30) masked: taken from the old generator before the map grew (and retaken on the same map with the
    // Hive masked: unchanged outside it).
    // 049's Husk Hive (x 99–103, rows 34–40) is masked too: a landmark stamped over the seed's map after 034.
    const masked = (tx: number, ty: number) =>
      (tx >= 40 && tx <= 45 && ty >= 25 && ty <= 30) || (tx >= 40 && tx <= 53 && ty >= 27 && ty <= 28) || (tx >= 99 && tx <= 103 && ty >= 34 && ty <= 40);
    const text = room.rows.map((row, ty) => [...row.slice(REGION_1_X)].map((s, i) => (masked(i + REGION_1_X, ty) ? '?' : s)).join('')).join('\n');
    expect(fnv(text).toString(16)).toBe('a5ad93db');
  });

  it('is grey-blue stone with cliff runs, rubble and quarry-cut terraces, and ends in cliffs, never a bare wall', () => {
    const hollows = room.rows.map((r) => r.slice(0, REGION_1_X)).join('');
    const count = (s: string) => [...hollows].filter((c) => c === s).length;
    expect(count(TILE.cliff)).toBeGreaterThan(2 * (B.x1 + B.y1) * HOLLOWS.edge.depth);
    expect(count(TILE.rock)).toBeGreaterThan(10);
    expect(count(TILE.terrace)).toBeGreaterThan(0);
    expect(count(TILE.tree)).toBe(0);
    for (let ty = B.y0; ty <= B.y1; ty++) expect(at(0, ty)).toBe(TILE.cliff);
    for (let tx = B.x0; tx <= B.x1; tx++) {
      expect(at(tx, 0)).toBe(TILE.cliff);
      expect(at(tx, B.y1)).toBe(TILE.cliff);
    }
  });

  it('has broken aqueduct spans: solid pillars and fallen sections, walkable gaps under the arches', () => {
    expect([...room.rows.join('')].filter((c) => c === TILE.pillar).length).toBeGreaterThan(8);
    for (const symbol of [TILE.cliff, TILE.pillar, TILE.fallen]) {
      expect(isSolid({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
      expect(blocksShot({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
    }
    for (const symbol of [TILE.arch, TILE.terrace]) {
      expect(WALKABLE).toContain(symbol);
      expect(blocksShot({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(false);
    }
  });

  it('runs the road from the old west path\'s end (52, 27) west to the gap in the eastern cliffs, where the barrier stands', () => {
    expect(OVERWORLD.paths.some((p) => p.some((t) => t.tx === 12 + REGION_1_X && t.ty === 27))).toBe(true);
    expect(HOLLOWS.roads[0]?.[0]).toEqual({ tx: 12 + REGION_1_X, ty: 27 });
    for (let tx = 40; tx <= 53; tx++) expect(at(tx, 27), `${tx},27`).toBe(TILE.path);
    // The eastern cliffs: solid but for the gap, whose outer face the barrier's tiles seal.
    for (let ty = B.y0; ty <= B.y1; ty++) {
      const gap = HOLLOWS.gate.some((g) => g.ty === ty);
      expect(isSolid(room, B.x1, ty), `${B.x1},${ty}`).toBe(!gap);
    }
    expect(HOLLOWS.gate.map((g) => g.tx)).toEqual([39, 39, 39, 39]);
    expect(room.gateTiles?.filter((g) => g.gate === 'hollows').map(({ tx, ty }) => ({ tx, ty }))).toEqual(HOLLOWS.gate);
  });
});

describe('rings and regions', () => {
  it('ring 3 and Region 2 anywhere in the Hollows, whatever the distance; Region 1 keeps its rings', () => {
    for (let ty = B.y0; ty <= B.y1; ty++) {
      for (let tx = B.x0; tx <= B.x1; tx++) {
        expect(ringOf(tx, ty)).toBe(3);
        expect(regionAt(tx, ty)).toBe(2);
        expect(inHollows(tx, ty)).toBe(true);
      }
    }
    expect(ringOf(REGION_1_X, 27)).toBe(2);
    expect(regionAt(REGION_1_X, 27)).toBe(1);
    const e = OVERWORLD.rings.centre;
    expect(ringOf(e.tx, e.ty)).toBe(0);
  });

  it('are in the summary', () => {
    const s = arena();
    expect(summarize(s).area).toMatchObject({ ring: 0, region: 1 });
    const inside = tileCentre(HOLLOWS.start);
    movePlayer(s, inside.x, inside.y);
    expect(summarize(s).area).toMatchObject({ ring: 3, region: 2 });
  });
});

describe('cliffs against shots', () => {
  it('stop arrows, while a bomb lands beyond them', () => {
    const s = arena();
    s.gates.hollows = true;
    // The Cut's quarry face, from the south.
    const below = tileCentre({ tx: 25, ty: 7 });
    movePlayer(s, below.x, below.y);
    run(s, 1, fireAt(below.x, 0));
    let lastY = below.y;
    runUntil(s, () => {
      lastY = s.arrows[0]?.y ?? lastY;
      return s.arrows.length === 0;
    }, 60);
    expect(lastY).toBeGreaterThanOrEqual(5 * 32 - 8);
    // A bomb over the aqueduct's fallen span lands on its far side.
    const s2 = arena(undefined, tileCentre({ tx: 6, ty: 23 }));
    s2.gates.hollows = true;
    s2.inventory = { bomb: 1 };
    hold(s2, 'bomb');
    run(s2, 1, fireAt(tileCentre({ tx: 6, ty: 17 }).x, tileCentre({ tx: 6, ty: 17 }).y));
    runUntil(s2, () => s2.events.bursts.length > 0, 120);
    expect(s2.events.bursts[0]?.y).toBeLessThan(19 * 32);
  });
});

describe('reachability', () => {
  it('reaches every Hollows landmark, node, guard, the pylon, the altar and the forum on foot from the barrier', () => {
    const seen = reachable(room, HOLLOWS.start);
    const hollows = LANDMARK_LIST.filter((l) => l.ring === 3);
    expect(hollows.map((l) => l.id).sort()).toEqual(['broken-aqueduct', 'cistern-terrace', 'hollows-spring', 'ley-iron-cut']);
    for (const l of hollows) {
      for (const g of l.guards) expect(seen.has(tileKey(g)), `${l.id} guard ${tileKey(g)}`).toBe(true);
      for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${l.id} ${tileKey(t)}`).toBe(true);
    }
    for (const n of HOLLOWS.nodes) expect(seen.has(tileKey({ tx: n.tx, ty: n.ty + 1 })), tileKey(n)).toBe(true);
    const a = HOLLOWS.arena;
    expect(seen.has(tileKey(a.start))).toBe(true);
    expect(seen.has(tileKey({ tx: a.altar.tx + 1, ty: a.altar.ty }))).toBe(true);
    // And from Region 1's wake tile, through the gap.
    expect(reachable(room, OVERWORLD.wake).has(tileKey(a.start))).toBe(true);
  });

  it("puts the forum's one wide way in on its north side, and the boss's start and the altar inside it", () => {
    const a = HOLLOWS.arena;
    const inside = (t: { tx: number; ty: number }) => t.tx >= a.inside.x0 && t.tx <= a.inside.x1 && t.ty >= a.inside.y0 && t.ty <= a.inside.y1;
    expect(inside(a.start)).toBe(true);
    expect(inside(a.altar)).toBe(true);
    const open: number[] = [];
    for (let tx = a.bounds.x0; tx <= a.bounds.x1; tx++) if (!isSolid(room, tx, a.bounds.y0)) open.push(tx);
    expect(open).toEqual([10, 11, 12, 13, 14]);
    for (let ty = a.bounds.y0 + 1; ty <= a.bounds.y1; ty++) {
      expect(isSolid(room, a.bounds.x0, ty)).toBe(true);
      expect(isSolid(room, a.bounds.x1, ty)).toBe(true);
    }
    for (let tx = a.bounds.x0; tx <= a.bounds.x1; tx++) expect(isSolid(room, tx, a.bounds.y1)).toBe(true);
    expect(room.altars).toEqual([{ id: a.altar.id, tx: a.altar.tx, ty: a.altar.ty, boss: 'bulwark' }]);
  });
});
