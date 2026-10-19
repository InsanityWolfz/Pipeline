import { describe, expect, it } from 'vitest';
import { SITE_SAFE_RADIUS, SITE_SUPPLY } from '../../src/data/claims';
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS } from '../../src/data/items';
import { LANDMARK_LIST, LANDMARKS, type LandmarkDef } from '../../src/data/landmarks';
import { NODES } from '../../src/data/nodes';
import { OVERWORLD, ringOf, type TileRect } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { generateOverworld } from '../../src/sim/overworldGen';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';

// Landmarks as data (032): typed entries stamped onto the fixed map, clear of each
// other and of the tutorial's ground, each in its declared ring and reachable on foot.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const overlap = (a: TileRect, b: TileRect): boolean => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
const inside = (r: TileRect, t: { tx: number; ty: number }): boolean => t.tx >= r.x0 && t.tx <= r.x1 && t.ty >= r.y0 && t.ty <= r.y1;
const byId = (id: string): LandmarkDef => {
  const l = LANDMARK_LIST.find((x) => x.id === id);
  if (!l) throw new Error(`no landmark ${id}`);
  return l;
};
const SITES = LANDMARK_LIST.filter((l) => l.kind === 'resource-site');

describe('landmark entries', () => {
  it('are typed with kebab-case ids, names and a known kind and marker', () => {
    const ids = LANDMARK_LIST.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LANDMARK_LIST) {
      expect(l.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(l.name.length).toBeGreaterThan(0);
      expect(['resource-site', 'frozen-grotto', 'ley-springs', 'ruined-cache']).toContain(l.kind);
      expect(['site', 'grotto', 'spring', 'cache']).toContain(l.marker);
    }
    expect(ids).toEqual(['frozen-grotto', 'quarry', 'old-grove', 'ley-grotto', 'reed-marsh', 'ruined-cache', 'west-spring', 'south-east-spring', 'north-spring']);
  });

  it('start at the spec positions, the Grotto and the springs where 029 and 030 put them', () => {
    const centres: [string, number, number, 1 | 2][] = [
      ['old-grove', 8, 19, 2],
      ['quarry', 21, 18, 1],
      ['ley-grotto', 73, 24, 2],
      ['reed-marsh', 73, 35, 2],
      ['ruined-cache', 11, 38, 2],
      ['frozen-grotto', 14, 9, 2],
    ];
    for (const [id, tx, ty, ring] of centres) {
      expect(inside(byId(id).area, { tx, ty }), id).toBe(true);
      expect(byId(id).ring, id).toBe(ring);
    }
    expect(byId('frozen-grotto').area).toEqual({ x0: 9, y0: 5, x1: 19, y1: 13 });
    for (const s of OVERWORLD.springs) {
      const l = byId(s.id);
      expect(l.kind).toBe('ley-springs');
      expect(inside(l.area, s)).toBe(true);
    }
  });

  it('name only real items, enemies and nodes', () => {
    for (const l of LANDMARK_LIST) {
      for (const n of l.nodes) expect(NODES[n.nodeId], `${l.id} ${n.nodeId}`).toBeDefined();
      for (const g of l.guards) expect(ENEMIES[g.enemyId], `${l.id} ${g.enemyId}`).toBeDefined();
      if (l.pylon) expect(ITEMS[l.pylon.supplies]?.kind, l.id).toBe('raw');
    }
  });

  it('tune the banner, the cache re-arm (10 minutes of play) and the cache hold', () => {
    expect(LANDMARKS).toEqual({ bannerMs: 2000, cacheRearmTicks: 36_000, cacheOpenTicks: 60 });
  });
});

describe('landmark areas', () => {
  const edge = OVERWORLD.edge.depth + OVERWORLD.edge.ragged;

  it('lie inside the map and clear of the forest edge', () => {
    for (const { id, area: a } of LANDMARK_LIST) {
      expect(a.x0, id).toBeGreaterThanOrEqual(edge);
      expect(a.y0, id).toBeGreaterThanOrEqual(edge);
      expect(a.x1, id).toBeLessThanOrEqual(OVERWORLD.width - 1 - edge);
      expect(a.y1, id).toBeLessThanOrEqual(OVERWORLD.height - 1 - edge);
    }
  });

  it("overlap neither each other nor the start meadow, the ruin field or the shrine's ground", () => {
    const [meadow, field, shrine] = OVERWORLD.clearings;
    if (!meadow || !field || !shrine) throw new Error('no tutorial clearings');
    for (const [i, a] of LANDMARK_LIST.entries()) {
      for (const b of LANDMARK_LIST.slice(i + 1)) expect(overlap(a.area, b.area), `${a.id} and ${b.id}`).toBe(false);
      for (const [name, r] of [['meadow', meadow], ['ruin field', field], ['shrine', shrine]] as const) expect(overlap(a.area, r), `${a.id} and the ${name}`).toBe(false);
    }
  });

  it('sit in their declared rings', () => {
    for (const l of LANDMARK_LIST) {
      const cx = Math.round((l.area.x0 + l.area.x1) / 2);
      const cy = Math.round((l.area.y0 + l.area.y1) / 2);
      expect(ringOf(cx, cy), l.id).toBe(l.ring);
      if (l.pylon) expect(ringOf(l.pylon.tx, l.pylon.ty), `${l.id} pylon`).toBe(l.ring);
    }
  });

  it('keep their own things inside them', () => {
    for (const l of LANDMARK_LIST) {
      for (const t of [...l.nodes, ...l.guards, ...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : []), ...(l.blocks ?? [])]) expect(inside(l.area, t), `${l.id} ${tileKey(t)}`).toBe(true);
    }
  });

  it('hold no generated tree, rock, water or stone: only their own features, blocks and pylons', () => {
    const disc = (tx: number, ty: number) =>
      OVERWORLD.features.some((f) => (f.kind === 'pond' ? Math.hypot((tx - f.cx) / f.rx, (ty - f.cy) / f.ry) <= OVERWORLD.ponds.shore : Math.hypot(tx - f.cx, ty - f.cy) <= f.r));
    for (const l of LANDMARK_LIST) {
      const blocks = new Set((l.blocks ?? []).map(tileKey));
      for (let ty = l.area.y0; ty <= l.area.y1; ty++) {
        for (let tx = l.area.x0; tx <= l.area.x1; tx++) {
          const s = at(tx, ty);
          if (blocks.has(tileKey({ tx, ty }))) expect(s).toBe(TILE.ruinBlock);
          else if (!disc(tx, ty)) expect([TILE.floor, TILE.path], `${l.id} ${tx},${ty}`).toContain(s);
        }
      }
      for (const t of [...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : [])]) expect(at(t.tx, t.ty), `${l.id} ${tileKey(t)}`).toBe(TILE.floor);
    }
  });

  it('take in no generated pond (they are removed whole), and leave the rest of the map as the seed made it', () => {
    for (const p of room.terrain?.ponds ?? []) for (const l of LANDMARK_LIST) {
      for (let ty = l.area.y0; ty <= l.area.y1; ty++) {
        for (let tx = l.area.x0; tx <= l.area.x1; tx++) {
          const own = l.features.some((f) => f.kind === 'pond' && f.cx === p.cx && f.cy === p.cy);
          if (!own) expect(Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry), `${l.id}: pond at ${p.cx},${p.cy}`).toBeGreaterThan(OVERWORLD.ponds.shore);
        }
      }
    }
    // Stamped without landmarks, the same seed differs only in the areas, round the landmarks' own features, and
    // where a removed pond lay.
    const bare = generateOverworld(OVERWORLD.seed, []);
    const removed = (bare.terrain?.ponds ?? []).filter((p) => !(room.terrain?.ponds ?? []).some((q) => q.cx === p.cx && q.cy === p.cy));
    const near = (tx: number, ty: number) =>
      LANDMARK_LIST.some((l) => inside(l.area, { tx, ty }) || l.features.some((f) => Math.hypot(tx - f.cx, ty - f.cy) <= (f.kind === 'pond' ? Math.max(f.rx, f.ry) * 2 : f.r) + 1)) ||
      removed.some((p) => Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry) <= OVERWORLD.ponds.shore + 0.01);
    for (let ty = 0; ty < OVERWORLD.height; ty++) {
      for (let tx = 0; tx < OVERWORLD.width; tx++) if (!near(tx, ty)) expect(at(tx, ty), `${tx},${ty}`).toBe(bare.rows[ty]?.[tx]);
    }
  });

  it('are reachable on foot from the wake tile: every guard, node, pylon and reliquary', () => {
    const seen = reachable(room, OVERWORLD.wake);
    for (const l of LANDMARK_LIST) {
      for (const g of l.guards) expect(seen.has(tileKey(g)), `${l.id} guard ${tileKey(g)}`).toBe(true);
      // A node, a pylon or a reliquary is used standing just below it.
      for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${l.id} ${tileKey(t)}`).toBe(true);
      const someTile = [...Array(l.area.y1 - l.area.y0 + 1).keys()].some((dy) => [...Array(l.area.x1 - l.area.x0 + 1).keys()].some((dx) => seen.has(tileKey({ tx: l.area.x0 + dx, ty: l.area.y0 + dy }))));
      expect(someTile, l.id).toBe(true);
    }
  });
});

describe('resource sites', () => {
  it('are the Quarry, Old Grove, Ley Grotto and Reed Marsh, each a cluster of 5 of its node with a pylon supplying its raw', () => {
    expect(SITES.map((l) => [l.id, l.pylon?.supplies])).toEqual([
      ['quarry', 'stone'],
      ['old-grove', 'wood'],
      ['ley-grotto', 'ley-crystal'],
      ['reed-marsh', 'fiber'],
    ]);
    for (const l of SITES) {
      expect(l.nodes, l.id).toHaveLength(5);
      for (const n of l.nodes) expect(NODES[n.nodeId]?.itemId, l.id).toBe(l.pylon?.supplies);
      expect(l.pylon?.site).toBe(l.id);
    }
  });

  it('send only their own raw, with a node of it in the 7-tile zone round the pylon', () => {
    expect(SITE_SAFE_RADIUS).toBe(7);
    for (const l of SITES) {
      const pylon = l.pylon;
      if (!pylon) throw new Error(`${l.id} has no pylon`);
      expect(SITE_SUPPLY[l.id]).toEqual([pylon.supplies]);
      expect(l.nodes.some((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    }
  });

  it('are guarded by one pack of 3–5 of the ring\'s makeup (Husks, plus Wisps in ring 2), with no boss', () => {
    for (const l of [...SITES, byId('ruined-cache')]) {
      expect(l.guards.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.guards.length, l.id).toBeLessThanOrEqual(5);
      const allowed = l.ring === 1 ? ['husk'] : ['husk', 'wisp'];
      for (const g of l.guards) expect(allowed, l.id).toContain(g.enemyId);
    }
    expect(byId('ruined-cache').guards.map((g) => g.enemyId).sort()).toEqual(['husk', 'husk', 'husk', 'husk', 'wisp']);
  });

  it('each has a ley line home from its pylon to the foundry stairs', () => {
    const door = OVERWORLD.entrance.door;
    for (const l of SITES) {
      const line = OVERWORLD.leyLines[l.id];
      expect(line, l.id).toBeDefined();
      expect(line?.[0], l.id).toEqual({ tx: l.pylon?.tx, ty: l.pylon?.ty });
      const end = line?.[line.length - 1];
      expect(end && Math.hypot(end.tx - door.tx, end.ty - door.ty) <= 3, l.id).toBe(true);
    }
  });

  it('put their pylons in the world as dormant until the shrine is claimed, at radius 7; the shrine keeps 10', () => {
    const pylons = WORLD[OVERWORLD.id]?.pylons ?? [];
    expect(pylons.map((p) => [p.site, p.safeRadius, p.wakes ?? null])).toEqual([
      ['shrine', 10, null],
      ['quarry', 7, 'shrine'],
      ['old-grove', 7, 'shrine'],
      ['ley-grotto', 7, 'shrine'],
      ['reed-marsh', 7, 'shrine'],
    ]);
    expect(WORLD[OVERWORLD.id]?.caches).toEqual([{ id: 'ruined-cache', tx: 11, ty: 38 }]);
  });
});
