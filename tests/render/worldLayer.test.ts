import { describe, expect, it } from 'vitest';
import type { GameObjects } from 'phaser';
import { WorldLayer } from '../../src/render/lighting/WorldLayer';

// 074: the world layer's look. The ground chunks take the tint they're given each frame (the ambient with the
// lightning flash in it) whether or not the ground is lit per pixel, so Medium shows the flash too; props are set
// again only when the look changes.

interface Fake {
  lighting: boolean;
  tint: number | null;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  sets: number;
}

function fake(x = 0, y = 0): Fake & GameObjects.Image {
  const o = {
    lighting: false,
    tint: null as number | null,
    x,
    y,
    displayWidth: 160,
    displayHeight: 160,
    sets: 0,
    depth: -1,
    setDepth(d: number) {
      o.depth = d;
      return o;
    },
    setLighting(v: boolean) {
      o.lighting = v;
      return o;
    },
    setTint(t: number) {
      o.tint = t;
      o.sets += 1;
      return o;
    },
    clearTint() {
      o.tint = null;
      return o;
    },
    once() {
      return o;
    },
  };
  return o as unknown as Fake & GameObjects.Image;
}

const view = { x: 0, y: 0, width: 640, height: 360 };

describe('WorldLayer (074)', () => {
  it('tints an unlit chunk with the tint it is given (the flash included), not the steady ambient', () => {
    const w = new WorldLayer();
    w.apply({ litGround: false, litProps: false, tint: 0x757490 });
    const chunk = w.addChunk(fake());
    w.lightChunks([], 0xe3e2ed, view);
    expect(chunk.tint).toBe(0xe3e2ed);
  });

  it('lights only the chunks a light reaches when the ground is lit, tinting the rest', () => {
    const w = new WorldLayer();
    w.apply({ litGround: true, litProps: true, tint: 0x757490 });
    const near = w.addChunk(fake(0, 0));
    const far = w.addChunk(fake(320, 0));
    w.lightChunks([{ x: 80, y: 80, radius: 40 }], 0x808080, view);
    expect([near.lighting, near.tint]).toEqual([true, null]);
    expect([far.lighting, far.tint]).toEqual([false, 0x808080]);
  });

  it('sets the props again only when the look changes', () => {
    const w = new WorldLayer();
    const prop = w.addProp(fake());
    w.apply({ litGround: false, litProps: false, tint: 0x111111 });
    w.apply({ litGround: false, litProps: false, tint: 0x111111 });
    expect([w.applied, prop.tint]).toEqual([1, 0x111111]);
    w.apply({ litGround: false, litProps: false, tint: 0x222222 });
    expect([w.applied, prop.tint]).toEqual([2, 0x222222]);
  });

  it('on High lights only the props a light reaches (so lit props stay few), the rest tinted, and lets them go again', () => {
    const w = new WorldLayer();
    w.apply({ litGround: true, litProps: true, tint: 0x333333 });
    const near = w.addProp(fake(100, 100));
    const far = w.addProp(fake(2000, 2000));
    w.lightProps([{ x: 110, y: 90, radius: 48 }], view);
    expect([near.lighting, near.tint]).toEqual([true, null]);
    expect([far.lighting, far.tint]).toEqual([false, 0x333333]);
    w.lightProps([], view);
    expect([near.lighting, near.tint]).toEqual([false, 0x333333]);
  });

  it('lights no prop below High', () => {
    const w = new WorldLayer();
    w.apply({ litGround: false, litProps: false, tint: 0x333333 });
    const near = w.addProp(fake(100, 100));
    w.lightProps([{ x: 110, y: 90, radius: 48 }], view);
    expect([near.lighting, near.tint]).toEqual([false, 0x333333]);
  });
});
