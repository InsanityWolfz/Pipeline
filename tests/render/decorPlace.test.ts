import { describe, expect, it } from 'vitest';
import { BOSS_ARENAS } from '../../src/data/arenas';
import { GROUND } from '../../src/data/art/ground';
import { DECOR, DECOR_REGIONS, type DecorRegion } from '../../src/data/decor';
import { GROTTO } from '../../src/data/grotto';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { SET_PIECES } from '../../src/data/setPieces';
import { onBarrier } from '../../src/data/worldShape';
import { pieceFrame } from '../../src/sim/tileLook';
import { WORLD } from '../../src/sim/world';
import { chunkDecor, decorRegion, keptClear, plantAt, scatterAt, setPieceOnTile, vineAt } from '../../src/render/world/decorPlace';
import { baseOfVariant, variantFrame } from '../../src/render/world/variants';

// 077: where the world's detail goes: never where DECOR_CLEAR keeps clear, at the spec's densities, the same on every
// build and in any chunk order (pinned per region), the per-chunk cap, and variants in their piece class.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const W = room.rows[0]?.length ?? 0;
const H = room.rows.length;
const C = GROUND.chunk;

const every = (fn: (tx: number, ty: number) => void) => {
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) fn(tx, ty);
};

/** A small stable hash of a list, for pinning it. */
const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
};

describe('decor placement (077)', () => {
  it('never puts a plant or scatter on a road (or beside one), in a boss arena, on the barrier, a ramp, a gate, near a fixed thing, in the Grotto, or on solid ground', () => {
    const roads: { tx: number; ty: number }[] = [];
    every((tx, ty) => room.rows[ty]?.[tx] === TILE.path && roads.push({ tx, ty }));
    const roadNear = new Set<string>();
    for (const r of roads) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) roadNear.add(`${r.tx + dx},${r.ty + dy}`);
    const points = [...(room.pylons ?? []), ...OVERWORLD.nodes, ...(room.altars ?? []), ...(room.caches ?? []), OVERWORLD.startStone, OVERWORLD.entrance.door];
    const gates = new Set((room.gateTiles ?? []).map((t) => `${t.tx},${t.ty}`));
    // Tiles within 2 of a fixed thing, and within a spring's pool plus 2, worked out once.
    const nearPoint = new Set<string>();
    for (const q of points) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) nearPoint.add(`${q.tx + dx},${q.ty + dy}`);
    for (const sp of OVERWORLD.springs) for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (Math.hypot(dx, dy) <= sp.radius + 2) nearPoint.add(`${sp.tx + dx},${sp.ty + dy}`);
    const inArena = (tx: number, ty: number) => BOSS_ARENAS.some((a) => tx >= a.bounds.x0 && tx <= a.bounds.x1 && ty >= a.bounds.y0 && ty <= a.bounds.y1);
    const g = GROTTO.area;
    const bad: string[] = [];
    let plants = 0;
    let marks = 0;
    every((tx, ty) => {
      const plant = plantAt(room, tx, ty);
      if (plant) plants += 1;
      for (const p of [plant, scatterAt(room, tx, ty)]) {
        if (!p) continue;
        marks += 1;
        const at = `${tx},${ty}`;
        const why = [
          !WALKABLE.includes(room.rows[ty]?.[tx] ?? '') && 'solid',
          roadNear.has(at) && 'by a road',
          onBarrier(tx, ty) && 'barrier',
          gates.has(at) && 'gate',
          room.rows[ty]?.[tx] === TILE.ramp && 'ramp',
          inArena(tx, ty) && 'arena',
          nearPoint.has(at) && 'near a fixed thing',
          tx >= g.x0 && tx <= g.x1 && ty >= g.y0 && ty <= g.y1 && 'grotto',
        ].filter(Boolean);
        if (why.length > 0) bad.push(`${at}: ${why.join(', ')}`);
      }
    });
    expect(bad).toEqual([]);
    expect(plants).toBeGreaterThan(1000);
    expect(marks).toBeGreaterThan(plants);
  });

  it('places plants and scatter at the spec’s densities (within ±15%) over each region’s eligible tiles', () => {
    const counts = Object.fromEntries(DECOR_REGIONS.map((r) => [r, { floor: 0, walk: 0, plants: 0, scatter: 0 }])) as Record<DecorRegion, { floor: number; walk: number; plants: number; scatter: number }>;
    every((tx, ty) => {
      if (keptClear(room, tx, ty)) return;
      const s = room.rows[ty]?.[tx];
      const c = counts[decorRegion(tx, ty)];
      if (s === TILE.floor) c.floor += 1;
      if (s === TILE.floor || s === TILE.terrace) c.walk += 1;
      if (plantAt(room, tx, ty)) c.plants += 1;
      if (scatterAt(room, tx, ty)) c.scatter += 1;
    });
    for (const r of DECOR_REGIONS) {
      const c = counts[r];
      const R = DECOR.regions[r];
      expect(c.plants / (c.floor / R.plantOneIn), `${r} plants`).toBeGreaterThan(0.85);
      expect(c.plants / (c.floor / R.plantOneIn), `${r} plants`).toBeLessThan(1.15);
      expect(c.scatter / (c.walk / R.scatterOneIn), `${r} scatter`).toBeGreaterThan(0.85);
      expect(c.scatter / (c.walk / R.scatterOneIn), `${r} scatter`).toBeLessThan(1.15);
    }
  });

  it('hangs vines only in the Hollows, from a cliff face over open floor', () => {
    let n = 0;
    every((tx, ty) => {
      const v = vineAt(room, tx, ty);
      if (!v) return;
      n += 1;
      expect(decorRegion(tx, ty)).toBe('hollows');
      expect(room.rows[ty]?.[tx]).toBe(TILE.cliff);
      expect(room.rows[ty + 1]?.[tx]).toBe(TILE.floor);
    });
    expect(n).toBeGreaterThan(50);
  });

  it('gives the same decor every build and in any chunk order, pinned per region, and keeps the nearest 80 plants', () => {
    const cols = Math.ceil((W * 32) / C);
    const rows = Math.ceil((H * 32) / C);
    const all: string[] = [];
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) all.push(JSON.stringify(chunkDecor(room, cx, cy, C)));
    const reversed: string[] = [];
    for (let cy = rows - 1; cy >= 0; cy--) for (let cx = cols - 1; cx >= 0; cx--) reversed.unshift(JSON.stringify(chunkDecor(room, cx, cy, C)));
    expect(reversed).toEqual(all);
    for (const s of all) expect((JSON.parse(s) as { plants: unknown[] }).plants.length).toBeLessThanOrEqual(DECOR.maxPlantsPerChunk);
    // One sample chunk per region, pinned: a change to placement shows here.
    const sample = { meadow: [7, 7], hollows: [7, 4], ember: [2, 7], storm: [2, 2] } as const;
    const pinned = Object.fromEntries(Object.entries(sample).map(([r, [cx, cy]]) => [r, fnv(JSON.stringify(chunkDecor(room, cx, cy, C)))]));
    for (const [r, [cx, cy]] of Object.entries(sample)) expect(decorRegion(cx * 20 + 10, cy * 20 + 10), r).toBe(r);
    expect(pinned).toEqual(PINNED);
  });

  it('swaps a solid tile’s look only for a variant in its own piece class, and leaves landmarks’ blocks as they are', () => {
    let swapped = 0;
    every((tx, ty) => {
      const base = pieceFrame(room, tx, ty);
      if (!base) return;
      const f = variantFrame(room.rows, base, tx, ty);
      if (f !== base) swapped += 1;
      expect(baseOfVariant(f)).toBe(base);
      if (base.startsWith('ow-cut-block') || base.startsWith('ow-hive-stone')) expect(f).toBe(base);
    });
    expect(swapped).toBeGreaterThan(100);
  });

  it('marks every set piece’s footprint so its tiles draw no standing sprite', () => {
    for (const p of SET_PIECES) for (let ty = p.footprint.ty; ty < p.footprint.ty + p.footprint.h; ty++) for (let tx = p.footprint.tx; tx < p.footprint.tx + p.footprint.w; tx++) expect(setPieceOnTile(tx, ty)).toBe(p.id);
    expect(setPieceOnTile(0, 0)).toBeUndefined();
  });
});

const PINNED = { meadow: '5fa7c456', hollows: '5a22a7cf', ember: '557738d8', storm: '2a3a272b' };
