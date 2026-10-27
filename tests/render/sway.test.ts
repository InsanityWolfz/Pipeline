import { describe, expect, it } from 'vitest';
import { SWAY } from '../../src/data/ambient';
import type { SwayKind } from '../../src/data/decor';
import { SwayStepper, swayAngle, type SwayEntry } from '../../src/render/world/sway';

// 077: the sway stepper touches only the chunks in view, never more objects than its cap (taking turns past it, each at
// least every other frame), keeps angles within their amplitude plus a third's lean, and on Low rests them at 0.

const C = 640;

class Fake {
  angle = 0;
  turns = 0;
  setAngle(a: number): this {
    this.angle = a;
    this.turns += 1;
    return this;
  }
}

/** 25 built chunks (5 × 5), `per` objects in each spread over it. */
function world(per: number, kind: SwayKind = 'grass'): { stepper: SwayStepper; byChunk: Map<string, Fake[]> } {
  const stepper = new SwayStepper(C);
  const byChunk = new Map<string, Fake[]>();
  for (let cy = 0; cy < 5; cy++) {
    for (let cx = 0; cx < 5; cx++) {
      const list: Fake[] = [];
      for (let i = 0; i < per; i++) {
        const f = new Fake();
        list.push(f);
        const e: SwayEntry = { target: f, x: cx * C + 8 + ((i * 37) % (C - 16)), y: cy * C + 8 + ((i * 53) % (C - 16)), kind, period: 3000, phase: (i % 10) / 10 };
        stepper.add(`${cx},${cy}`, e);
      }
      byChunk.set(`${cx},${cy}`, list);
    }
  }
  return { stepper, byChunk };
}

const wind = { strength: 1, dx: 1, dy: 0 };
/** A 640 × 360 view over the corner where four chunks meet. */
const view = { x: 2 * C - 320, y: 2 * C - 180, width: 640, height: 360 };

describe('sway (077)', () => {
  it('with 25 built chunks and 4 in view, touches only those 4', () => {
    const { stepper, byChunk } = world(60);
    const step = stepper.step(view, 1000, wind, SWAY.perFrame.high);
    expect(step.chunks.sort()).toEqual(['1,1', '1,2', '2,1', '2,2']);
    for (const [key, list] of byChunk) {
      const touched = list.some((f) => f.turns > 0);
      if (!step.chunks.includes(key)) expect(touched, key).toBe(false);
    }
    expect(step.updated).toBeGreaterThan(0);
  });

  it('turns at most the cap a frame, taking turns past it so each turns at least every other frame', () => {
    const { stepper, byChunk } = world(400);
    const inView = [...byChunk.entries()].filter(([k]) => ['1,1', '1,2', '2,1', '2,2'].includes(k)).flatMap(([, l]) => l);
    const s1 = stepper.step(view, 0, wind, 300);
    expect(s1.updated).toBe(300);
    const once = inView.filter((f) => f.turns > 0).length;
    stepper.step(view, 16, wind, 300);
    const twice = inView.filter((f) => f.turns > 0).length;
    expect(once).toBe(300);
    // Everything in view (within the margin) was turned within two frames.
    expect(twice).toBeGreaterThan(once);
    expect(twice).toBeLessThanOrEqual(600);
  });

  it('keeps every angle within its amplitude plus a third’s lean, in any wind', () => {
    for (const kind of Object.keys(SWAY.amplitude) as SwayKind[]) {
      const amp = SWAY.amplitude[kind];
      for (const w of [wind, { strength: 1.8 * 1.5, dx: Math.SQRT1_2, dy: Math.SQRT1_2 }, { strength: 0.5, dx: 1, dy: 0 }]) {
        for (let t = 0; t < 10_000; t += 97) {
          const a = swayAngle({ x: t, y: 2 * t, kind, period: 3000, phase: 0.4 }, t, w);
          expect(Math.abs(a)).toBeLessThanOrEqual(amp * (1 + SWAY.lean) + 1e-9);
        }
      }
    }
    // Trees barely move; grass most.
    expect(SWAY.amplitude.tree).toBeLessThan(SWAY.amplitude.grass);
  });

  it('rolls a gust across a field: neighbours along the wind are out of step', () => {
    const a = swayAngle({ x: 0, y: 0, kind: 'grass', period: 3000, phase: 0 }, 500, wind);
    const b = swayAngle({ x: 130, y: 0, kind: 'grass', period: 3000, phase: 0 }, 500, wind);
    expect(a).not.toBeCloseTo(b, 2);
  });

  it('on Low touches nothing out of view and rests what’s in view at 0, once', () => {
    const { stepper, byChunk } = world(30);
    stepper.step(view, 0, wind, 300);
    const s = stepper.step(view, 0, wind, 0);
    expect(s.updated).toBe(0);
    const inView = [...byChunk.entries()].filter(([k]) => s.chunks.includes(k)).flatMap(([, l]) => l);
    for (const f of inView) expect(f.angle).toBe(0);
    const turns = inView.map((f) => f.turns);
    stepper.step(view, 100, wind, 0);
    expect(inView.map((f) => f.turns)).toEqual(turns);
    for (const [key, list] of byChunk) if (!s.chunks.includes(key)) for (const f of list) expect(f.turns, key).toBe(0);
  });

  it('forgets a dropped chunk', () => {
    const { stepper } = world(5);
    expect(stepper.builtChunks).toBe(25);
    stepper.removeChunk('2,2');
    expect(stepper.builtChunks).toBe(24);
    expect(stepper.count('2,2')).toBe(0);
  });
});
