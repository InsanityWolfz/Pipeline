import { KEYWORD_LIST, type KeywordGroup } from './keywords';
import { contentLines, type ContentKind } from './keywordGraph';
import { lineText, textSources, keywordText, stageRounds } from './rulesText';
import { STAGES } from './stages';

// The rendered keyword list and every content line (039: `__GAME__.keywords()`), so e2e and
// 040's glossary read the same text the game shows. Pure.

export interface KeywordReport {
  /** Every keyword: its name, group, state, its rules line (read for its first source) and the line for each source. */
  keywords: { id: string; name: string; group: KeywordGroup; state: 'live' | 'reserved'; text: string; sources: Record<string, string> }[];
  /** Every content line as the player reads it, with what it belongs to. */
  lines: { owner: string; kind: ContentKind; text: string }[];
}

export function keywordReport(): KeywordReport {
  return {
    keywords: KEYWORD_LIST.map((k) => ({
      id: k.id,
      name: k.name,
      group: k.group,
      state: k.state,
      text: k.state === 'live' ? keywordText(k.id) : '',
      sources: Object.fromEntries(textSources(k.id).map((s) => [s, keywordText(k.id, s)])),
    })),
    lines: contentLines().map((o) => {
      const stage = o.kind === 'stage' ? STAGES[o.owner] : undefined;
      return { owner: o.owner, kind: o.kind, text: lineText(o.line, stage ? { rounds: stageRounds(stage) } : {}) };
    }),
  };
}
