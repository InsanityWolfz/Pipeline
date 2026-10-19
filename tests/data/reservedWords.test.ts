import { describe, expect, it } from 'vitest';
import { CHAMPIONS } from '../../src/data/champions';
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS } from '../../src/data/items';
import { KEYWORD_LIST, KEYWORDS } from '../../src/data/keywords';
import { contentLines } from '../../src/data/keywordGraph';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { RULES } from '../../src/data/lines';
import { NODES } from '../../src/data/nodes';
import { PIECES } from '../../src/data/pieces';
import { RELICS } from '../../src/data/relics';
import { REF, SLOT, lineText } from '../../src/data/rulesText';
import { roundKeywords } from '../../src/data/roundKeywords';
import { STAGES } from '../../src/data/stages';
import { STATS } from '../../src/data/statDefs';
import { AMMO } from '../../src/data/ammo';
import { TAGS } from '../../src/data/tags';
import { TALENT_LIST } from '../../src/data/talents';

// One word, one rule (039): the reserved words are the keyword names plus Shard and
// Bomblet. No content name or generated rules line uses one for anything else. Each word
// has its own list of names that may hold it: the spec's world names (039.7: Splitter,
// Shardback and its champion names, the Frozen Grotto, Ley Springs), and names where the
// word means itself (a round named for its own keywords, the stage that adds one).

/** Each reserved word as it's matched: from a word's start, any case, with its plurals and forms. */
const WORDS: Readonly<Record<string, RegExp>> = {
  ...Object.fromEntries(KEYWORD_LIST.map((k) => [k.name, new RegExp(`\\b${k.name}(s|es|ed|ned|ing)?\\b`, 'i')])),
  // A prefix match: Shardback and its champion names hold it, and they're listed.
  Shard: /\bshard/i,
  Bomblet: /\bbomblet/i,
  // Freeze's form, and Split's piece and Cold's sniper champion, all world names.
  Freeze: /\b(freez|frozen)/i,
  Split: /\bsplit/i,
  Cold: /\bcold/i,
  Burrowed: /\bburrow/i,
};

/** Names allowed to hold each word, beside a round named for its own keywords. */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  // 039.7's world names.
  Split: ['Splitter', 'Schematic: Splitter'],
  Shard: ['Shardback', ...(CHAMPIONS.names.shardback ?? [])],
  Freeze: ['Frozen Grotto'],
  // The ley itself: the world's magic, its materials, nodes and places, never the Ley family's rule. Allowed as
  // content names (039.17, proposed: keep them), as 039.7 allows world names such as the Ley Springs.
  Ley: ['Ley crystal', 'Ley-iron', 'Ley dust', 'Ley vein', 'Ley-iron seam', 'Ley conduit', 'Ley guide', 'Ley Grotto', 'Ley-iron Cut', ...LANDMARK_LIST.filter((l) => l.name.endsWith('Ley Spring')).map((l) => l.name)],
  // A sniper champion's name (039.7: an enemy's name never shows as a chip).
  Cold: ['Coldlens'],
  // The Burrower is the enemy whose trait Burrowed is.
  Burrowed: ['Burrower'],
  // The stage that adds Cluster, and the machine that packs Mine rounds.
  Cluster: ['Cluster die'],
  Mine: ['Mine packer'],
  // The ammo's own parts and chain.
  Arrow: ['Arrow'],
  Bomb: ['Bomb'],
  Landmine: ['Landmine'],
};

/** Every content and world name the scan reads, with what it names. */
function names(): { name: string; what: string; round?: string }[] {
  return [
    ...Object.values(ITEMS).map((i) => ({ name: i.name, what: `item ${i.id}`, ...(i.id in AMMO ? { round: i.id } : {}) })),
    ...Object.values(NODES).map((n) => ({ name: n.name, what: `node ${n.id}` })),
    ...Object.values(PIECES).map((p) => ({ name: p.name, what: `piece ${p.id}` })),
    ...Object.values(STAGES).map((s) => ({ name: s.name, what: `stage ${s.id}` })),
    ...Object.values(TAGS).map((t) => ({ name: t.prefix, what: `tag ${t.id}` })),
    ...TALENT_LIST.map((t) => ({ name: t.name, what: `talent ${t.id}` })),
    ...RELICS.map((r) => ({ name: r.name, what: `relic ${r.id}` })),
    ...Object.values(ENEMIES).map((e) => ({ name: e.name, what: `enemy ${e.id}` })),
    ...Object.values(CHAMPIONS.names).flatMap((list) => list.map((n) => ({ name: n, what: 'champion' }))),
    ...LANDMARK_LIST.map((l) => ({ name: l.name, what: `landmark ${l.id}` })),
  ];
}

describe('reserved words (039)', () => {
  it('no content or world name uses a reserved word outside its own meaning', () => {
    const bad: string[] = [];
    for (const n of names()) {
      const own = n.round ? roundKeywords(n.round).map((k) => KEYWORDS[k].name) : [];
      // A tag's prefix names its own keyword's round (Split, Homing, Cluster); Frost isn't reserved.
      if (n.what.startsWith('tag ')) own.push(KEYWORDS[TAGS[n.what.slice(4)]?.keyword ?? 'shot'].name);
      for (const [word, re] of Object.entries(WORDS)) {
        if (!re.test(n.name) || own.includes(word) || ALLOWED[word]?.includes(n.name)) continue;
        // Fire never shows yet; the word stays a verb in "fire rate" until it ships.
        bad.push(`${n.what} "${n.name}" holds ${word}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every allowed name is in the game (no stale allowance)', () => {
    const all = names().map((n) => n.name);
    for (const [word, list] of Object.entries(ALLOWED)) for (const n of list) expect(all, `${word}: ${n}`).toContain(n);
  });

  it('generated lines use reserved words only through references: no template, rule or label types one', () => {
    const typed = [...KEYWORD_LIST.map((k) => k.template), ...Object.values(RULES).map((r) => r.template), ...Object.values(STATS).map((s) => s.label)];
    const bad = typed.flatMap((t) => {
      const bare = t.replace(REF, '').replace(SLOT, '');
      return Object.entries(WORDS).flatMap(([word, re]) => (word !== 'Fire' && re.test(bare) ? [`"${t}" types ${word}`] : []));
    });
    expect(bad).toEqual([]);
  });

  it('"fire" shows only as the verb, in "fire rate" and "held fire", while Fire is reserved', () => {
    expect(KEYWORDS.fire.state).toBe('reserved');
    const lines = contentLines().map((o) => lineText(o.line, { rounds: '' }));
    for (const l of lines.filter((x) => /\bfire\b/i.test(x))) expect(l, l).toMatch(/fire rate/);
  });
});
