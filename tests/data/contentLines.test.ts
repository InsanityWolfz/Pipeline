import { describe, expect, it } from 'vitest';
import { AFFIXES, affixLine, type AffixKind } from '../../src/data/gear';
import { KEYWORDS, withoutFireVerb } from '../../src/data/keywords';
import { contentLines } from '../../src/data/keywordGraph';
import { isRuleLine, RULES } from '../../src/data/lines';
import { RELICS } from '../../src/data/relics';
import { lineText, linesText, REF, SLOT, stageText } from '../../src/data/rulesText';
import { roundKeywords } from '../../src/data/roundKeywords';
import { STAGES } from '../../src/data/stages';
import { STATS } from '../../src/data/statDefs';
import { TALENT_LIST, TALENTS } from '../../src/data/talents';
import { AMMO } from '../../src/data/ammo';

// Content scope and grammar (039): every talent, relic, stage and affix carries structured
// lines, each naming exactly one scope, rendered `Scope: change label` or `Scope: rule
// text`; the spec's table is the expected text, and no field holds a hand-typed digit or
// keyword name. Combos always go through a keyword a line or round creates.

const EXPECTED: Readonly<Record<string, string>> = {
  a1: 'Arrow: +10% damage',
  a2: 'Arrow: +10% fire rate',
  a3: 'Chill: −1 stack to Freeze · Freeze: +0.5 s duration',
  b1: 'Bomb: +10% damage',
  b2: 'Burst: +15% radius',
  b3: 'Lob: −25% flight time',
  // 060: Fire's two payoffs.
  b4: 'Fire: +50% duration',
  b5: 'Fire: +1 tile spread radius',
  l4: 'Lightning: +1 chain',
  l5: 'Lightning: +1 tile chain range',
  l1: 'Ley: +10% damage',
  l2: 'Homing: +30% turn rate',
  l3: 'Split: +2 Shards',
  t1: 'All ammo: +8% fire rate',
  t2: 'You: +10% walk speed while firing',
  t3: 'All ammo: +6% damage',
  s1: 'You: +15 max health',
  s2: 'You: +0.5 HP/s field regen',
  s3: 'You: +3 armor',
  s4: 'You: +5% move speed',
  k1: 'Bomb: each Burst leaves a Pool for 0.3 s · Arrow: through a Pool, its next hit deals ×1.5 damage and Bursts',
  k2: 'Ley: a hit on a Frozen enemy ends the Freeze, deals ×2 damage and sends 4 Shards for ×0.5 its damage',
  k3: 'All ammo: held fire ramps up to ×1.25 fire rate over 2.0 s',
  'rollbreaker-greaves': 'You: rolling through an enemy Stuns it for 0.7 s, once per roll',
  'wardstone-circlet': 'You: after 6.0 s unhit, the next hit is blocked',
  featherplate: 'You: no move speed slow from heavy armor · You: ×0.75 roll distance',
  'last-ember': 'You: once a trip, a killing hit leaves you on 1 HP, invulnerable for 1.0 s',
  'frost-rune': 'Cold: added to any round · 1 rimestone per 4',
  'ley-guide': 'Homing: added to Ley rounds · 1 ley crystal per 4',
  'prism-lens': 'Split: added to Ley rounds · 2 ley crystal per 4',
  'cluster-die': 'Cluster: added to Bomb rounds · 1 ley-iron per 4',
  'fire-rune': 'Fire: added to any round · 1 cinderite per 4',
  'lightning-rune': 'Lightning: added to any round · 1 stormglass per 4',
};

describe('the expected text (039’s table, line for line)', () => {
  it('every talent but the start', () => {
    for (const t of TALENT_LIST.filter((x) => x.kind !== 'start')) expect(linesText(t.lines), t.id).toBe(EXPECTED[t.id]);
    expect(TALENTS.start?.lines).toEqual([]);
  });

  it('every relic', () => {
    for (const r of RELICS) expect(linesText(r.lines), r.id).toBe(EXPECTED[r.id]);
  });

  it('every stage, with its cost', () => {
    for (const s of Object.values(STAGES)) expect(stageText(s), s.id).toBe(EXPECTED[s.id]);
  });

  it('every affix, always scope You', () => {
    const at = (kind: AffixKind, value: number) => lineText(affixLine({ kind, value }));
    expect(at('max-health', 12)).toBe('You: +12 max health');
    expect(at('armor', 2)).toBe('You: +2 armor');
    expect(at('regen', 0.5)).toBe('You: +0.5 HP/s field regen');
    expect(at('move-speed', 0.04)).toBe('You: +4% move speed');
    expect(at('roll-cooldown', -0.15)).toBe('You: −15% roll cooldown');
    expect(at('roll-distance', 0.12)).toBe('You: +12% roll distance');
  });
});

describe('content lines', () => {
  const all = contentLines();

  it('every line names exactly one scope: a keyword, all-ammo or you', () => {
    for (const o of all) {
      const s = o.line.scope;
      expect(s === 'all-ammo' || s === 'you' || s in KEYWORDS, `${o.owner}: ${s}`).toBe(true);
      if (s in KEYWORDS) expect(KEYWORDS[s as keyof typeof KEYWORDS].state, `${o.owner}: ${s}`).toBe('live');
    }
  });

  it('affixes are scope You and stay defensive; × lines are only on relics and keystones', () => {
    for (const o of all.filter((x) => x.kind === 'affix')) expect(o.line.scope, o.owner).toBe('you');
    for (const o of all) if (!isRuleLine(o.line) && o.line.op === 'mul') expect(['relic', 'keystone'], o.owner).toContain(o.kind);
    for (const k of Object.keys(AFFIXES) as AffixKind[]) expect(['max-health', 'armor', 'field-regen', 'move-speed', 'roll-cooldown', 'roll-distance']).toContain(AFFIXES[k].stat);
  });

  it('every combo goes through a keyword: a rule that consumes names its trigger, and something creates it', () => {
    const created = new Set<string>([
      ...Object.keys(AMMO).flatMap((id) => roundKeywords(id)),
      ...Object.values(KEYWORDS).flatMap((k) => k.creates ?? []),
      ...all.flatMap((o) => (isRuleLine(o.line) && o.line.creates ? [o.line.creates] : [])),
    ]);
    const consumers = all.filter((o) => isRuleLine(o.line) && RULES[o.line.rule].consumes);
    expect(consumers.map((o) => o.owner)).toEqual(['k1', 'k1', 'k2']);
    for (const o of all) {
      if (!isRuleLine(o.line)) continue;
      if (RULES[o.line.rule].consumes) expect(o.line.trigger, `${o.owner}: ${o.line.rule}`).toBeDefined();
      if (o.line.trigger) expect(created.has(o.line.trigger), `${o.owner}: nothing creates ${o.line.trigger}`).toBe(true);
    }
  });

  it('Blastfletch: a Bomb Burst creates a Pool and Arrows consume it; Shatterpoint: Ley consumes Freeze', () => {
    const k1 = TALENTS.k1?.lines ?? [];
    expect(k1.map((l) => (isRuleLine(l) ? [l.scope, l.trigger, l.creates] : null))).toEqual([
      ['bomb', 'burst', 'pool'],
      ['arrow', 'pool', 'burst'],
    ]);
    const k2 = TALENTS.k2?.lines[0];
    expect(k2 && isRuleLine(k2) ? [k2.scope, k2.trigger] : null).toEqual(['ley', 'freeze']);
  });

  it('every rule param a line passes has a unit, and every slot its text reads is passed', () => {
    for (const o of all) {
      if (!isRuleLine(o.line)) continue;
      const rule = RULES[o.line.rule];
      for (const p of Object.keys(o.line.params)) expect(rule.params[p], `${o.owner}: ${p}`).toBeDefined();
      for (const p of Object.keys(rule.params)) expect(o.line.params[p], `${o.owner}: ${p}`).toBeDefined();
    }
  });
});

describe('generated text only', () => {
  it('no template, rule text or stat label holds a digit', () => {
    for (const k of Object.values(KEYWORDS)) expect(k.template, k.id).not.toMatch(/\d/);
    for (const [id, r] of Object.entries(RULES)) expect(r.template, id).not.toMatch(/\d/);
    for (const s of Object.values(STATS)) expect(s.label, s.id).not.toMatch(/\d/);
  });

  it('no template, rule text or stat label types a keyword or noun name by hand', () => {
    // Reserved keywords never show in game. 060: "fire" stays the verb in "fire rate" and "held fire" (FIRE_VERB_PHRASES).
    const names = [...Object.values(KEYWORDS).filter((k) => k.state === 'live').map((k) => k.name), 'Shard', 'Bomblet', 'Frozen'];
    const bare = [...Object.values(KEYWORDS).map((k) => k.template), ...Object.values(RULES).map((r) => r.template), ...Object.values(STATS).map((s) => s.label)].map((t) => withoutFireVerb(t.replace(REF, '').replace(SLOT, '')));
    for (const text of bare) for (const n of names) expect(new RegExp(`\\b${n}`, 'i').test(text), `"${text}" types "${n}"`).toBe(false);
  });

  it('content carries lines, not text: no talent text, relic text, stage description or affix label', () => {
    for (const t of TALENT_LIST) for (const f of ['text', 'effect']) expect(Object.keys(t)).not.toContain(f);
    for (const r of RELICS) expect(Object.keys(r)).not.toContain('text');
    for (const s of Object.values(STAGES)) expect(Object.keys(s)).not.toContain('description');
    for (const a of Object.values(AFFIXES)) for (const f of ['label', 'sign', 'shownScale']) expect(Object.keys(a)).not.toContain(f);
  });
});
