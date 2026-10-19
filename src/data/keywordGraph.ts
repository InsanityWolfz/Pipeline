import { AMMO } from './ammo';
import { AFFIXES, affixLine, type AffixKind } from './gear';
import { KEYWORD_LIST, type KeywordId } from './keywords';
import { isRuleLine, type ContentLine } from './lines';
import { RELICS } from './relics';
import { roundKeywords } from './roundKeywords';
import { STAGES, stageLines } from './stages';
import { TAGS } from './tags';
import { TALENT_LIST } from './talents';

// How keywords link up (039), computed from data, never listed by hand: every content line
// with its owner, each keyword's sources (a round or tag that carries it, a relic or
// keystone line that creates it, or a keyword with a source that makes it) and its payoffs
// (content lines whose scope is it, or whose trigger is it). The new-keyword rule reads it,
// and so will 040's glossary.

export type ContentKind = 'talent' | 'keystone' | 'relic' | 'stage' | 'affix';

export interface OwnedLine {
  /** The content's id: a talent, relic, stage or affix kind. */
  owner: string;
  kind: ContentKind;
  line: ContentLine;
}

/** Every content line in the game, with what it belongs to. */
export function contentLines(): OwnedLine[] {
  return [
    ...TALENT_LIST.flatMap((t) => t.lines.map((line) => ({ owner: t.id, kind: (t.kind === 'keystone' ? 'keystone' : 'talent') as ContentKind, line }))),
    ...RELICS.flatMap((r) => r.lines.map((line) => ({ owner: r.id, kind: 'relic' as const, line }))),
    ...Object.values(STAGES).flatMap((s) => stageLines(s).map((line) => ({ owner: s.id, kind: 'stage' as const, line }))),
    ...(Object.keys(AFFIXES) as AffixKind[]).map((k) => ({ owner: k, kind: 'affix' as const, line: affixLine({ kind: k, value: AFFIXES[k].max }) })),
  ];
}

/** A stage's line grants its keyword (a source), so it never counts as a payoff. */
const grants = (o: OwnedLine): boolean => isRuleLine(o.line) && o.line.rule === 'adds';

/** Where each keyword comes from: rounds, tags, lines that create it, and keywords that make it, by name (`round:arrow`, `tag:frost`, `line:k1`, `keyword:cold`). */
export function keywordSources(): Map<KeywordId, string[]> {
  const out = new Map<KeywordId, string[]>();
  const add = (id: KeywordId, source: string) => out.set(id, [...new Set([...(out.get(id) ?? []), source])]);
  for (const id of Object.keys(AMMO)) for (const k of roundKeywords(id)) add(k, `round:${id}`);
  for (const t of Object.values(TAGS)) add(t.keyword, `tag:${t.id}`);
  for (const o of contentLines()) if (isRuleLine(o.line) && o.line.creates) add(o.line.creates, `line:${o.owner}`);
  // A keyword with a source makes what it creates (Cold → Chill → Freeze), until nothing new comes.
  for (let changed = true; changed; ) {
    changed = false;
    for (const k of KEYWORD_LIST) {
      if (!out.has(k.id)) continue;
      for (const c of k.creates ?? []) {
        if (out.get(c)?.includes(`keyword:${k.id}`)) continue;
        add(c, `keyword:${k.id}`);
        changed = true;
      }
    }
  }
  return out;
}

/** Each keyword's payoffs: content lines (not a stage's grant) scoped to it or triggered by it, by owner. */
export function keywordPayoffs(): Map<KeywordId, string[]> {
  const out = new Map<KeywordId, string[]>();
  const add = (id: string, owner: string) => {
    const k = id as KeywordId;
    out.set(k, [...(out.get(k) ?? []), owner]);
  };
  for (const o of contentLines()) {
    if (grants(o)) continue;
    if (o.line.scope !== 'all-ammo' && o.line.scope !== 'you') add(o.line.scope, o.owner);
    if (isRuleLine(o.line) && o.line.trigger) add(o.line.trigger, o.owner);
  }
  return out;
}
