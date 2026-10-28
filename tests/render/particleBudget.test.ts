import { describe, expect, it } from 'vitest';
import { DEATH_MOTES, PARTICLE_BUDGET, PARTICLE_SHARES } from '../../src/data/juice';
import { WEATHER_CAP } from '../../src/data/weather';
import { QUALITY_TIERS } from '../../src/data/settings';
import { ParticleLedger, roomFor, type LiveCounts } from '../../src/render/particleBudget';
import { waveCount } from '../../src/render/deathMotes';
import { budgetRoom } from '../../src/render/world/weatherModel';

// 078: one budget, three fixed shares, one seam. `roomFor` is a kind's share (thinned by priority inside the effect
// share) less its live count, never more than the budget less every live particle; no share lends its room.

const live = (death = 0, weather = 0, effect = 0): LiveCounts => ({ death, weather, effect });

describe('roomFor (078)', () => {
  it('gives each kind its share when nothing flies', () => {
    for (const q of QUALITY_TIERS) {
      expect(roomFor('death', 'cue', q, live())).toBe(PARTICLE_SHARES[q].death);
      expect(roomFor('weather', 'cue', q, live())).toBe(PARTICLE_SHARES[q].weather);
      expect(roomFor('effect', 'cue', q, live())).toBe(PARTICLE_SHARES[q].effect);
    }
  });

  it('stops soft bits at 50% of the effect share, shot bursts at 85%, and lets cues use the rest', () => {
    // Medium's effect share is 80: soft bits to 40, shots to 68, cues to 80.
    expect(roomFor('effect', 'soft', 'medium', live())).toBe(40);
    expect(roomFor('effect', 'soft', 'medium', live(0, 0, 39))).toBe(1);
    expect(roomFor('effect', 'soft', 'medium', live(0, 0, 40))).toBe(0);
    expect(roomFor('effect', 'shot', 'medium', live(0, 0, 40))).toBe(28);
    expect(roomFor('effect', 'shot', 'medium', live(0, 0, 68))).toBe(0);
    expect(roomFor('effect', 'cue', 'medium', live(0, 0, 68))).toBe(12);
    expect(roomFor('effect', 'cue', 'medium', live(0, 0, 80))).toBe(0);
    expect(roomFor('effect', 'shot', 'low', live())).toBe(42);
    expect(roomFor('effect', 'soft', 'high', live())).toBe(70);
  });

  it('lends no share’s room to another: a full weather or death share never crowds out effects, and the reverse', () => {
    expect(roomFor('effect', 'cue', 'high', live(DEATH_MOTES.liveCap.high, WEATHER_CAP.high, 0))).toBe(PARTICLE_SHARES.high.effect);
    expect(roomFor('weather', 'cue', 'high', live(DEATH_MOTES.liveCap.high, 0, PARTICLE_SHARES.high.effect))).toBe(WEATHER_CAP.high);
    expect(roomFor('death', 'cue', 'low', live(0, WEATHER_CAP.low, PARTICLE_SHARES.low.effect))).toBe(DEATH_MOTES.liveCap.low);
    // An empty weather share is not lent to effects.
    expect(roomFor('effect', 'cue', 'medium', live(0, 0, PARTICLE_SHARES.medium.effect))).toBe(0);
  });

  it('never gives more than the budget less every live particle', () => {
    expect(roomFor('death', 'cue', 'medium', live(0, 0, PARTICLE_BUDGET.medium - 3))).toBe(3);
    expect(roomFor('weather', 'cue', 'low', live(0, 0, PARTICLE_BUDGET.low + 40))).toBe(0);
  });
});

describe('the ledger (078)', () => {
  it('counts each kind as it is added and removed, and answers from its counts', () => {
    const l = new ParticleLedger();
    l.add('effect', 30);
    l.add('death', 10);
    l.set('weather', 25);
    expect(l.live).toEqual(live(10, 25, 30));
    expect(l.total).toBe(65);
    l.remove('effect', 5);
    expect(l.room('effect', 'shot', 'medium')).toBe(68 - 25);
    l.clear('effect');
    l.clear('death');
    expect(l.live).toEqual(live(0, 25, 0));
  });
});

describe('the seam keeps 076’s and 077’s counts (078)', () => {
  it('076’s waveCount: the death share less live motes, within what the budget leaves', () => {
    expect(waveCount(20, { quality: 'medium', liveMotes: DEATH_MOTES.liveCap.medium - 4, liveParticles: 0 })).toBe(4);
    expect(waveCount(20, { quality: 'medium', liveMotes: 0, liveParticles: 0 })).toBe(20);
    expect(waveCount(20, { quality: 'medium', liveMotes: 0, liveParticles: PARTICLE_BUDGET.medium - 3 })).toBe(3);
    // Weather counts against the budget too, now it reports to the ledger.
    expect(waveCount(20, { quality: 'low', liveMotes: 0, liveParticles: 100, liveWeather: 40 })).toBe(10);
  });

  it('077’s budgetRoom: weather’s share less live weather, within what the budget leaves; the same as before while deaths and effects stay in their shares', () => {
    for (const q of QUALITY_TIERS) {
      // Before 078: the budget less the death cap less everything alive. While deaths and effects together are within
      // the effect share, that left at least weather's cap, so the cap (the layer targets) decided: the same count.
      for (const other of [0, 20, PARTICLE_SHARES[q].effect]) {
        for (const w of [0, 10, WEATHER_CAP[q]]) {
          const before = Math.max(0, PARTICLE_BUDGET[q] - DEATH_MOTES.liveCap[q] - other - w);
          expect(Math.min(budgetRoom(q, other, w), WEATHER_CAP[q] - w), `${q} ${other} ${w}`).toBe(Math.min(before, WEATHER_CAP[q] - w));
        }
      }
    }
    expect(budgetRoom('high', 0, 0)).toBe(WEATHER_CAP.high);
    expect(budgetRoom('medium', 500, 0)).toBe(0);
  });
});
