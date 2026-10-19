import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { COLD } from '../../src/data/tags';
import { BLASTFLETCH, OVERPRESSURE, SHATTERPOINT, TALENT_START } from '../../src/data/talents';
import { freezeAt, hitsToFreeze } from '../../src/sim/cold';
import { conditionalHits, rampedFireRate } from '../../src/sim/keystones';
import { createSim } from '../../src/sim/state';

// The sim's numbers 040's tablets show, never worked out a second time in render: the hits
// to a Freeze, the keystones' conditional hits, and a fire rate at the ramp's full height.

const taking = (...ids: string[]) => {
  const s = createSim(1);
  s.talents = [TALENT_START, ...ids];
  return s;
};

describe('numbers for the legibility UI', () => {
  it('hits to a Freeze: the stacks that Freeze, a Chill a hit (Rimecraft one fewer)', () => {
    expect(freezeAt(taking())).toBe(COLD.stacksToFreeze);
    expect(hitsToFreeze(taking())).toBe(COLD.stacksToFreeze / COLD.chillPerHit);
    expect(hitsToFreeze(taking('a1', 'a2', 'a3'))).toBe(COLD.stacksToFreeze - 1);
  });

  it('the keystones’ conditional hits on a round, as keystoneHit scales them', () => {
    expect(conditionalHits(taking(), 'arrow', 10)).toEqual([]);
    expect(conditionalHits(taking('k1'), 'arrow', 10)).toEqual([{ rule: 'pool-strike', source: 'Blastfletch', scale: BLASTFLETCH.damageScale, damage: 15 }]);
    expect(conditionalHits(taking('k1'), 'bomb', 15)).toEqual([]);
    expect(conditionalHits(taking('k2'), 'ley-bolt', 14)).toEqual([{ rule: 'shatter', source: 'Shatterpoint', scale: SHATTERPOINT.damageScale, damage: 28 }]);
  });

  it('a fire rate at the ramp’s full height: × after the +% pool', () => {
    expect(rampedFireRate(taking(), 'arrow')).toBeNull();
    const r = rampedFireRate(taking('a1', 'a2', 't1', 't2', 't3', 'k3'), 'arrow');
    expect(r?.ramp).toBe(OVERPRESSURE.rampTicks);
    expect(r?.mul).toBe(OVERPRESSURE.rate);
    expect(r?.rate).toBeCloseTo((TICK_RATE / 15) * 1.18 * OVERPRESSURE.rate, 9);
  });
});
