import { describe, expect, it } from 'vitest';
import { lobAmmo } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import { WARDSTONE } from '../../src/data/relics';
import { TALENT_START } from '../../src/data/talents';
import { describeGear, describePiece, describeRound, describeStage, describeTalent, enemyChips } from '../../src/render/describe';
import { texts } from '../../src/render/tipTypes';
import { bombletEmission, roundEmission } from '../../src/sim/emissions';
import { createEnemy } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { resolveStat } from '../../src/sim/statResolve';
import { piece, wear } from '../fixtures/gear';

// The describe module (040): what each kind of thing says, from 039's data and the live
// state. Summaries show the player's numbers after every bonus and never px; breakdowns show
// every step, and their numbers are resolveStat's.

/** A player who knows every round (crafted), with these talents. */
function player(...talents: string[]): SimState {
  const s = createSim(1);
  s.talents = [TALENT_START, ...talents];
  s.crafted = ['arrow', 'arrow+frost', 'bomb', 'bomb+frost', 'bomb+cluster', 'ley-bolt', 'ley-bolt+split', 'landmine'];
  return s;
}

describe('a round', () => {
  it('an arrow with Fletcher’s Eye and Hard Bore: its chips, summary and damage steps', () => {
    const d = describeRound(player('a1', 't1', 't2', 't3'), 'arrow');
    expect(d.name).toBe('Arrow');
    expect(d.chips.map((c) => c.label)).toEqual(['Arrow', 'Shot', 'Pierce', 'Knockback', 'Physical']);
    expect(texts(d.summary)[0]).toBe('11.6 dmg · 4.3/s');
    expect(d.summary[1]).toEqual({ text: '3 bonuses · hold Shift', tone: 'hint' });
    expect(texts(d.breakdown)[0]).toBe("Damage 10 × (1 + 10% Fletcher's Eye + 6% Hard Bore) = 11.6");
  });

  it('one bonus reads "1 bonus"; a new player sees no hint (040.7)', () => {
    expect(texts(describeRound(player('a1'), 'arrow').summary)).toEqual(['11 dmg · 4.0/s', '1 bonus · hold Shift']);
    const fresh = describeRound(player(), 'arrow');
    expect(texts(fresh.summary)).toEqual(['10 dmg · 4.0/s']);
    expect(fresh.bonuses).toBe(0);
  });

  it('a Frost arrow with Fletcher’s Eye and Hard Bore: "11.6 dmg · 4.0/s · Freeze in 4 hits"', () => {
    const s = player('a1', 't3');
    expect(texts(describeRound(s, 'arrow+frost').summary)[0]).toBe('11.6 dmg · 4.0/s · Freeze in 4 hits');
    s.talents.push('a2', 'a3');
    expect(texts(describeRound(s, 'arrow+frost').summary)[0]).toBe('11.6 dmg · 4.4/s · Freeze in 3 hits');
  });

  it('fire rate steps, the interval, and Overpressure’s held ramp as its own step', () => {
    const d = describeRound(player('a1', 'a2', 't1', 't2', 't3', 'k3'), 'arrow');
    const lines = texts(d.breakdown);
    expect(lines[1]).toBe('Fire rate 4.0/s × (1 + 10% Quick Nock + 8% Oiled Breech) = 4.7/s · one every 0.21 s');
    expect(lines[2]).toBe('× up to 1.25 while held 2.0 s = 5.9/s');
    expect(d.breakdown[2]?.tone).toBe('when');
  });

  it('Blastfletch’s “when” line on an arrow; Shatterpoint’s on a ley bolt', () => {
    const arrow = texts(describeRound(player('a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'k1', 't3'), 'arrow').breakdown);
    expect(arrow).toContain('×1.5 through a Pool (Blastfletch) = 17.4');
    const bolt = texts(describeRound(player('a1', 'a2', 'a3', 'l1', 'l2', 'l3', 'k2'), 'ley-bolt').breakdown);
    expect(bolt).toContain('×2 on a Frozen enemy (Shatterpoint) = 30.8');
  });

  it('each keyword’s rule with its final numbers, px included, and Linked with taken ones lit', () => {
    const d = describeRound(player('b1', 'b2'), 'bomb+cluster');
    const lines = texts(d.breakdown);
    expect(lines).toContain('Radius 48 px × (1 + 15% Wide Casing) = 55.2 px');
    expect(lines).toContain('Burst: Deals 16.5 to every enemy within 55.2 px. Ignores Shield. No Knockback.');
    expect(lines).toContain('Cluster: 0.2 s after its Burst, 4 Bomblets land 40 px out, each a Burst of 8.8 in 23 px.');
    const linked = d.breakdown.find((l) => l.text.startsWith('Linked:'));
    expect(linked?.parts?.find((p) => p.text.startsWith('Wide Casing'))?.tone).toBe('lit');
    expect(linked?.parts?.find((p) => p.text.startsWith('Swift Arc'))?.tone).toBe('dim');
    expect(linked?.text).toContain('Cluster die');
  });

  it('a Frost bomb’s summary has the Cold chip and its Freeze hits; a Cluster bomb’s its Bomblets; a landmine’s its arm time', () => {
    const frost = describeRound(player(), 'bomb+frost');
    expect(frost.chips.map((c) => c.id)).toEqual(['bomb', 'lob', 'burst', 'cold']);
    expect(texts(frost.summary)[0]).toBe('15 Burst dmg · 1.5/s · Freeze in 4 hits');
    expect(texts(describeRound(player(), 'bomb+cluster').summary)[0]).toBe('15 Burst dmg · 1.5/s · 4 Bomblets × 8');
    expect(texts(describeRound(player(), 'landmine').summary)[0]).toBe('60 Burst dmg · 1.5/s · arms in 5.0 s');
    expect(texts(describeRound(player('l3'), 'ley-bolt+split').summary)[0]).toBe('14 dmg · 3.0/s · 7 Shards × 4');
  });
});

describe('content', () => {
  it('Wide Casing’s breakdown lists the four Burst radii before → after; its summary reaches the known Burst rounds', () => {
    const d = describeTalent(player(), 'b2');
    expect(texts(d.breakdown)[0]).toBe('Burst radius: Bomb 48 → 55.2 px · Bomblet 20 → 23 px · Landmine 24 → 27.6 px · Pool-burst 24 → 27.6 px');
    // Its own change is the one bonus the breakdown spells out.
    expect(texts(d.summary)).toEqual(['Burst: +15% radius', 'Reaches: Bomb, Frost bomb, Cluster bomb, Landmine', '1 bonus · hold Shift']);
    expect(texts(d.breakdown)).toContain('Lane: Bombs · 1 point');
    expect(d.chips.map((c) => c.id)).toEqual(['burst']);
  });

  it('a line reaching nothing the player knows says so; a You talent has no Reaches line', () => {
    const s = player();
    s.crafted = ['arrow'];
    expect(texts(describeTalent(s, 'b1').summary)).toContain('Reaches: nothing you have yet');
    expect(texts(describeTalent(s, 's1').summary)).toEqual(['You: +15 max health', '1 bonus · hold Shift']);
    expect(texts(describeTalent(s, 's1').breakdown)[0]).toBe('Max health: 100 → 115');
  });

  it('a keystone’s chips are its scopes, then the keywords its rules make and spend', () => {
    expect(describeTalent(player(), 'k1').chips.map((c) => c.label)).toEqual(['Bomb', 'Arrow', 'Pool', 'Burst']);
    expect(describeTalent(player(), 't1').chips.map((c) => c.id)).toEqual(['all-ammo']);
  });

  it('a relic’s summary has its generated rule line; a gear piece’s breakdown totals match playerStats after wearing it', () => {
    const s = player();
    const helm = piece(7, 'helm', { rarity: 'relic', relic: WARDSTONE.id, name: WARDSTONE.name, baseArmor: 2, affixes: [{ kind: 'max-health', value: 12 }, { kind: 'move-speed', value: 0.04 }] });
    s.gear.push(helm);
    const d = describeGear(s, 7);
    expect(texts(d?.summary ?? [])).toEqual(['Relic helm · armor 2', 'You: +12 max health · +4% move speed', 'You: after 6.0 s unhit, the next hit is blocked', '1 bonus · hold Shift']);
    const before = playerStats(s);
    const after = playerStats(wear(structuredClone(s), helm));
    expect(texts(d?.breakdown ?? []).at(-1)).toBe(`Wearing it: armor ${before.armor} → ${after.armor} · max health ${before.maxHealth} → ${after.maxHealth} · move speed 100% → 104%`);
    expect(texts(d?.breakdown ?? [])).toContain('You: after 6.0 s unhit, the next hit is blocked');
    expect(d?.chips.map((c) => c.id)).toEqual(['you']);
  });

  it('a stage: its generated line and the rounds it takes; its rule, cost and every round it gives', () => {
    const d = describeStage(player(), 'frost-rune');
    expect(texts(d.summary)).toEqual(['Cold: added to any round', 'Takes: Arrow, Bomb, Cluster bomb, Ley bolt, Split ley bolt, Landmine']);
    const lines = texts(d.breakdown);
    expect(lines[0]).toBe('Cold: Each hit adds 1 Chill.');
    expect(lines).toContain('Cost: 1 rimestone per 4');
    expect(lines.at(-1)).toContain('Arrow → Frost arrow · Bomb → Frost bomb');
    expect(texts(describeStage(player('a3'), 'frost-rune').summary)).toContain('1 bonus · hold Shift');
  });

  it('a build-bar piece that isn’t a stage shows its description', () => {
    expect(texts(describePiece('sorter').summary)).toEqual(['Sends one chosen item out its side. E sets it, F flips the side.']);
  });
});

describe('summaries and breakdowns', () => {
  const all = (s: SimState) => [
    ...s.crafted.map((r) => describeRound(s, r)),
    ...['a1', 'a3', 'b2', 'b3', 'k1', 'k2', 'k3', 's1', 't2'].map((t) => describeTalent(s, t)),
    ...['frost-rune', 'ley-guide', 'prism-lens', 'cluster-die'].map((st) => describeStage(s, st)),
  ];

  it('no summary line holds px; a breakdown can', () => {
    const s = player('a1', 'b2', 'l2', 'k1');
    for (const d of all(s)) for (const l of texts(d.summary)) expect(l, d.name).not.toMatch(/\bpx\b/);
    expect(all(s).some((d) => texts(d.breakdown).some((l) => /\bpx\b/.test(l)))).toBe(true);
  });

  it('every breakdown number matches resolveStat', () => {
    const s = player('b1', 'b2', 't3');
    const bomb = lobAmmo('bomb');
    const damage = resolveStat(s, 'damage', roundEmission('bomb+cluster'), bomb.burstDamage).final;
    const rate = resolveStat(s, 'fire-rate', roundEmission('bomb+cluster'), TICK_RATE / bomb.fireTicks).final;
    const bomblet = resolveStat(s, 'damage', bombletEmission('bomb+cluster'), 8).final;
    const lines = texts(describeRound(s, 'bomb+cluster').breakdown);
    expect(lines[0]).toBe(`Damage 15 × (1 + 10% Black Powder + 6% Hard Bore) = ${Number(damage.toFixed(1))}`);
    expect(lines[1]).toBe(`Fire rate ${rate.toFixed(1)}/s · one every ${(1 / rate).toFixed(2)} s`);
    expect(lines.some((l) => l.includes(`a Burst of ${Number(bomblet.toFixed(1))} in`))).toBe(true);
  });

  it('every tablet stays within a summary’s three lines (two rules lines and the hint) but a relic’s', () => {
    for (const d of all(player('a1', 'b2', 'k1', 't3'))) expect(d.summary.length, d.name).toBeLessThanOrEqual(3);
  });
});

describe('enemy chips (040.4)', () => {
  it('traits, then live statuses', () => {
    const husk = createEnemy(0, 'husk', { x: 0, y: 0 }, 'field');
    expect(enemyChips(husk)).toEqual([]);
    husk.chill = 2;
    husk.stunned = 10;
    expect(enemyChips(husk).map((c) => c.label)).toEqual(['Chill 2', 'Stun']);
    const bulwark = createEnemy(1, 'bulwark', { x: 0, y: 0 }, 'field');
    bulwark.frozen = 30;
    expect(enemyChips(bulwark).map((c) => c.label)).toEqual(['Boss', 'Shield', 'Freeze']);
  });
});
