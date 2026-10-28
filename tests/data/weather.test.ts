import { describe, expect, it } from 'vitest';
import { DECOR_REGIONS } from '../../src/data/decor';
import { LEY_FLOW, RIPPLES, SWAY, WIND } from '../../src/data/ambient';
import { paletteHex } from '../../src/data/palette';
import { QUALITY_TIERS } from '../../src/data/settings';
import { WEATHER, WEATHER_BUDGET, WEATHER_CAP, WEATHER_LIGHTNING } from '../../src/data/weather';
import { DEPTHS } from '../../src/data/assets';
import { DEATH_MOTES, PARTICLE_BUDGET } from '../../src/data/juice';

// 077: each region's weather and the ambient motion as data: layers in palette ids, each tier's counts within the
// cap, the cap leaving 076's death motes their room in the shared budget; the wind, sway, ripples and ley flow.

describe('weather (077)', () => {
  it('gives every region its weather, in palette ids', () => {
    expect(DECOR_REGIONS.map((r) => [r, WEATHER[r].layers.map((l) => l.id)])).toEqual([
      ['meadow', ['pollen', 'ley-motes']],
      ['hollows', ['dust']],
      ['ember', ['ash', 'embers']],
      ['storm', ['rain', 'splashes']],
    ]);
    for (const r of DECOR_REGIONS) for (const l of WEATHER[r].layers) for (const c of l.colors) expect(() => paletteHex(c), `${r} ${l.id}`).not.toThrow();
    expect(DECOR_REGIONS.filter((r) => WEATHER[r].lightning)).toEqual(['storm']);
  });

  it('keeps each tier’s weather within its cap: at most 30, 80 and 160 in view, capped at 40, 100 and 160', () => {
    expect(WEATHER_CAP).toEqual({ low: 40, medium: 100, high: 160 });
    const most = { low: 0, medium: 0, high: 0 };
    for (const r of DECOR_REGIONS) {
      for (const q of QUALITY_TIERS) {
        const total = WEATHER[r].layers.reduce((n, l) => n + l.count[q], 0);
        expect(total, `${r} ${q}`).toBeLessThanOrEqual(WEATHER_CAP[q]);
        most[q] = Math.max(most[q], total);
      }
    }
    expect(most).toEqual({ low: 30, medium: 80, high: 160 });
    // Splashes on High only.
    expect(WEATHER.storm.layers.find((l) => l.id === 'splashes')?.count).toEqual({ low: 0, medium: 0, high: 20 });
  });

  it('leaves 076’s death motes their room in the shared budget, and 50, 80 and 140 for 078', () => {
    const left = Object.fromEntries(QUALITY_TIERS.map((q) => [q, WEATHER_BUDGET.particles[q] - WEATHER_BUDGET.deathMotes[q] - WEATHER_CAP[q]]));
    expect(left).toEqual({ low: 50, medium: 80, high: 140 });
    // 076's numbers (its spec's PARTICLE_BUDGET and live death-mote cap), mirrored until it merges.
    // 076 is in: the budget reads its constants (no copy).
    expect(WEATHER_BUDGET.particles).toBe(PARTICLE_BUDGET);
    expect(WEATHER_BUDGET.deathMotes).toBe(DEATH_MOTES.liveCap);
  });

  it('times weather lightning every 10–22 s, never near a storm rod, at least 6 tiles from the player', () => {
    expect(WEATHER_LIGHTNING).toMatchObject({ everyMs: [10000, 22000], minWeight: 0.5, playerMargin: 6, rodNodeMargin: 4, boltMs: 220 });
  });

  it('draws weather over everything standing and under the supply line, bars, names and the HUD', () => {
    expect(DEPTHS.weather).toBeGreaterThan(DEPTHS.silhouette);
    for (const d of [DEPTHS.supplyLine, DEPTHS.motes, DEPTHS.worldUi, DEPTHS.hoverName, DEPTHS.prompt, DEPTHS.hud]) expect(DEPTHS.weather).toBeLessThan(d);
  });
});

describe('ambient motion (077)', () => {
  it('gives each region its wind: a breeze, the Hollows’ gusts, the Emberworks’ still air, the Stormcrown’s gale', () => {
    expect(WIND).toEqual({
      meadow: { toward: 90, strength: 1 },
      hollows: { toward: 112.5, strength: 1, gusts: { everyMs: [6000, 10000], mult: 2.5, ms: 1500 } },
      ember: { toward: 90, strength: 0.5 },
      storm: { toward: 135, strength: 1.8, gusts: { everyMs: [4000, 8000], mult: 1.5, ms: 1000 } },
    });
  });

  it('sways by kind, steps at most 0, 300 and 600 objects a frame, ripples and beads by tier', () => {
    expect(SWAY.amplitude).toEqual({ grass: 4, flower: 3, fern: 2.5, reed: 2.5, vine: 3, tree: 0.6 });
    expect(SWAY.periodMs.grass).toEqual([2400, 3600]);
    expect(SWAY.periodMs.tree).toEqual([4000, 5000]);
    expect(SWAY.perFrame).toEqual({ low: 0, medium: 300, high: 600 });
    expect(RIPPLES.max).toEqual({ low: 0, medium: 12, high: 20 });
    expect([RIPPLES.lifeMs, RIPPLES.grow, RIPPLES.alpha, RIPPLES.color, RIPPLES.springColor]).toEqual([1600, [2, 10], 0.5, 'foam', 'cyan-glow']);
    expect(LEY_FLOW).toMatchObject({ color: 'cyan-glow', alpha: 0.7, length: 6, speed: 24, every: { low: 0, medium: 4, high: 3 }, max: { low: 0, medium: 24, high: 48 } });
  });
});
