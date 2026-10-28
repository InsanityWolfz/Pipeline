import { describe, expect, it } from 'vitest';
import { FX_LOOK } from '../../src/data/fxQuality';
import { MarkRing, oldestBeyond, Pool, ribbonEdges, TrailRing, trailCut } from '../../src/render/fx/fxPool';

// 078: the pools behind the particles, trails and marks: made once up to a high-water mark and reused, so a fight
// allocates nothing per projectile per frame.

describe('Pool (078)', () => {
  it('emits and expires 10,000 particles through a fixed number of slots', () => {
    let made = 0;
    const pool = new Pool(() => ({ n: made++, life: 0 }));
    let next = 0;
    for (let frame = 0; frame < 2000; frame++) {
      // Five born a frame, each living 12 frames: about 60 alive at once.
      for (let k = 0; k < 5; k++) pool.take().life = 12;
      next += 5;
      for (let i = pool.live.length - 1; i >= 0; i--) {
        const p = pool.live[i];
        if (p && --p.life <= 0) pool.release(i);
      }
    }
    expect(next).toBe(10_000);
    expect(pool.created).toBe(made);
    expect(pool.created).toBeLessThanOrEqual(65);
    expect(pool.live.length).toBeLessThanOrEqual(65);
  });

  it('swap-removes: releasing keeps the other live slots, and a taken slot is a free one when there is one', () => {
    const pool = new Pool(() => ({ v: 0 }));
    const a = pool.take();
    const b = pool.take();
    const c = pool.take();
    pool.release(0);
    expect(pool.live).toEqual([c, b]);
    expect(pool.take()).toBe(a);
    expect(pool.created).toBe(3);
    pool.releaseAll();
    expect(pool.live).toEqual([]);
    expect(pool.created).toBe(3);
  });
});

describe('TrailRing (078)', () => {
  it('keeps the newest points up to its size, skipping a repeated point', () => {
    const r = new TrailRing();
    for (let i = 0; i < 40; i++) {
      r.push(i * 3, 10);
      r.push(i * 3, 10);
    }
    expect(r.count).toBe(FX_LOOK.points);
    expect([r.x(0), r.y(0)]).toEqual([39 * 3, 10]);
    expect(r.x(1)).toBe(38 * 3);
    expect(r.x(FX_LOOK.points - 1)).toBe((40 - FX_LOOK.points) * 3);
    r.reset();
    expect(r.count).toBe(0);
  });

  it('is cut to its trail’s length when drawn: the points within it, the last one part way', () => {
    const r = new TrailRing();
    for (let i = 0; i <= 10; i++) r.push(i * 4, 0);
    // 28 px back from the newest point: 7 whole segments of 4 px.
    expect(trailCut(r, 28)).toEqual({ points: 8, last: 1 });
    // 10 px: two whole segments and half of the third.
    expect(trailCut(r, 10)).toEqual({ points: 4, last: 0.5 });
    expect(trailCut(r, 1000)).toEqual({ points: 11, last: 1 });
  });
});

describe('MarkRing (078)', () => {
  it('caps the marks at the tier’s count, recycling the oldest first', () => {
    const marks = new MarkRing(() => ({ id: 0 }));
    const placed = Array.from({ length: 8 }, (_, i) => {
      const m = marks.place(6);
      m.id = i;
      return m;
    });
    expect(marks.created).toBe(6);
    expect(marks.live.map((m) => m.id)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(placed[6]).toBe(placed[0]);
    // A higher tier's cap grows the ring once; a mark that fades out frees its slot.
    for (let i = 0; i < 30; i++) marks.place(24);
    expect(marks.created).toBe(24);
    marks.expire(marks.live[0] ?? { id: -1 });
    expect(marks.live.length).toBe(23);
    marks.place(24);
    expect(marks.created).toBe(24);
  });
});

describe('machine sparks (078)', () => {
  it('fly in a machine’s build group’s colours, a stage machine’s tag’s, or the Tempering coil’s; logistics has none', async () => {
    const { machineSparkColors } = await import('../../src/render/fx/machineSparks');
    const { PIECES } = await import('../../src/data/pieces');
    const { STAGES } = await import('../../src/data/stages');
    expect(machineSparkColors('cutter')).toEqual(['brass-light', 'wood-light']);
    expect(machineSparkColors('tempering-coil')).toEqual(['storm-glow', 'snow']);
    for (const [id, p] of Object.entries(PIECES)) {
      if (p.category === 'logistics') expect(machineSparkColors(id), id).toBeNull();
      else expect(machineSparkColors(id)?.length, id).toBeGreaterThan(0);
    }
    const frostStage = Object.values(STAGES).find((s) => s.tag === 'frost');
    const clusterStage = Object.values(STAGES).find((s) => s.tag === 'cluster');
    if (!frostStage || !clusterStage) throw new Error('no stages');
    expect(machineSparkColors(frostStage.id)).toEqual(['foam', 'snow', 'water-light']);
    expect(machineSparkColors(clusterStage.id)).toEqual(['cinder-light', 'gold-trim']);
  });
});

describe('a tier change (078 review)', () => {
  it('picks the oldest of a kind beyond its new share, so they go at once', () => {
    const live = [
      { kind: 'effect', age: 50 },
      { kind: 'death', age: 900 },
      { kind: 'effect', age: 400 },
      { kind: 'effect', age: 10 },
      { kind: 'effect', age: 300 },
    ];
    expect(oldestBeyond(live, 'effect', 2)).toEqual([2, 4]);
    expect(oldestBeyond(live, 'effect', 4)).toEqual([]);
    expect(oldestBeyond(live, 'death', 0)).toEqual([1]);
  });
});

describe('a ribbon’s edges (078 review: one continuous stroke, no beads)', () => {
  it('gives each point one left and one right vertex, so neighbouring quads share their edge and never overlap', () => {
    const r = new TrailRing();
    for (const [x, y] of [[0, 0], [10, 0], [20, 5], [30, 5]] as const) r.push(x, y);
    const out = new Float32Array(FX_LOOK.points * 4);
    const n = ribbonEdges(r, 4, 2, 0.5, out);
    expect(n).toBe(4);
    // The newest point (30, 5), 2 wide: straight up and down across a level segment.
    expect([...out.slice(0, 4)].map((v) => Math.round(v * 100) / 100)).toEqual([30, 3, 30, 7]);
    // A bend's vertex sits on the bisector, so the quads on either side meet there.
    const lx = out[4] ?? 0;
    const ly = out[5] ?? 0;
    expect(Math.hypot(lx - 20, ly - 5)).toBeGreaterThan(1.4);
    expect(ly).toBeLessThan(5);
    // The tail tapers to its own width.
    expect(Math.hypot((out[12] ?? 0) - (out[14] ?? 0), (out[13] ?? 0) - (out[15] ?? 0))).toBeCloseTo(1, 5);
  });
});
