import { describe, expect, it } from 'vitest';
import { TALENT_START } from '../../src/data/talents';
import { buildTabGroups } from '../../src/render/buildTabLayout';
import { describeRound } from '../../src/render/describe';
import { bonusSources } from '../../src/render/statSteps';
import { texts } from '../../src/render/tipTypes';
import { roundEmission } from '../../src/sim/emissions';
import { createSim, type SimState } from '../../src/sim/state';
import { resolveStat } from '../../src/sim/statResolve';

// 066: a storm round's hover names its tier, its summary notes it, and its Shift breakdown (040) shows the ×2.56 as one
// step ("× 2.56 Stormsteel"), never as a bonus. In the Build tab it shares its stone round's row, as 062's tiers do.

function player(...talents: string[]): SimState {
  const s = createSim(1);
  s.talents = [TALENT_START, ...talents];
  s.crafted = ['arrow', 'arrow+stormsteel', 'arrow+stormsteel+frost', 'ley-bolt+storm-glass+split'];
  return s;
}

describe('a storm round described (066)', () => {
  it('a Stormsteel Frost arrow: its name, its summary’s tier and the ×2.56 as one damage step', () => {
    const d = describeRound(player(), 'arrow+stormsteel+frost');
    expect(d.name).toBe('Stormsteel Frost arrow');
    expect(texts(d.summary)).toEqual(['35.8 dmg · 4.0/s · Stormsteel ×2.56 dmg · Freeze in 4 hits']);
    expect(d.bonuses).toBe(0);
    expect(texts(d.breakdown)[0]).toBe('Damage 14 × 2.56 Stormsteel = 35.8');
  });

  it('with Fletcher’s Eye: the bonus pool, then the tier’s one ×', () => {
    const d = describeRound(player('a1'), 'arrow+stormsteel');
    expect(texts(d.breakdown)[0]).toBe("Damage 14 × (1 + 10% Fletcher's Eye) × 2.56 Stormsteel = 39.4");
    expect(d.bonuses).toBe(1);
  });

  it('a Storm glass Split ley bolt’s Shards take the ×2.56 too', () => {
    const bolt = texts(describeRound(player(), 'ley-bolt+storm-glass+split').breakdown);
    expect(bolt[0]).toBe('Damage 9 × 2.56 Storm glass = 23');
    expect(bolt[2]).toBe('Shard damage 4.5 × 2.56 Storm glass = 11.5');
  });

  it('a Stormsteel Fire Cluster bomb’s long summary drops its tier note first, as 062’s does', () => {
    const d = describeRound(player(), 'bomb+stormsteel+fire+cluster');
    expect(d.summary[0]?.text).toBe('30.7 Burst dmg · 1.5/s · Stormsteel ×2.56 dmg · burns 7.7/s for 3.0 s · 4 Bomblets × 20.5');
    expect(d.summary[0]?.short).toBe('30.7 Burst dmg · 1.5/s · burns 7.7/s for 3.0 s · 4 Bomblets × 20.5');
    expect(d.summary[0]?.shorter).toBe('30.7 Burst · 1.5/s · burns 7.7/s · 4 Bomblets × 20.5');
  });

  it('bonusSources leaves the tier out', () => {
    const r = resolveStat(player(), 'damage', roundEmission('bomb+stormsteel'), 12);
    expect(r.muls).toEqual([{ source: 'Stormsteel', value: 2.56 }]);
    expect(bonusSources(r)).toEqual([]);
  });
});

describe('storm rounds in the Build tab (066)', () => {
  it('fold into their stone round’s row beside steel, marked with each known tier', () => {
    const s = createSim(1);
    s.crafted = ['arrow', 'arrow+steel', 'arrow+stormsteel', 'ley-bolt+storm-glass+homing'];
    const named = (r: string) => r;
    const rows = buildTabGroups(s, named, named).flatMap((g) => g.rows);
    expect(rows.map((r) => [r.round, r.name])).toEqual([
      ['arrow', 'arrow · Steel, Stormsteel'],
      ['ley-bolt+storm-glass+homing', 'ley-bolt+storm-glass+homing'],
    ]);
  });
});
