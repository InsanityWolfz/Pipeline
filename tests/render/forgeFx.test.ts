import { describe, expect, it } from 'vitest';
import { FORGE_FX_MAX, QUENCH, SPARKS, STEAM } from '../../src/data/foundryFx';
import { createRng } from '../../src/sim/rng';
import { burstCount, pickFx, SteamClock } from '../../src/render/foundry/forgeFx';
import type { ForgeAt } from '../../src/render/foundry/runningForges';

// 079: which running forge machines get effects (on screen with the margin, nearest the view's centre, up to the
// tier's max), the steam schedule from the seeded stream, the counts by tier and the budget's thinning.

const view = { x: 0, y: 0, width: 640, height: 360 };
const forge = (id: number, x: number, bottom: number, pieceId = 'smelter'): ForgeAt => ({ id, pieceId, x, bottom });

describe('forge effects (079)', () => {
  it('takes only machines on screen, with a 32 px margin', () => {
    const running = [forge(1, 320, 200), forge(2, -40, 200), forge(3, 685, 200), forge(4, 320, 420), forge(5, 320, 600)];
    const { onScreen } = pickFx(running, view, 'high');
    // 2's right edge is at -24 and 3's left at 669 (inside the margin: 672); 4's top is 388 (inside); 5's is 568.
    expect(onScreen.map((f) => f.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('gives shimmer and steam to the tier’s max nearest the view’s centre; the rest keep their glow', () => {
    const running = Array.from({ length: 16 }, (_, i) => forge(i, 40 + i * 36, 180));
    for (const q of ['low', 'medium', 'high'] as const) {
      const { onScreen, fx } = pickFx(running, view, q);
      expect(onScreen.length, q).toBe(16);
      expect(fx.length, q).toBe(FORGE_FX_MAX[q]);
      const d = (f: ForgeAt) => Math.abs(f.x - 320);
      const worstIn = Math.max(...fx.map(d));
      const bestOut = Math.min(...onScreen.filter((f) => !fx.includes(f)).map(d));
      expect(worstIn, q).toBeLessThanOrEqual(bestOut);
    }
  });

  it('heats only the Smelter and kiln: the coil never gets shimmer or steam', () => {
    const { fx, onScreen } = pickFx([forge(1, 300, 200, 'tempering-coil'), forge(2, 340, 200, 'kiln')], view, 'high');
    expect(onScreen.map((f) => f.id).sort()).toEqual([1, 2]);
    expect(fx.map((f) => f.id)).toEqual([2]);
  });

  it('counts what it looked at: nothing with nothing running', () => {
    expect(pickFx([], view, 'high').visited).toBe(0);
    expect(pickFx([forge(1, 300, 200), forge(2, 2000, 200)], view, 'high').visited).toBe(1);
  });

  it('puffs steam every 700 ms ± 200 from the seeded stream: the same seed gives the same puffs', () => {
    const run = (seed: number) => {
      const clock = new SteamClock(createRng(seed));
      const puffs: string[] = [];
      for (let t = 0; t < 120; t++) for (const id of clock.step(33, [1, 2, 3])) puffs.push(`${t}:${id}`);
      return puffs;
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
    // About 4 s of three machines at one puff every 0.5–0.9 s.
    const n = run(7).length;
    expect(n).toBeGreaterThanOrEqual(3 * Math.floor(3960 / 900));
    expect(n).toBeLessThanOrEqual(3 * Math.ceil(3960 / 500) + 3);
  });

  it('gaps puffs within 500–900 ms, and forgets machines that drop out', () => {
    const clock = new SteamClock(createRng(3));
    const times: number[] = [];
    for (let t = 0; t < 300; t++) if (clock.step(10, [9]).length > 0) times.push(t * 10);
    const gaps = times.slice(1).map((t, i) => t - (times[i] ?? 0));
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(STEAM.everyMs - STEAM.jitterMs - 10);
      expect(g).toBeLessThanOrEqual(STEAM.everyMs + STEAM.jitterMs + 10);
    }
    clock.step(10, []);
    expect(clock.size).toBe(0);
  });

  it('counts by tier, and thins a burst to the budget’s room', () => {
    expect(burstCount(STEAM.count, 'low', 99)).toBe(1);
    expect(burstCount(QUENCH.count, 'medium', 99)).toBe(4);
    expect(burstCount(SPARKS.count, 'high', 99)).toBe(10);
    expect(burstCount(SPARKS.count, 'high', 4)).toBe(4);
    expect(burstCount(SPARKS.count, 'high', 0)).toBe(0);
    expect(burstCount(SPARKS.count, 'high', -3)).toBe(0);
  });
});
