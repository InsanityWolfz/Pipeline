import { describe, expect, it } from 'vitest';
import { LIGHT_BUDGET, LIGHT_CATCH, LIGHT_SOURCES, QUALITY_LOOK, ROUND_LIGHTS } from '../../src/data/lights';
import { paletteHex } from '../../src/data/palette';
import { DEFAULT_SETTINGS, QUALITY_TIERS } from '../../src/data/settings';
import { DEPTHS, FX_TEXTURES } from '../../src/data/assets';
import { EMBERWORKS_SPRITES } from '../../src/data/emberworksAssets';

// 074: what gives light, by tier and priority; the budgets; the light catch; the quality tiers.

const colours = (c: string | Readonly<Record<string, string>>): string[] => (typeof c === 'string' ? [c] : Object.values(c));

describe('light sources (074)', () => {
  it('uses palette ids only', () => {
    for (const [id, s] of Object.entries(LIGHT_SOURCES)) for (const c of colours(s.color)) expect(() => paletteHex(c), id).not.toThrow();
    for (const c of [...Object.values(ROUND_LIGHTS.byType), ...Object.values(ROUND_LIGHTS.byAmmo)]) expect(() => paletteHex(c)).not.toThrow();
  });

  it('matches the spec’s table', () => {
    const S = LIGHT_SOURCES;
    expect([S.face.color, S.face.radius, S.face.intensity, S.face.priority, S.face.flare, S.face.flareMs]).toEqual(['cyan', 48, 0.8, 0, 1.6, 120]);
    expect([S.muzzle.color, S.muzzle.radius, S.muzzle.intensity, S.muzzle.priority, S.muzzle.ms]).toEqual(['cyan-glow', 64, 1.2, 1, 80]);
    expect([S.conductor.color, S.conductor.radius, S.conductor.intensity, S.conductor.priority, S.conductor.ms]).toEqual(['storm-glow', 96, 1.4, 1, 200]);
    expect([S.forgewright.color, S.forgewright.radius, S.forgewright.intensity, S.forgewright.priority]).toEqual(['cinder', 88, 1.2, 1]);
    expect([S.rodStrike.color, S.rodStrike.radius, S.rodStrike.intensity, S.rodStrike.priority, S.rodStrike.ms]).toEqual(['storm-pale', 112, 1.5, 1, 200]);
    expect([S.burst.color, S.burst.radius, S.burst.intensity, S.burst.priority, S.burst.ms]).toEqual([{ physical: 'cyan-glow', fire: 'cinder', cold: 'foam', lightning: 'storm-glow' }, 1.5, 1, 2, 150]);
    expect([S.fire.color, S.fire.intensity, S.fire.priority, S.fire.flicker, S.fire.radii]).toEqual(['cinder', 0.9, 2, 0.15, { brazier: 64, vent: 72, ground: 40, kiln: 60, chimney: 40 }]);
    // 074.7: a chimney light per look of the stack (the sprite list's order).
    expect(S.fire.chimney.rises).toHaveLength(EMBERWORKS_SPRITES.chimney.length);
    expect([S.ley.radius, S.ley.intensity, S.ley.priority]).toEqual([1.5, 0.7, 3]);
    expect([S.leyLine.color, S.leyLine.radius, S.leyLine.intensity, S.leyLine.priority, S.leyLine.every]).toEqual(['cyan', 40, 0.5, 3, { medium: 6, high: 3 }]);
    expect([ROUND_LIGHTS.radius, ROUND_LIGHTS.intensity, ROUND_LIGHTS.priority, ROUND_LIGHTS.tiers]).toEqual([28, 0.7, 4, ['high']]);
    expect(ROUND_LIGHTS.byType).toEqual({ fire: 'cinder', cold: 'foam', lightning: 'storm-glow' });
    expect(ROUND_LIGHTS.byAmmo).toEqual({ 'ley-bolt': 'cyan' });
    for (const s of Object.values(S)) expect(s.tiers).toEqual(['medium', 'high']);
  });

  it('budgets 0, 8 and 16 lights, and catches at most 0.35 from the two nearest lights on Medium and High', () => {
    expect(LIGHT_BUDGET).toEqual({ low: 0, medium: 8, high: 16 });
    expect(LIGHT_CATCH).toMatchObject({ maxAlpha: 0.35, nearest: 2, tiers: ['medium', 'high'] });
  });

  it('turns on per tier as the spec’s table says', () => {
    expect(QUALITY_TIERS).toEqual(['low', 'medium', 'high']);
    expect(DEFAULT_SETTINGS.quality).toBe('medium');
    expect(QUALITY_LOOK.low).toEqual({ lights: false, pools: false, litGround: false, litProps: false, catch: false, fog: 0, flash: false });
    // 074.13: Medium lights the ground with additive pools; High with Phaser's per-pixel lighting, props too.
    expect(QUALITY_LOOK.medium).toEqual({ lights: true, pools: true, litGround: false, litProps: false, catch: true, fog: 1, flash: true });
    expect(QUALITY_LOOK.high).toEqual({ lights: true, pools: false, litGround: true, litProps: true, catch: true, fog: 2, flash: true });
  });

  it('has a fog depth over the glows and under the ground decals, and a fog texture key', () => {
    expect(DEPTHS.fog).toBeGreaterThan(DEPTHS.glow);
    expect(DEPTHS.fog).toBeLessThan(DEPTHS.groundFx);
    expect(FX_TEXTURES.fog).toBe('fx-fog');
  });
});
