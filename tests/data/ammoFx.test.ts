import { describe, expect, it } from 'vitest';
import { AMMO_FX, type FxBurst } from '../../src/data/ammoFx';
import { DEPTHS } from '../../src/data/assets';
import { FX_LOOK, FX_PRIORITY, FX_QUALITY, FX_THRESHOLDS, MACHINE_SPARKS } from '../../src/data/fxQuality';
import { DEATH_MOTES, PARTICLE_BUDGET, PARTICLE_SHARES, PARTICLES } from '../../src/data/juice';
import { paletteHex } from '../../src/data/palette';
import { PIECE_CATEGORIES, PIECES } from '../../src/data/pieces';
import { QUALITY_TIERS } from '../../src/data/settings';
import { TAGS } from '../../src/data/tags';
import { TIERS } from '../../src/data/tiers';
import { WEATHER_CAP } from '../../src/data/weather';

// 078: the ammo looks, the particle budget's shares and priorities, the quality tiers and the machine sparks as data.

const TELEGRAPH_REDS = ['danger', 'hit-red'];

/** Every palette id a value names: any string under a `color`, `colors`, `core`, `edge`, `muzzle` or `smoke` key. */
function colours(v: unknown, key = ''): string[] {
  if (typeof v === 'string') return ['color', 'core', 'edge', 'muzzle', 'colors', 'smoke'].includes(key) ? [v] : [];
  if (Array.isArray(v)) return v.flatMap((x) => colours(x, key));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => colours(x, k));
  return [];
}

describe('the ammo looks (078)', () => {
  it('has a row for every base family, the Shard and the bomblet, every element and shape tag and every tier', () => {
    expect(Object.keys(AMMO_FX.families).sort()).toEqual(['arrow', 'bomb', 'bomblet', 'landmine', 'ley-bolt', 'shard']);
    expect(Object.keys(AMMO_FX.elements).sort()).toEqual(Object.values(TAGS).filter((t) => t.slot === 'element').map((t) => t.id).sort());
    expect(Object.keys(AMMO_FX.shapes).sort()).toEqual(Object.values(TAGS).filter((t) => t.slot === 'shape').map((t) => t.id).sort());
    expect(Object.keys(AMMO_FX.tiers).sort()).toEqual(Object.keys(TIERS).sort());
  });

  it('draws every colour from the palette, never the telegraph reds, and flame-dark only in the fire trail', () => {
    const all = colours(AMMO_FX);
    expect(all.length).toBeGreaterThan(80);
    for (const c of all) expect(() => paletteHex(c), c).not.toThrow();
    for (const c of TELEGRAPH_REDS) expect(all).not.toContain(c);
    const { fire, ...rest } = AMMO_FX.elements;
    if (!fire) throw new Error('no fire row');
    expect(colours({ ...AMMO_FX, elements: rest })).not.toContain('flame-dark');
    expect(colours({ ...fire, trail: { ...fire.trail, color: '' } })).not.toContain('flame-dark');
    expect(fire.trail.color).toBe('flame-dark');
  });

  it('gives the families the spec’s trails: a 28 px streak, a 22 px ley ribbon, fuse smoke, a tumble', () => {
    const f = AMMO_FX.families;
    expect(f.arrow?.trail).toMatchObject({ kind: 'streak', length: 28, width: 1.4, alpha: 0.55, color: 'rock-pale', core: 'snow' });
    expect(f['ley-bolt']?.trail).toMatchObject({ kind: 'ribbon', length: 22, width: 3, color: 'cyan', core: 'cyan-glow', additive: true });
    expect(f.bomb?.trail.kind).toBe('smoke');
    expect(f.bomb?.shed).toMatchObject({ lifeMs: [600, 600], size: 2.5, grow: 6, alpha: 0.6 });
    // A bomb's and a bomblet's fuse twinkle where the sprite's spark is.
    expect(f.bomb?.fuse).toEqual([3.1, -6.2]);
    expect(f.bomblet?.fuse).toEqual([1.6, -2.4]);
    expect(f.arrow?.fuse).toBeUndefined();
    expect(f.landmine?.trail.kind).toBe('tumble');
    expect(f.landmine?.spin).toBe(1.5);
    expect(f.landmine?.landing?.count).toBe(4);
    expect(AMMO_FX.shapes.homing?.trailScale).toBe(2);
  });

  it('gives the spec’s impact counts on Medium', () => {
    const count = (bs: readonly FxBurst[]) => bs.reduce((n, b) => n + b.count, 0);
    const f = AMMO_FX.families;
    expect(count(f.arrow?.impact.bursts ?? [])).toBe(5);
    expect(count(f['ley-bolt']?.impact.bursts ?? [])).toBe(6);
    expect(f.bomb?.impact.bursts.map((b) => b.count)).toEqual([10, 6]);
    expect(f.landmine?.impact.bursts.map((b) => b.count)).toEqual([14, 3]);
    expect(count(f.shard?.impact.bursts ?? [])).toBe(3);
    expect(f.bomblet?.impact.bursts.map((b) => b.count)).toEqual([4, 2]);
    for (const e of Object.values(AMMO_FX.elements)) expect(count(e.impact)).toBe(4);
    for (const [id, t] of Object.entries(AMMO_FX.tiers)) expect(count(t.impact), id).toBe(id === 'storm-glass' ? 4 : 3);
  });
});

describe('the particle budget’s shares and priorities (078)', () => {
  it('derives the effect share from 076’s budget and death cap and 077’s weather cap: 50, 80 and 140', () => {
    for (const q of QUALITY_TIERS) {
      const s = PARTICLE_SHARES[q];
      expect(s.death + s.weather + s.effect, q).toBe(PARTICLE_BUDGET[q]);
      expect(Math.min(s.death, s.weather, s.effect), q).toBeGreaterThanOrEqual(0);
      expect(s.death).toBe(DEATH_MOTES.liveCap[q]);
      expect(s.weather).toBe(WEATHER_CAP[q]);
    }
    expect(Object.fromEntries(QUALITY_TIERS.map((q) => [q, PARTICLE_SHARES[q].effect]))).toEqual({ low: 50, medium: 80, high: 140 });
  });

  it('gives every PARTICLES key and every 078 burst a priority, thresholds 1, 0.85 and 0.5', () => {
    for (const k of Object.keys(PARTICLES)) expect(FX_PRIORITY, k).toHaveProperty(k);
    for (const k of ['impact', 'end', 'blast', 'muzzle', 'machineSparks', 'trailBits', 'landingDust']) expect(FX_PRIORITY, k).toHaveProperty(k);
    expect(FX_THRESHOLDS).toEqual({ cue: 1, shot: 0.85, soft: 0.5 });
    const cues = ['enemyBurst', 'poundDust', 'stompDust', 'waveSpray', 'chargeDust', 'chargeImpact', 'rippleDust', 'eruption', 'bashSpark', 'boltFlash', 'ventFlare', 'slamDust', 'floodFlare', 'bellowsBurst', 'rodStrike', 'barrierShards', 'blockSpark', 'hitPlayer'];
    expect(Object.entries(FX_PRIORITY).filter(([, p]) => p === 'cue').map(([k]) => k).sort()).toEqual([...cues].sort());
    expect(Object.entries(FX_PRIORITY).filter(([, p]) => p === 'soft').map(([k]) => k).sort()).toEqual(['footDust', 'landingDust', 'rollDust', 'trailBits']);
  });

  it('sets each tier’s scale, trail cap, colours, trail bits, mark cap and additive blending', () => {
    expect(FX_QUALITY).toEqual({
      low: { scale: 0.5, trailCap: 24, core: false, edge: false, bitMs: null, smokeMs: null, markCap: 6, additive: false },
      medium: { scale: 1, trailCap: 48, core: true, edge: false, bitMs: 80, smokeMs: 60, markCap: 12, additive: true },
      high: { scale: 1.25, trailCap: 96, core: true, edge: true, bitMs: 40, smokeMs: 40, markCap: 24, additive: true },
    });
    expect(FX_LOOK.points).toBe(24);
    expect(FX_LOOK.fadeMs).toBe(120);
  });

  it('draws marks and trails over the fog and under the telegraphs and anything standing', () => {
    expect(DEPTHS.shotMark).toBe(0.35);
    expect(DEPTHS.shotTrail).toBe(0.45);
    expect(DEPTHS.shotMark).toBeGreaterThan(DEPTHS.fog);
    expect(DEPTHS.shotTrail).toBeGreaterThan(DEPTHS.shotMark);
    expect(DEPTHS.shotTrail).toBeLessThan(DEPTHS.groundFx);
  });
});

describe('machine sparks (078)', () => {
  it('give every build group but logistics, every stage tag and the Tempering coil their colours', () => {
    for (const c of PIECE_CATEGORIES.map((x) => x.id)) {
      if (c === 'logistics') expect(MACHINE_SPARKS.byCategory[c]).toBeUndefined();
      else expect(MACHINE_SPARKS.byCategory[c]?.length, c).toBeGreaterThan(0);
    }
    for (const t of Object.values(TAGS)) {
      const has = t.slot === 'element' ? AMMO_FX.elements[t.id]?.impact[0]?.colors : MACHINE_SPARKS.byShape[t.id];
      expect(has?.length, t.id).toBeGreaterThan(0);
    }
    expect(MACHINE_SPARKS.byPiece['tempering-coil']).toEqual(['storm-glow', 'snow']);
    expect(Object.keys(PIECES)).toContain('tempering-coil');
    for (const c of colours(MACHINE_SPARKS.byCategory, 'colors').concat(colours(MACHINE_SPARKS.byShape, 'colors'), colours(MACHINE_SPARKS.byPiece, 'colors'))) expect(() => paletteHex(c), c).not.toThrow();
    expect(MACHINE_SPARKS.burst.count).toBe(4);
  });
});
