import { describe, expect, it } from 'vitest';
import { TITLE_SCREEN } from '../../src/data/titleScreen';
import { titleMotion } from '../../src/render/flow/TitleWanderer';

// 050 (F): the title's wanderer breathes (a slow dip of the hips), its cloak and hose sway in the wind, and the tube's
// glow pulses, each on its own slow loop.

const M = TITLE_SCREEN.motion;
const sample = (key: keyof ReturnType<typeof titleMotion>, period: number) => Array.from({ length: 40 }, (_, i) => titleMotion((i / 40) * period)[key]);

describe('the title wanderer’s motion (050)', () => {
  it('breathes: the hips dip up to `crouch` and back once per breath, slowly', () => {
    const c = sample('crouch', M.breathMs);
    expect(Math.min(...c)).toBeCloseTo(0, 5);
    expect(Math.max(...c)).toBeCloseTo(M.crouch, 1);
    expect(M.breathMs).toBeGreaterThanOrEqual(2500);
    expect(titleMotion(M.breathMs).crouch).toBeCloseTo(titleMotion(0).crouch, 5);
  });

  it('sways the cloak and hose both ways in the wind, the hose a little behind', () => {
    const flap = sample('flap', M.swayMs);
    const hose = sample('hose', M.swayMs);
    expect(Math.min(...flap)).toBeLessThan(-M.flap * 0.9);
    expect(Math.max(...flap)).toBeGreaterThan(M.flap * 0.9);
    expect(Math.max(...hose)).toBeGreaterThan(M.hose * 0.9);
    expect(titleMotion(M.swayMs / 4).flap).not.toBeCloseTo(titleMotion(M.swayMs / 4).hose / M.hose * M.flap, 3);
  });

  it('pulses the tube’s glow between its two strengths', () => {
    const g = sample('muzzle', M.glowMs);
    expect(Math.min(...g)).toBeCloseTo(M.muzzle[0], 2);
    expect(Math.max(...g)).toBeCloseTo(M.muzzle[1], 1);
  });
});
