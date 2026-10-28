import { describe, expect, it } from 'vitest';
import { MACHINE_SPARKS } from '../../src/data/fxQuality';
import { QUENCH, STEAM } from '../../src/data/foundryFx';
import { createRng } from '../../src/sim/rng';
import { ForgeParticles } from '../../src/render/foundry/forgeParticles';

// 079: steam, the quench and sparks as a model: every value from the seeded stream, steam rising and fading soft,
// sparks thrown up in 078's cone and falling, each dying at the end of its life.

describe('the forge particles (079)', () => {
  it('replays the same from the same seed', () => {
    const run = () => {
      const m = new ForgeParticles(createRng(11));
      m.puff(100, 100, STEAM, 3);
      m.sparks(120, 110, ['cinder'], 6);
      for (let i = 0; i < 10; i++) m.step(33);
      return m.particles.map((p) => [p.x.toFixed(3), p.y.toFixed(3), p.color]);
    };
    expect(run()).toEqual(run());
  });

  it('lets steam rise and drift soft: alpha at most 0.35, growing, gone within its life', () => {
    const m = new ForgeParticles(createRng(2));
    m.puff(100, 100, QUENCH, 6);
    expect(m.count).toBe(6);
    const start = m.particles.map((p) => ({ y: p.y, size: m.sizeOf(p) }));
    m.step(400);
    for (const [i, p] of m.particles.entries()) {
      expect(p.y).toBeLessThan(start[i]?.y ?? 0);
      expect(m.sizeOf(p)).toBeGreaterThan(start[i]?.size ?? 99);
      expect(m.alphaOf(p)).toBeLessThanOrEqual(0.35);
      expect(QUENCH.colors).toContain(p.color);
    }
    const dead = m.step(QUENCH.lifeMs[1]);
    expect(dead.length).toBe(6);
    expect(m.count).toBe(0);
  });

  it('throws sparks up in 078’s cone, then lets them fall, each within 078’s life', () => {
    const m = new ForgeParticles(createRng(5));
    m.sparks(0, 0, ['cinder-light', 'cinder'], 10);
    const S = MACHINE_SPARKS.burst;
    for (const p of m.particles) {
      expect(p.vy).toBeLessThan(0);
      expect(Math.abs(Math.atan2(p.vx, -p.vy))).toBeLessThanOrEqual(S.cone / 2 + 1e-9);
      expect(Math.hypot(p.vx, p.vy)).toBeGreaterThanOrEqual(S.speed[0]);
      expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(S.speed[1]);
      expect(p.life).toBeGreaterThanOrEqual(S.lifeMs[0]);
      expect(p.life).toBeLessThanOrEqual(S.lifeMs[1]);
    }
    const vy0 = m.particles.map((p) => p.vy);
    m.step(100);
    m.particles.forEach((p, i) => expect(p.vy).toBeGreaterThan(vy0[i] ?? 0));
    m.step(S.lifeMs[1]);
    expect(m.count).toBe(0);
  });

  it('counts steam and sparks apart, and clears', () => {
    const m = new ForgeParticles(createRng(1));
    m.puff(0, 0, STEAM, 2);
    m.sparks(0, 0, ['snow'], 3);
    expect(m.counts).toEqual({ steam: 2, sparks: 3 });
    m.clear();
    expect(m.count).toBe(0);
  });
});
