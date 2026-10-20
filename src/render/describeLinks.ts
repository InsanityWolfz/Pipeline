import { itemDef } from '../data/items';
import { ammoDef } from '../data/ammo';
import type { KeywordId } from '../data/keywords';
import { LEGIBILITY_WORDS as W } from '../data/legibility';
import { isRuleLine, type ContentLine, type Scope } from '../data/lines';
import { RELICS } from '../data/relics';
import { bombletKeywords, poolBurstKeywords, roundKeywords, shardKeywords } from '../data/roundKeywords';
import { STAGES } from '../data/stages';
import { hasTagKeyword, tagDef, withTag } from '../data/tags';
import { TALENT_LIST } from '../data/talents';
import { roundEmission } from '../sim/emissions';
import { knownRounds } from '../sim/knownRounds';
import { stagesUnlocked } from '../sim/stages';
import { ruleFor, type Statted } from '../sim/statResolve';
import { wornPieces } from '../sim/worn';
import { madeBy } from './statSteps';
import type { TipLine, TipPart } from './tipTypes';
import type { Seen } from './describeRound';

// How content links to rounds (040), pure: the keywords a round touches, the rounds a line
// reaches ("Reaches: Bomb, Cluster bomb, Landmine") and everything linked to a round, taken
// or not ("Linked:", taken ones lit). All ammo and You lines touch every round or none, so
// they never show in Linked.

/** A round's keywords and its children's (a Split's Shards, a Cluster's Bomblets). */
function ownKeywords(ammoId: string): KeywordId[] {
  const out = roundKeywords(ammoId);
  if (hasTagKeyword(ammoId, 'split')) out.push(...shardKeywords(ammoId, true));
  if (hasTagKeyword(ammoId, 'cluster')) out.push(...bombletKeywords(ammoId));
  return [...new Set(out)];
}

/** What a set of keywords reaches with what they make (Cold → Chill → Freeze). */
const withMade = (ks: readonly KeywordId[]): KeywordId[] => [...new Set([...ks, ...madeBy(ks)])];

/** The keywords a line in play can reach on a round: its own, its children's, a Pool-burst's while a pool-strike line reaches it, and what they make. */
export function reachKeywords(s: Statted, ammoId: string): KeywordId[] {
  const own = ownKeywords(ammoId);
  if (ruleFor(s, 'pool-strike', roundEmission(ammoId))) own.push(...poolBurstKeywords(ammoId));
  return withMade(own);
}

/** Whether a scope reaches a round, by its keywords; All ammo reaches every round, You none. */
const scopeReaches = (scope: Scope, ks: readonly KeywordId[]): boolean => scope === 'all-ammo' || (scope !== 'you' && ks.includes(scope));

/** The known rounds a line changes, by name, in family order. */
export function reachedRounds(seen: Seen, line: ContentLine): string[] {
  return knownRounds(seen)
    .filter((id) => scopeReaches(line.scope, reachKeywords(seen, id)))
    .map((id) => itemDef(ammoDef(id).itemId).name);
}

/** The keywords anything (taken or not) can touch on a round: its own, what lines scoped to it create, and what those make. */
function touchKeywords(ammoId: string): KeywordId[] {
  const own = ownKeywords(ammoId);
  const lines = [...TALENT_LIST.flatMap((t) => t.lines), ...RELICS.flatMap((r) => r.lines)];
  const created = lines.flatMap((l) => (isRuleLine(l) && l.creates && l.scope !== 'all-ammo' && l.scope !== 'you' && own.includes(l.scope) ? [l.creates] : []));
  return withMade([...own, ...created]);
}

/** Whether a line touches these keywords: its scope (never All ammo or You) or its trigger. */
const touches = (l: ContentLine, ks: readonly KeywordId[]): boolean => (l.scope !== 'all-ammo' && l.scope !== 'you' && ks.includes(l.scope)) || (isRuleLine(l) && l.trigger !== undefined && ks.includes(l.trigger));

/** The talents, relics and stages linked to a round, taken or not, with whether each is the player's (taken, worn, unlocked). */
export function linked(seen: Seen, ammoId: string): { name: string; lit: boolean }[] {
  const ks = touchKeywords(ammoId);
  const worn = new Set(wornPieces(seen).flatMap((p) => (p.relic ? [p.relic] : [])));
  const unlocked = stagesUnlocked(seen);
  return [
    ...TALENT_LIST.filter((t) => t.lines.some((l) => touches(l, ks))).map((t) => ({ name: t.name, lit: seen.talents.includes(t.id) })),
    ...RELICS.filter((r) => r.lines.some((l) => touches(l, ks))).map((r) => ({ name: r.name, lit: worn.has(r.id) })),
    ...Object.values(STAGES)
      .filter((st) => ks.includes(tagDef(st.tag).keyword) || withTag(ammoId, st.tag) !== null)
      .map((st) => ({ name: st.name, lit: unlocked.includes(st.id) })),
  ];
}

/** The breakdown's Linked line: each name lit if it's the player's, dim if not. */
export function linkedTo(seen: Seen, ammoId: string): TipLine {
  const names = linked(seen, ammoId);
  const parts: TipPart[] = [{ text: W.linked.trim() }, ...names.map((n, i) => ({ text: `${n.name}${i < names.length - 1 ? ',' : ''}`, tone: n.lit ? ('lit' as const) : ('dim' as const) }))];
  if (names.length === 0) parts.push({ text: W.noneYet, tone: 'dim' });
  return { text: parts.map((p) => p.text).join(' '), parts };
}
