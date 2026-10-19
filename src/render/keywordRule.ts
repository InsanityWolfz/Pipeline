import { KEYWORDS, type KeywordId } from '../data/keywords';
import { LEGIBILITY_WORDS as W, PARAM_STATS } from '../data/legibility';
import { AMMO } from '../data/ammo';
import { renderTemplate, textSources } from '../data/rulesText';
import { roundKeywords } from '../data/roundKeywords';
import { bombletEmission, poolBurstEmission, roundEmission, shardEmissionOf } from '../sim/emissions';
import { roundsByFamily } from '../sim/knownRounds';
import { resolveStat, statusEmission, type Emission, type Resolved, type Statted } from '../sim/statResolve';
import { fill, paramValue } from './statSteps';

// A keyword's rule with its numbers (040), pure: its template with each param read from data
// for one source (its first, as 039's report reads it), each param that is a stat resolved
// through resolveStat on that source's emission. A stage's breakdown shows the final numbers;
// the glossary shows the data's number with "(yours: …)" beside any the player's bonuses change.

/** The round a keyword's fixed params are read on: the first round (by family) that carries it. */
const carrier = (k: KeywordId): string => roundsByFamily().find((r) => roundKeywords(r).includes(k)) ?? 'arrow';

/** A per-source key's emission: a round's, a child's (a Split ley bolt's Shard, a Cluster bomb's Bomblet, an arrow's Pool-burst), else the carrier's. */
function sourceEmission(k: KeywordId, source: string): Emission {
  if (source in AMMO) return roundEmission(source);
  if (source === 'shard') return shardEmissionOf('ley-bolt+split', true);
  if (source === 'bomblet') return bombletEmission('bomb+cluster');
  if (source === 'pool-burst') return poolBurstEmission('arrow');
  return roundEmission(carrier(k));
}

/** Where one of a keyword's params resolves: a status on itself, a Shard or Bomblet param on the carrier's child, else the source's emission. */
function paramEmission(k: KeywordId, on: 'shard' | 'bomblet' | undefined, source: string): Emission {
  const group = KEYWORDS[k].group;
  if (group === 'status' || group === 'ground') return statusEmission(k);
  if (on === 'shard') return shardEmissionOf(carrier(k), true);
  if (on === 'bomblet') return bombletEmission(carrier(k));
  return sourceEmission(k, source);
}

/**
 * A keyword's rule for `source` (its first by default) with the stats' sources in `s`: `final` writes each number as
 * the player has it; `yours` writes the data's number and "(yours: …)" where a bonus changes it. Also returns what
 * each stat param resolved to (for the bonus hint).
 */
export function keywordRule(s: Statted, k: KeywordId, mode: 'final' | 'yours', source?: string): { text: string; resolved: Resolved[] } {
  const def = KEYWORDS[k];
  const at = source ?? textSources(k)[0] ?? '';
  const resolved: Resolved[] = [];
  const text = renderTemplate(def.template, (name) => {
    const p = def.params[name];
    if (!p) return '';
    const base = 'value' in p ? p.value : p.perSource[at];
    if (base === undefined) return '';
    const map = PARAM_STATS[k]?.[name];
    const r = map ? resolveStat(s, map.stat, paramEmission(k, map.on, at), base) : null;
    if (r) resolved.push(r);
    const shown = paramValue(base, p.unit, map?.stat);
    const final = paramValue(r?.final ?? base, p.unit, map?.stat);
    if (mode === 'final') return final;
    return final === shown ? shown : `${shown} ${fill(W.yours, { value: final })}`;
  });
  return { text, resolved };
}
