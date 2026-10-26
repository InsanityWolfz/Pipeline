import { describe, expect, it } from 'vitest';
import { TALENT_START } from '../../src/data/talents';
import { describeRound } from '../../src/render/describe';
import { bonusSources } from '../../src/render/statSteps';
import { texts } from '../../src/render/tipTypes';
import { roundEmission } from '../../src/sim/emissions';
import { createSim, type SimState } from '../../src/sim/state';
import { resolveStat } from '../../src/sim/statResolve';

// 062: a tiered round's hover shows its tier in its name, its summary and its Shift breakdown (040), the ×1.6 as its
// own step. The tier is the round's own, not a bonus: it never counts toward "N bonuses".

function player(...talents: string[]): SimState {
  const s = createSim(1);
  s.talents = [TALENT_START, ...talents];
  s.crafted = ['arrow', 'arrow+steel', 'arrow+steel+frost', 'ley-bolt+glass+split'];
  return s;
}

describe('a tiered round described (062)', () => {
  it('a Steel Frost arrow: its name, its summary’s tier, and the ×1.6 as its own damage step', () => {
    const d = describeRound(player(), 'arrow+steel+frost');
    expect(d.name).toBe('Steel Frost arrow');
    expect(texts(d.summary)).toEqual(['22.4 dmg · 4.0/s · Steel ×1.6 dmg · Freeze in 4 hits']);
    expect(d.bonuses).toBe(0);
    expect(texts(d.breakdown)[0]).toBe('Damage 14 × 1.6 Steel = 22.4');
    expect(d.chips.map((c) => c.label)).toEqual(['Arrow', 'Shot', 'Pierce', 'Knockback', 'Cold']);
  });

  it('with Fletcher’s Eye: the bonus pool, then the tier’s ×; one bonus, not two', () => {
    const d = describeRound(player('a1'), 'arrow+steel');
    expect(texts(d.breakdown)[0]).toBe("Damage 14 × (1 + 10% Fletcher's Eye) × 1.6 Steel = 24.6");
    expect(texts(d.summary)).toEqual(['24.6 dmg · 4.0/s · Steel ×1.6 dmg', '1 bonus · hold Shift']);
  });

  it('a Glass Split ley bolt’s Shards take the ×1.6 too', () => {
    const d = describeRound(player(), 'ley-bolt+glass+split');
    expect(texts(d.summary)[0]).toBe('14.4 dmg · 3.0/s · Glass ×1.6 dmg · 5 Shards × 7.2');
  });

  it('a stone round says no tier', () => {
    expect(texts(describeRound(player(), 'arrow').summary)).toEqual(['14 dmg · 4.0/s']);
  });

  it('bonusSources leaves the tier out', () => {
    const r = resolveStat(player(), 'damage', roundEmission('arrow+steel'), 14);
    expect(r.muls).toEqual([{ source: 'Steel', value: 1.6 }]);
    expect(bonusSources(r)).toEqual([]);
  });
});

describe('a tiered round’s summary when it runs long (062)', () => {
  it('drops the tier note, then a burn’s time, in its short form', () => {
    const d = describeRound(player(), 'bomb+steel+fire+cluster');
    expect(d.summary[0]?.text).toBe('19.2 Burst dmg · 1.5/s · Steel ×1.6 dmg · burns 4.8/s for 3.0 s · 4 Bomblets × 12.8');
    expect(d.summary[0]?.short).toBe('19.2 Burst · 1.5/s · burns 4.8/s · 4 Bomblets × 12.8');
    expect(describeRound(player(), 'bomb+fire+cluster').summary[0]?.short).toBe('12 Burst · 1.5/s · burns 3/s for 3.0 s · 4 Bomblets × 8');
  });
});
