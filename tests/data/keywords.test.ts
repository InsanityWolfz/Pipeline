import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { DERIVED_TAGS, KEYWORD_DEBT, KEYWORD_LIST, KEYWORDS, NOUNS, type KeywordId } from '../../src/data/keywords';
import { keywordPayoffs, keywordSources } from '../../src/data/keywordGraph';
import { REF, SLOT, textSources as paramSources, keywordText, refName } from '../../src/data/rulesText';
import { bombletKeywords, poolBurstKeywords, roundKeywords, shardKeywords } from '../../src/data/roundKeywords';
import { ROUNDS, SPLIT } from '../../src/data/tags';
import { keywordReport } from '../../src/data/keywordReport';
import { STATS } from '../../src/data/statDefs';

// The keyword list (039): closed, in data, each with a group, a state, a digit-free
// template whose slots and references resolve, params read from data, and the new-keyword
// rule (a source and two payoffs) over every live keyword, with today's debt exactly listed.

const GROUPS = ['delivery', 'behaviour', 'damage-type', 'status', 'ground', 'family', 'trait'];

describe('the keyword list', () => {
  it('is the spec’s closed list, each with a kebab-case id, a Title Case name, a group and a state', () => {
    expect(KEYWORD_LIST.map((k) => k.name)).toEqual([
      'Shot', 'Lob', 'Mine', 'Pierce', 'Homing', 'Split', 'Burst', 'Cluster', 'Knockback', 'Physical', 'Cold', 'Fire', 'Lightning', 'Poison',
      'Chill', 'Freeze', 'Stun', 'Pool', 'Arrow', 'Bomb', 'Ley', 'Landmine', 'Shield', 'Boss', 'Burrowed',
    ]);
    for (const k of KEYWORD_LIST) {
      expect(k.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(k.name).toMatch(/^[A-Z][a-z]+$/);
      expect(GROUPS).toContain(k.group);
      expect(KEYWORDS[k.id]).toBe(k);
    }
    // 060: Fire shipped; Lightning and Poison stay reserved.
    expect(KEYWORD_LIST.filter((k) => k.state === 'reserved').map((k) => k.id)).toEqual(['lightning', 'poison']);
  });

  it('groups as the spec lists them', () => {
    const of = (g: string) => KEYWORD_LIST.filter((k) => k.group === g).map((k) => k.id);
    expect(of('delivery')).toEqual(['shot', 'lob', 'mine']);
    expect(of('behaviour')).toEqual(['pierce', 'homing', 'split', 'burst', 'cluster', 'knockback']);
    expect(of('damage-type')).toEqual(['physical', 'cold', 'fire', 'lightning', 'poison']);
    expect(of('status')).toEqual(['chill', 'freeze', 'stun']);
    expect(of('ground')).toEqual(['pool']);
    expect(of('family')).toEqual(['arrow', 'bomb', 'ley', 'landmine']);
    expect(of('trait')).toEqual(['shield', 'boss', 'burrowed']);
  });

  it('every live template is digit-free, every slot reads a param from data and every reference resolves', () => {
    for (const k of KEYWORD_LIST.filter((x) => x.state === 'live')) {
      expect(k.template, k.id).not.toMatch(/\d/);
      expect(k.template.length, k.id).toBeGreaterThan(0);
      for (const [, id, form] of k.template.matchAll(REF)) expect(() => refName(id ?? '', form), `${k.id}: ${id}`).not.toThrow();
      const slots = [...k.template.replace(REF, '').matchAll(SLOT)].map((m) => m[1] ?? '');
      for (const s of slots) expect(Object.keys(k.params), `${k.id}: {${s}}`).toContain(s);
      for (const [name, p] of Object.entries(k.params)) {
        const values = 'value' in p ? [p.value] : Object.values(p.perSource);
        expect(values.length, `${k.id}.${name}`).toBeGreaterThan(0);
        for (const v of values) expect(Number.isFinite(v), `${k.id}.${name}`).toBe(true);
      }
      for (const s of paramSources(k.id)) expect(() => keywordText(k.id, s)).not.toThrow();
      for (const s of k.stats) expect(STATS[s], `${k.id} exposes ${s}`).toBeDefined();
    }
  });

  it('reads its numbers from data: a few rendered lines', () => {
    expect(keywordText('shot', 'arrow')).toBe('Flies straight at the cursor up to 320 px at 480 px/s. Stops at walls and Shield fronts.');
    expect(keywordText('shot', 'shard')).toBe('Flies straight at the cursor up to 96 px at 360 px/s. Stops at walls and Shield fronts.'); // 054: was 64 px
    expect(keywordText('homing')).toBe('At launch, locks onto the enemy nearest the cursor within 64 px of it and turns up to 240°/s toward it. Flies straight without a target.');
    expect(keywordText('chill')).toBe('Stacks up to 4. Each stack slows the enemy’s movement 15%. Lasts 2.0 s, refreshed by each Cold hit. At 4 it Freezes.');
    expect(keywordText('freeze')).toBe('Can’t move or act for 1.5 s (0.8 s for a Boss); a wind-up pauses. Still takes damage and Knockback. Then can’t gain Chill for 2.0 s.');
    expect(keywordText('stun', 'charger')).toBe('Can’t move or act for 1.0 s, and a wind-up is cancelled. A Boss or Burrowed enemy can’t be Stunned.');
    expect(keywordText('knockback')).toBe('Each hit pushes the enemy 6 px times its weight. A Boss weighs 0.');
    expect(keywordText('cluster')).toBe('0.2 s after its Burst, 4 Bomblets land 40 px out, each a Burst of 8 in 20 px.');
    expect(keywordText('split')).toBe('On hit: 5 Shards fly out, each dealing half damage to another enemy. A Shard is a small Shot that never Pierces or Splits.');
    expect(keywordText('cold')).toBe('Each hit adds 1 Chill.');
    // 060: Fire's burn and spread, from FIRE.
    expect(keywordText('fire')).toBe(
      'Each hit sets the enemy burning for 3.0 s, dealing 25% of that hit’s damage each second. A new hit restarts the burn at the stronger of the two; burns never stack. An enemy that dies burning passes its burn to every enemy within 64 px.',
    );
  });

  it("ties the Split's \"half damage\" wording to SPLIT.damageShare (054.1): change one, change the other", () => {
    expect(keywordText('split')).toContain('half damage');
    expect(SPLIT.damageShare).toBe(0.5);
  });

  it('has the child nouns Shard and Bomblet, which are no keyword', () => {
    expect(NOUNS).toEqual({ shard: 'Shard', bomblet: 'Bomblet' });
    for (const id of Object.keys(NOUNS)) expect(KEYWORDS[id as KeywordId]).toBeUndefined();
  });
});

describe('round keywords (derived from data)', () => {
  it('arrow, bomb+frost+cluster and landmine+frost derive as the spec lists', () => {
    const names = (ids: readonly KeywordId[]) => ids.map((id) => KEYWORDS[id].name);
    expect(names(roundKeywords('arrow'))).toEqual(['Arrow', 'Shot', 'Pierce', 'Knockback', 'Physical']);
    expect(names(roundKeywords('bomb+frost+cluster'))).toEqual(['Bomb', 'Lob', 'Burst', 'Cluster', 'Cold']);
    expect(names(roundKeywords('landmine+frost'))).toEqual(['Landmine', 'Mine', 'Burst', 'Cold']);
    expect(names(roundKeywords('bomb+cluster'))).toEqual(['Bomb', 'Lob', 'Burst', 'Cluster', 'Physical']);
    expect(names(roundKeywords('arrow+frost'))).toEqual(['Arrow', 'Shot', 'Pierce', 'Knockback', 'Cold']);
    expect(names(roundKeywords('landmine'))).toEqual(['Landmine', 'Mine', 'Burst', 'Physical']);
    expect(names(roundKeywords('ley-bolt+homing'))).toEqual(['Ley', 'Shot', 'Knockback', 'Homing', 'Physical']);
  });

  it('the seventeen tagged rounds exist and nothing else (060: seven Fire rounds)', () => {
    expect([...ROUNDS].sort()).toEqual(
      [
        'arrow+frost',
        'bomb+frost',
        'bomb+cluster',
        'bomb+frost+cluster',
        'ley-bolt+frost',
        'ley-bolt+homing',
        'ley-bolt+split',
        'ley-bolt+frost+homing',
        'ley-bolt+frost+split',
        'landmine+frost',
        'arrow+fire',
        'bomb+fire',
        'bomb+fire+cluster',
        'ley-bolt+fire',
        'ley-bolt+fire+homing',
        'ley-bolt+fire+split',
        'landmine+fire',
      ].sort(),
    );
    const names = (ids: readonly KeywordId[]) => ids.map((id) => KEYWORDS[id].name);
    expect(names(roundKeywords('bomb+fire+cluster'))).toEqual(['Bomb', 'Lob', 'Burst', 'Cluster', 'Fire']);
    expect(shardKeywords('ley-bolt+fire+split', true)).toEqual(['ley', 'shot', 'knockback', 'split', 'fire']);
    expect(poolBurstKeywords('arrow+fire')).toEqual(['arrow', 'burst', 'fire']);
  });

  it('no round carries a reserved keyword', () => {
    for (const id of Object.keys(AMMO)) for (const k of roundKeywords(id)) expect(KEYWORDS[k].state, `${id}: ${k}`).toBe('live');
  });

  it('children carry their parent’s family and damage type, Shards its Knockback', () => {
    expect(shardKeywords('ley-bolt+frost+split', true)).toEqual(['ley', 'shot', 'knockback', 'split', 'cold']);
    expect(shardKeywords('ley-bolt+split', true)).toEqual(['ley', 'shot', 'knockback', 'split', 'physical']);
    expect(shardKeywords('ley-bolt', false)).toEqual(['ley', 'shot', 'knockback', 'physical']);
    expect(bombletKeywords('bomb+frost+cluster')).toEqual(['bomb', 'burst', 'cluster', 'cold']);
    expect(poolBurstKeywords('arrow+frost')).toEqual(['arrow', 'burst', 'cold']);
  });

  it('derived tags are data only: AOE has Burst, Projectile has Shot, Elemental lacks Physical', () => {
    expect(DERIVED_TAGS).toEqual({
      aoe: { name: 'AOE', has: ['burst'] },
      projectile: { name: 'Projectile', has: ['shot'] },
      elemental: { name: 'Elemental', lacks: ['physical'] },
    });
  });
});

describe('the new-keyword rule (039, Q17)', () => {
  const sources = keywordSources();
  const payoffs = keywordPayoffs();
  const meets = (id: KeywordId) => (sources.get(id) ?? []).length >= 1 && (payoffs.get(id) ?? []).length >= 2;
  const ruled = KEYWORD_LIST.filter((k) => k.state === 'live' && k.group !== 'trait');

  // 060, slice 4 only: Fire is live before its two talents land in slice 5, so for this one commit it is expected to
  // fall short here. It is never in KEYWORD_DEBT.
  const PENDING: readonly KeywordId[] = ['fire'];

  it('every live keyword outside the debt list has a source and two payoffs', () => {
    for (const k of ruled) {
      if (k.id in KEYWORD_DEBT) continue;
      if (PENDING.includes(k.id)) {
        expect(meets(k.id), `${k.name} now meets the rule: take it off PENDING`).toBe(false);
        continue;
      }
      expect(meets(k.id), `${k.name}: sources ${JSON.stringify(sources.get(k.id))}, payoffs ${JSON.stringify(payoffs.get(k.id))}`).toBe(true);
    }
  });

  it('the debt is exactly the spec’s list, each still short (so the list only shrinks)', () => {
    expect(Object.keys(KEYWORD_DEBT).sort()).toEqual(['shot', 'lob', 'mine', 'pierce', 'homing', 'split', 'cluster', 'knockback', 'physical', 'cold', 'chill', 'stun', 'pool', 'landmine'].sort());
    for (const id of Object.keys(KEYWORD_DEBT) as KeywordId[]) expect(meets(id), `${id} now meets the rule: take it off KEYWORD_DEBT`).toBe(false);
    expect(ruled.filter((k) => !(k.id in KEYWORD_DEBT)).map((k) => k.name)).toEqual(['Burst', 'Fire', 'Freeze', 'Arrow', 'Bomb', 'Ley']);
    expect(KEYWORD_DEBT.fire).toBeUndefined();
  });

  it('every live keyword has at least one source', () => {
    for (const k of ruled) expect(sources.get(k.id)?.length ?? 0, k.name).toBeGreaterThan(0);
  });
});

describe('the keyword report (039: __GAME__.keywords())', () => {
  it('renders every keyword and every content line', () => {
    const r = keywordReport();
    expect(r.keywords.map((k) => k.id)).toEqual(KEYWORD_LIST.map((k) => k.id));
    expect(r.keywords.find((k) => k.id === 'burst')?.sources.landmine).toBe('Deals 60 to every enemy within 24 px. Ignores Shield. No Knockback.');
    expect(r.lines).toContainEqual({ owner: 'b2', kind: 'talent', text: 'Burst: +15% radius' });
    expect(r.lines).toContainEqual({ owner: 'frost-rune', kind: 'stage', text: 'Cold: added to any round' });
  });
});
