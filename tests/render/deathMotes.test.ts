import { describe, expect, it } from 'vitest';
import { ENEMY_MOTION } from '../../src/data/art/enemyMotion';
import { DEATH_MOTES, PARTICLE_BUDGET } from '../../src/data/juice';
import { deathMoteCount, dissolveAt, dissolveMs, moteWaves, waveCount } from '../../src/render/deathMotes';

// 076: deaths dissolve into ley motes in the family's colours, as many as the size class, a champion and the
// Graphics quality say, thinned to fit the per-death cap, the live death-mote cap and the particle budget.

const D = ENEMY_MOTION.dissolve;
const empty = (quality: 'low' | 'medium' | 'high') => ({ quality, liveMotes: 0, liveParticles: 0 });

describe('death motes (076)', () => {
  it('count by size class, ×1.5 for a champion, ×0.5 / 1 / 1.5 by quality', () => {
    expect(deathMoteCount('wisp', false, empty('medium'))).toBe(10);
    expect(deathMoteCount('husk', false, empty('medium'))).toBe(16);
    expect(deathMoteCount('slag-golem', false, empty('medium'))).toBe(24);
    expect(deathMoteCount('gale-ram', false, empty('medium'))).toBe(24);
    expect(deathMoteCount('pylon-warden', false, empty('medium'))).toBe(60);
    expect(deathMoteCount('husk', true, empty('medium'))).toBe(24);
    expect(deathMoteCount('husk', false, empty('low'))).toBe(8);
    expect(deathMoteCount('husk', false, empty('high'))).toBe(24);
    // Low throws half of Medium's.
    for (const id of ['husk', 'wisp', 'charger', 'gale-ram']) expect(deathMoteCount(id, false, empty('low'))).toBe(deathMoteCount(id, false, empty('medium')) / 2);
    // The cinder mote's own burst plays too: half its motes.
    expect(deathMoteCount('cinder-mote', false, empty('medium'))).toBe(5);
  });

  it('are capped per death, by the live death motes, and by what the particle budget has left', () => {
    expect(deathMoteCount('bulwark', true, empty('medium'))).toBe(DEATH_MOTES.perDeathCap.medium);
    expect(deathMoteCount('bulwark', true, empty('low'))).toBe(DEATH_MOTES.perDeathCap.low);
    expect(deathMoteCount('bulwark', true, empty('high'))).toBe(DEATH_MOTES.perDeathCap.high);
    expect(deathMoteCount('husk', false, { quality: 'medium', liveMotes: DEATH_MOTES.liveCap.medium - 5, liveParticles: 0 })).toBe(5);
    expect(deathMoteCount('husk', false, { quality: 'medium', liveMotes: 0, liveParticles: PARTICLE_BUDGET.medium - 3 })).toBe(3);
    // The cap is hard: a crowded fight throws none.
    expect(deathMoteCount('husk', false, { quality: 'low', liveMotes: 0, liveParticles: PARTICLE_BUDGET.low + 40 })).toBe(0);
    expect(deathMoteCount('husk', false, { quality: 'high', liveMotes: DEATH_MOTES.liveCap.high, liveParticles: 0 })).toBe(0);
    expect(waveCount(20, { quality: 'medium', liveMotes: DEATH_MOTES.liveCap.medium - 4, liveParticles: 0 })).toBe(4);
    expect(waveCount(20, { quality: 'medium', liveMotes: 0, liveParticles: 0 })).toBe(20);
  });

  it('leave in three waves that add up', () => {
    expect(moteWaves(16, 3)).toEqual([6, 5, 5]);
    expect(moteWaves(2, 3)).toEqual([1, 1, 0]);
    expect(moteWaves(0, 3)).toEqual([0, 0, 0]);
    for (const n of [5, 10, 24, 60, 90]) expect(moteWaves(n, D.waves).reduce((a, b) => a + b, 0)).toBe(n);
  });
});

describe('the dissolve (076)', () => {
  it('shows the struck pose, then narrows, stretches and fades out: 600 ms, bosses 1.4 s', () => {
    expect(dissolveMs(false)).toBe(600);
    expect(dissolveMs(true)).toBe(1400);
    expect(dissolveAt(50, false, true)).toMatchObject({ phase: 'struck', alpha: 1, sx: 1, sy: 1 });
    expect(dissolveAt(150, true, true).phase).toBe('struck');
    const mid = dissolveAt(D.struckMs + D.fadeMs / 2, false, true);
    expect(mid.phase).toBe('dissolve');
    expect(mid.alpha).toBeGreaterThan(0);
    expect(mid.alpha).toBeLessThan(1);
    expect(mid.sx).toBeLessThan(1);
    expect(mid.sy).toBeGreaterThan(1);
    const end = dissolveAt(D.struckMs + D.fadeMs - 0.01, false, true);
    expect(end.sx).toBeCloseTo(D.narrow, 2);
    expect(end.sy).toBeCloseTo(D.stretch, 2);
    expect(end.alpha).toBeCloseTo(0, 2);
    expect(dissolveAt(600, false, true).phase).toBe('done');
    expect(dissolveAt(1399, true, true).phase).toBe('dissolve');
    expect(dissolveAt(1400, true, true).phase).toBe('done');
  });

  it('tints its additive copy to 0.5 at most, 0.25 with Flashes off, fading with the body', () => {
    const tints = (flashes: boolean) => Array.from({ length: 61 }, (_, i) => dissolveAt(i * 10, false, flashes).tint);
    expect(Math.max(...tints(true))).toBeCloseTo(D.tintAlpha, 2);
    expect(Math.max(...tints(false))).toBeCloseTo(D.dimTintAlpha, 2);
    expect(dissolveAt(D.struckMs + D.fadeMs - 1, false, true).tint).toBeLessThan(0.01);
    // No flicker: it rises, then only falls.
    const t = tints(false);
    const peak = t.indexOf(Math.max(...t));
    for (let i = peak + 1; i < t.length; i++) expect(t[i] ?? 0).toBeLessThanOrEqual(t[i - 1] ?? 0);
  });
});
