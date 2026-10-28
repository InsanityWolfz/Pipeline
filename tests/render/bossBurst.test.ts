import { describe, expect, it } from 'vitest';
import { INTRO_LOOK } from '../../src/data/art/bossIntro';
import { BOSS_PHASE_LOOK } from '../../src/data/art/bossPhases';
import { PARTICLE_BUDGET, type ParticleBurst } from '../../src/data/juice';
import type { Quality } from '../../src/data/settings';
import { burstCount } from '../../src/render/bossBurst';

// 080: every intro and phase burst, by Graphics quality (Low ×0.5, Medium ×1, High ×1.5), stays inside PARTICLE_BUDGET:
// alone, with the budget nearly spent, and a whole intro's bursts together.

const TIERS: readonly Quality[] = ['low', 'medium', 'high'];
const P = BOSS_PHASE_LOOK;
const PHASE: readonly ParticleBurst[] = [P.bulwark.called.burst, P.bulwark.enraged.steam, P.forgewright.enraged.embers, P.conductor.shards, P.flareBurst];
const INTRO: readonly ParticleBurst[] = Object.values(INTRO_LOOK.bosses).flatMap((b) => [b.stir, b.rise, b.beat]);

describe('080: intro and phase bursts under the particle budget', () => {
  for (const q of TIERS) {
    it(`${q}: each burst at the tier's count, thinned to the room the budget has left`, () => {
      for (const b of [...INTRO, ...PHASE]) {
        expect(burstCount(b.count, INTRO_LOOK.quality, q, 0)).toBe(Math.min(PARTICLE_BUDGET[q], Math.round(b.count * INTRO_LOOK.quality[q])));
        expect(burstCount(b.count, INTRO_LOOK.quality, q, PARTICLE_BUDGET[q] - 3)).toBeLessThanOrEqual(3);
        expect(burstCount(b.count, INTRO_LOOK.quality, q, PARTICLE_BUDGET[q])).toBe(0);
        expect(burstCount(b.count, INTRO_LOOK.quality, q, PARTICLE_BUDGET[q] + 40)).toBe(0);
      }
    });

    it(`${q}: a whole intro's bursts (the stir, three rises and the beat) never pass the budget, however many are live`, () => {
      for (const look of Object.values(INTRO_LOOK.bosses)) {
        for (const start of [0, 100, PARTICLE_BUDGET[q] - 10]) {
          let live = start;
          for (const b of [look.stir, look.rise, look.rise, look.rise, look.beat]) live += burstCount(b.count, INTRO_LOOK.quality, q, live);
          expect(live).toBeLessThanOrEqual(Math.max(start, PARTICLE_BUDGET[q]));
        }
      }
    });
  }

  it('the phase looks scale by the same tiers as the intro', () => {
    expect(P.quality).toEqual(INTRO_LOOK.quality);
  });
});
