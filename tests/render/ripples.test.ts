import { describe, expect, it } from 'vitest';
import { RIPPLES } from '../../src/data/ambient';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { createRng } from '../../src/sim/rng';
import { WORLD } from '../../src/sim/world';
import { glints, poolBuckets, poolsInView, RippleModel, type Pool } from '../../src/render/world/ripples';

// 077: ripples on ponds and springs: only the pools whose box meets the view, at most 12 rings on Medium and 20 on
// High, none on Low; timed from the render-side stream, so the same seed and frames replay the same.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');

const allPools = (): Pool[] => [...new Set([...poolBuckets(room).values()].flat())];

const viewAt = (p: { x: number; y: number }) => ({ x: p.x - 320, y: p.y - 180, width: 640, height: 360 });

function run(seed: number, quality: 'low' | 'medium' | 'high', pools: readonly Pool[], frames: number): { most: number; rings: string } {
  const m = new RippleModel(createRng(seed));
  let most = 0;
  for (let i = 0; i < frames; i++) {
    m.step(16, pools, quality);
    most = Math.max(most, m.rings.length);
  }
  return { most, rings: JSON.stringify(m.rings) };
}

describe('ripples (077)', () => {
  it('lists every pond and spring once', () => {
    const pools = allPools();
    expect(pools.filter((p) => p.spring).map((p) => p.id).sort()).toEqual(OVERWORLD.springs.map((s) => s.id).sort());
    expect(pools.filter((p) => !p.spring)).toHaveLength(room.terrain?.ponds.length ?? 0);
  });

  it('looks only at the pools whose box meets the view', () => {
    const spring = allPools().find((p) => p.spring);
    if (!spring) throw new Error('no spring');
    const here = poolsInView(room, viewAt(spring));
    expect(here.map((p) => p.id)).toContain(spring.id);
    for (const p of here) expect(Math.abs(p.x - spring.x)).toBeLessThan(320 + p.rx);
    expect(poolsInView(room, { x: 0, y: 0, width: 640, height: 360 })).toEqual([]);
  });

  it('keeps to the tier’s cap (none on Low), and replays the same from the same seed', () => {
    const many = allPools();
    expect(run(7, 'low', many, 600).most).toBe(0);
    expect(run(7, 'medium', many, 600).most).toBeLessThanOrEqual(RIPPLES.max.medium);
    expect(run(7, 'medium', many, 600).most).toBeGreaterThan(4);
    expect(run(7, 'high', many, 600).most).toBeLessThanOrEqual(RIPPLES.max.high);
    expect(run(7, 'high', many, 300).rings).toEqual(run(7, 'high', many, 300).rings);
    expect(run(7, 'high', many, 300).rings).not.toEqual(run(8, 'high', many, 300).rings);
  });

  it('rings start in the deep water, grow from 2 to 10 px across and fade over 1.6 s', () => {
    const pond = allPools().find((p) => !p.spring);
    if (!pond) throw new Error('no pond');
    const m = new RippleModel(createRng(1));
    for (let i = 0; i < 400; i++) m.step(16, [pond], 'high');
    for (const r of m.rings) expect(((r.x - pond.x) / pond.rx) ** 2 + ((r.y - pond.y) / pond.ry) ** 2).toBeLessThanOrEqual(RIPPLES.deep ** 2 + 1e-9);
    expect(RippleModel.look({ x: 0, y: 0, age: 0, spring: false })).toEqual({ across: 2, alpha: 0.5 });
    expect(RippleModel.look({ x: 0, y: 0, age: RIPPLES.lifeMs, spring: false })).toEqual({ across: 10, alpha: 0 });
    expect(glints(pond, 0)).toHaveLength(2);
  });
});
