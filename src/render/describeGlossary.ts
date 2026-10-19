import { itemDef } from '../data/items';
import { ammoDef } from '../data/ammo';
import { KEYWORD_DEBT, KEYWORDS, NOUNS, type KeywordId } from '../data/keywords';
import { keywordPayoffs, keywordSources } from '../data/keywordGraph';
import { GROUP_NAMES, LEGIBILITY_WORDS as W, SCOPE_STATS, SCOPE_TEXT, type ChipId } from '../data/legibility';
import { RELICS } from '../data/relics';
import { REF, renderTemplate, scopeName } from '../data/rulesText';
import { STAGES } from '../data/stages';
import { STATS, type StatId } from '../data/statDefs';
import { TALENTS } from '../data/talents';
import { AFFIXES } from '../data/gear';
import { knownRounds } from '../sim/knownRounds';
import type { Seen } from './describeRound';
import { keywordRule } from './keywordRule';
import { chipOf, chipsOf } from './statSteps';
import { line, type Description, type TipLine, type TipPart } from './tipTypes';

// A keyword's glossary entry (040), pure, every word from 039's data: its name, group and
// chip; its rule with the data's numbers and "yours:" beside any the player's bonuses change;
// Sources (039's computed sources: the rounds the player knows, stages, relics, keystones and
// keywords), Payoffs (039's computed payoffs, "None yet" for none, and after a debt keyword's),
// and Changes (the stats it exposes). The keywords its rule names are chips that open theirs.
// All ammo and You have entries too (039.1); reserved keywords have none.

/** Content by id, by name: a talent, a relic, a stage, or every affix as one. */
function contentName(id: string): string {
  if (id in AFFIXES) return W.affixes;
  return TALENTS[id]?.name ?? RELICS.find((r) => r.id === id)?.name ?? STAGES[id]?.name ?? id;
}

/** A source that isn't a round, by name: a stage for a tag, the content a line belongs to, a keyword. */
function sourceName(source: string): string[] {
  const [kind, id = ''] = source.split(':');
  if (kind === 'tag') return Object.values(STAGES).filter((s) => s.tag === id).map((s) => s.name);
  if (kind === 'keyword') return [KEYWORDS[id as KeywordId].name];
  return [contentName(id)];
}

/** A section: its label, then its names, or "None yet". */
const section = (label: string, names: readonly string[], more = false): TipLine => {
  const list = names.length > 0 ? `${names.join(', ')}${more ? ` ${W.more}` : ''}` : W.noneYet;
  const parts: TipPart[] = [{ text: label.trim(), tone: 'when' }, { text: list }];
  return { text: `${label}${list}`, parts };
};

const statNames = (stats: readonly StatId[]): string => (stats.length > 0 ? stats.map((s) => renderTemplate(STATS[s].label)).join(', ') : W.noStats);

/** The entry for a chip's keyword or scope, or null for a reserved keyword (it never shows). */
export function describeKeyword(seen: Seen, id: ChipId): Description | null {
  const source = { kind: 'keyword' as const, id };
  if (id === 'all-ammo' || id === 'you') {
    const payoffs = [...new Set([...Object.values(TALENTS), ...RELICS].filter((c) => c.lines.some((l) => l.scope === id)).map((c) => c.name))];
    if (id === 'you') payoffs.push(W.affixes);
    const lines = [line(GROUP_NAMES[id], 'dim'), line(renderTemplate(SCOPE_TEXT[id])), section(W.payoffs, payoffs), section(W.stats, [statNames(SCOPE_STATS[id])])];
    return { source, name: scopeName(id), chips: [chipOf(id)], summary: lines, breakdown: lines, bonuses: 0 };
  }
  const def = KEYWORDS[id];
  if (def.state !== 'live') return null;
  const known = knownRounds(seen);
  const from = keywordSources().get(id) ?? [];
  // The known rounds by family first, then stages, content and keywords as the graph has them.
  const rounds = known.filter((r) => from.includes(`round:${r}`)).map((r) => itemDef(ammoDef(r).itemId).name);
  const sources = [...new Set([...rounds, ...from.filter((s) => !s.startsWith('round:')).flatMap(sourceName)])];
  const payoffs = [...new Set((keywordPayoffs().get(id) ?? []).map(contentName))];
  const named = [...def.template.matchAll(REF)].map((m) => m[1] ?? '').filter((r): r is KeywordId => r in KEYWORDS && !(r in NOUNS) && r !== id && KEYWORDS[r as KeywordId].state === 'live');
  const made = (keywordSources().get(id) ?? []).flatMap((s) => (s.startsWith('keyword:') ? [s.slice('keyword:'.length) as KeywordId] : []));
  const lines = [
    line(GROUP_NAMES[def.group], 'dim'),
    line(keywordRule(seen, id, 'yours').text),
    section(W.sources, sources),
    section(W.payoffs, payoffs, payoffs.length > 0 && id in KEYWORD_DEBT),
    section(W.stats, [statNames(def.stats)]),
  ];
  return { source, name: def.name, chips: chipsOf([id, ...made, ...named]), summary: lines, breakdown: lines, bonuses: 0 };
}
