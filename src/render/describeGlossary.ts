import { itemDef } from '../data/items';
import { ammoDef } from '../data/ammo';
import { KEYWORD_DEBT, KEYWORDS, NOUNS, type KeywordId } from '../data/keywords';
import { contentLines, keywordPayoffs, keywordSources } from '../data/keywordGraph';
import { GROUP_NAMES, LEGIBILITY_WORDS as W, type ChipId } from '../data/legibility';
import { isRuleLine } from '../data/lines';
import { BASE_FAMILY } from '../data/roundKeywords';
import { roundBase } from '../data/tags';
import { SCOPES } from '../data/keywords';
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
    // What it changes and who pays it off are its content lines (talents, relics and every affix); All ammo comes with
    // every round the player knows (by family), You is always there.
    const own = contentLines().filter((o) => o.line.scope === id);
    const payoffs = [...new Set(own.map((o) => contentName(o.owner)))];
    const stats = [...new Set(own.flatMap((o) => (isRuleLine(o.line) ? [] : [o.line.stat])))];
    const families = Object.entries(BASE_FAMILY).filter(([base]) => knownRounds(seen).some((r) => roundBase(r) === base)).map(([, k]) => KEYWORDS[k].name);
    const sources = id === 'all-ammo' ? families : [SCOPES.you.sources];
    const lines = [line(GROUP_NAMES[id], 'dim'), line(renderTemplate(SCOPES[id].template)), section(W.sources, sources), section(W.payoffs, payoffs), section(W.stats, [statNames(stats)])];
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
