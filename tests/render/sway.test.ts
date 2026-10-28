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

  // Review: a gust or a region's blend used to change the clock's rate, so late in a session the phase jumped (−2.91° to
  // 2.12° in a frame at a Stormcrown gust's start) or fluttered for a second across a border. The cycle is the plant's
  // own; the wind changes only the amplitude and the lean, eased over SWAY.easeMs.
  const lateMs = 10 * 60_000;
  const frameMs = 1000 / 60;
  /** The largest change of any object's angle from one frame to the next, `frames` frames from `lateMs`, the wind by frame. */
  function largestStep(windAt: (frame: number) => { strength: number; dx: number; dy: number }, frames: number, kind: SwayKind = 'grass'): number {
    const { stepper, byChunk } = world(40, kind);
    const fakes = [...byChunk.values()].flat();
    let last: number[] | null = null;
    let most = 0;
    for (let i = 0; i < frames; i++) {
      stepper.step(view, lateMs + i * frameMs, windAt(i), SWAY.perFrame.high);
      const now = fakes.map((f) => f.angle);
      if (last) for (const [j, a] of now.entries()) most = Math.max(most, Math.abs(a - (last[j] ?? a)));
      last = now;
    }
    return most;
  }
  /** Under a plant's own fastest swing in a frame (its amplitude and lean over its shortest cycle) plus the ease's share. */
  const smooth = SWAY.amplitude.grass * (1 + SWAY.lean) * ((2 * Math.PI * frameMs) / SWAY.periodMs.grass[0] + (3 * frameMs) / SWAY.easeMs);

  it('never jumps between frames as a gust starts and ends, late in a session (the Stormcrown’s and the Hollows’)', () => {
    const storm = { dx: Math.SQRT1_2, dy: Math.SQRT1_2 };
    const gusty = (base: number, mult: number) => (i: number) => ({ strength: i >= 60 && i < 120 ? base * mult : base, ...storm });
    expect(largestStep(gusty(1.8, 1.5), 240)).toBeLessThanOrEqual(smooth);
    expect(largestStep(gusty(1, 2.5), 240)).toBeLessThanOrEqual(smooth);
    // The Emberworks' still air to the meadow's breeze at once (a waypoint's jump): eased, not snapped.
    expect(largestStep((i) => ({ strength: i < 60 ? 0.5 : 1, dx: 1, dy: 0 }), 180)).toBeLessThanOrEqual(smooth);
  });

  it('never flutters crossing a region’s blend, late in a session', () => {
    // Region 1's east breeze to the Stormcrown's strong south-east wind over 1.3 s, as walking the band.
    const frames = Math.round(1300 / frameMs);
    const blend = (i: number) => {
      const k = Math.min(1, Math.max(0, (i - 30) / frames));
      const dx = 1 - k + k * Math.SQRT1_2;
      const dy = k * Math.SQRT1_2;
      const len = Math.hypot(dx, dy);
      return { strength: 1 + 0.8 * k, dx: dx / len, dy: dy / len };
    };
    expect(largestStep(blend, frames + 90)).toBeLessThanOrEqual(smooth);
  });

  it('keeps each plant’s own cycle (2.4–3.6 s) in any wind: the wind sets only its amplitude and lean', () => {
    const e = { x: 4000, y: 3000, kind: 'grass' as const, period: 3000, phase: 0.25 };
    for (const strength of [0.5, 1, 1.8, 2.7]) {
      const w = { strength, dx: Math.SQRT1_2, dy: Math.SQRT1_2 };
      for (const t of [lateMs, lateMs + 700, lateMs + 1900]) expect(swayAngle(e, t + e.period, w), `strength ${strength}`).toBeCloseTo(swayAngle(e, t, w), 6);
    }
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

  it('steps a tree node (added on its own) while in view, keeps it when its chunk drops, and lets it go when removed', () => {
    const stepper = new SwayStepper(C);
    const node = new Fake();
    const remove = stepper.addFixed({ target: node, x: 2 * C + 10, y: 2 * C + 10, kind: 'tree', period: 4500, phase: 0 });
    stepper.step(view, 500, wind, 300);
    expect(node.turns).toBe(1);
    stepper.removeChunk('2,2');
    stepper.step(view, 600, wind, 300);
    expect(node.turns).toBe(2);
    remove();
    stepper.step(view, 700, wind, 300);
    expect(node.turns).toBe(2);
  });

  it('forgets a dropped chunk', () => {
    const { stepper } = world(5);
    expect(stepper.builtChunks).toBe(25);
    stepper.removeChunk('2,2');
    expect(stepper.builtChunks).toBe(24);
    expect(stepper.count('2,2')).toBe(0);
  });
});
