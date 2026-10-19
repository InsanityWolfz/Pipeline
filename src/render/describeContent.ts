import { affixLine, RARITIES } from '../data/gear';
import { SLOT_NAMES } from '../data/gearAssets';
import { KEYWORDS, type KeywordId } from '../data/keywords';
import { LANE_NAMES, LEGIBILITY_WORDS as W, TALENT_COST, type ChipId } from '../data/legibility';
import { isRuleLine, type ContentLine } from '../data/lines';
import { pieceDef } from '../data/pieces';
import { relicDef } from '../data/relics';
import { lineText, linesText, LINE_SEP, renderTemplate, scopeName, stageCost, stageLineText } from '../data/rulesText';
import { tagDef, withTag } from '../data/tags';
import { stageDef } from '../data/stages';
import { itemDef } from '../data/items';
import { ammoDef } from '../data/ammo';
import { TALENT_PANEL } from '../data/talentAssets';
import { LANE_COLORS, TALENT_START, talentDef } from '../data/talents';
import { affixLabel } from './gearText';
import { roundsByFamily, knownRounds } from '../sim/knownRounds';
import { resolveStat, YOU, type Statted } from '../sim/statResolve';
import { keywordRule } from './keywordRule';
import { changeLine, reached, ruleDetail, totalsChange } from './describeChanges';
import { reachedRounds } from './describeLinks';
import type { Seen } from './describeRound';
import { bonusSources, chipsOf, fill, madeBy } from './statSteps';
import { line, type Description, type TipLine } from './tipTypes';

// Talents, relics, stages, gear and the build bar's other pieces described (040): chips from
// their lines' scopes and the keywords their rules make or spend; a summary of their
// generated lines (039) and what they reach; a breakdown of each line before → after on
// everything it reaches, a talent's lane and cost, a stage's rule, cost and rounds, a gear
// piece's totals before → after wearing it.

/** A content piece's chips: its lines' scopes, then any keyword its rule lines create or trigger. */
function contentChips(lines: readonly ContentLine[]): ChipId[] {
  const made = lines.flatMap((l) => (isRuleLine(l) ? [l.creates, l.trigger].filter((k): k is KeywordId => k !== undefined) : []));
  return [...lines.map((l) => l.scope), ...made];
}

/** How many talents, relics and affixes in play change a number these lines change. */
function lineBonuses(s: Statted, lines: readonly ContentLine[]): number {
  const sources = lines.flatMap((l) => {
    if (isRuleLine(l)) return [];
    if (l.scope === 'you') return bonusSources(resolveStat(s, l.stat, YOU, 1));
    return reached(s, l).flatMap((r) => bonusSources(r.resolved));
  });
  return new Set(sources).size;
}

const hint = (n: number): TipLine[] => (n > 0 ? [line(fill(n === 1 ? W.bonus : W.bonuses, { count: n }), 'hint')] : []);

/** "Reaches:" the known rounds the lines change; left off when every line is the player's own (scope You). */
function reachesLine(seen: Seen, lines: readonly ContentLine[]): TipLine[] {
  const ammo = lines.filter((l) => l.scope !== 'you');
  if (ammo.length === 0) return [];
  const names = [...new Set(ammo.flatMap((l) => reachedRounds(seen, l)))];
  return [line(names.length > 0 ? fill(W.reaches, { rounds: names.join(', ') }) : W.reachesNothing)];
}

/** Each line in full: a stat line before → after, a rule line with precise times and its px. */
const detail = (before: Statted, after: Statted, lines: readonly ContentLine[]): TipLine[] => lines.map((l) => line(isRuleLine(l) ? ruleDetail(l) : changeLine(before, after, l)));

/** A talent: its generated lines and what they reach; before → after on each, its lane and cost. */
export function describeTalent(seen: Seen, id: string): Description {
  const def = talentDef(id);
  const taken = seen.talents.includes(id);
  const without = { ...seen, talents: seen.talents.filter((t) => t !== id) };
  const withIt = { ...seen, talents: taken ? seen.talents : [...seen.talents, id] };
  const bonuses = lineBonuses(withIt, def.lines);
  const start = def.id === TALENT_START;
  const cost = start ? TALENT_COST.free : `${TALENT_COST.each} ${TALENT_COST.each === 1 ? TALENT_COST.point : TALENT_COST.points}`;
  return {
    source: { kind: 'talent', id },
    name: def.name,
    nameColor: LANE_COLORS[def.lane],
    chips: chipsOf(contentChips(def.lines)),
    summary: [line(start ? TALENT_PANEL.startText : linesText(def.lines)), ...reachesLine(seen, def.lines), ...hint(bonuses)],
    breakdown: [...(start ? [line(TALENT_PANEL.startText)] : detail(without, withIt, def.lines)), line(fill(W.lane, { lane: renderTemplate(LANE_NAMES[def.lane]), cost }))],
    bonuses,
  };
}

/** A gear piece (a relic included): rarity, slot and armor, its affixes as one You line, a relic's rules; its totals before → after wearing it. */
export function describeGear(seen: Seen, pieceId: number): Description | null {
  const p = seen.gear.find((g) => g.id === pieceId);
  if (!p) return null;
  const worn = seen.equipped[p.slot] === p.id;
  const before = { ...seen, equipped: { ...seen.equipped, [p.slot]: worn ? null : seen.equipped[p.slot] } };
  const after = { ...seen, equipped: { ...seen.equipped, [p.slot]: p.id } };
  const relic = p.relic ? relicDef(p.relic).lines : [];
  const head = fill(W.gearHead, { rarity: RARITIES[p.rarity].name, slot: SLOT_NAMES[p.slot].toLowerCase(), armor: p.baseArmor });
  const you = p.affixes.length > 0 ? [line(`${scopeName('you')}: ${p.affixes.map(affixLabel).join(LINE_SEP)}`)] : [];
  // Its bonuses: what changes the numbers it moves (its armor and its affixes' stats), worn as it would be.
  const stats = new Set(['armor' as const, ...p.affixes.map((a) => affixLine(a).stat)]);
  const bonuses = new Set([...stats].flatMap((stat) => bonusSources(resolveStat(after, stat, YOU, 1)))).size;
  return {
    source: { kind: 'gear', id: String(p.id) },
    name: p.name,
    nameColor: RARITIES[p.rarity].color,
    chips: chipsOf(['you', ...contentChips(relic)]),
    summary: [line(head), ...you, ...relic.map((l) => line(lineText(l))), ...hint(bonuses)],
    breakdown: [line(head), ...p.affixes.map((a) => line(`${scopeName('you')}: ${affixLabel(a)}`)), ...relic.map((l) => line(isRuleLine(l) ? ruleDetail(l) : lineText(l))), line(totalsChange(before, after))],
    bonuses,
  };
}

/** A stage: its generated line and which of the player's rounds it takes; its keyword's rule with numbers, its cost, and every round it takes and gives. */
export function describeStage(seen: Seen, id: string): Description {
  const st = stageDef(id);
  const tag = tagDef(st.tag);
  const name = (r: string): string => itemDef(ammoDef(r).itemId).name;
  const takes = knownRounds(seen).filter((r) => withTag(r, st.tag) !== null).map(name);
  const rules = [tag.keyword, ...madeBy([tag.keyword])].map((k) => ({ k, ...keywordRule(seen, k, 'final') }));
  const bonuses = new Set(rules.flatMap((r) => r.resolved.flatMap(bonusSources))).size;
  const gives = roundsByFamily().flatMap((r) => {
    const out = withTag(r, st.tag);
    return out ? [fill(W.gives, { from: name(r), to: name(out) })] : [];
  });
  return {
    source: { kind: 'stage', id },
    name: st.name,
    chips: chipsOf([tag.keyword]),
    summary: [line(stageLineText(st)), line(takes.length > 0 ? fill(W.takes, { rounds: takes.join(', ') }) : W.takesNothing), ...hint(bonuses)],
    breakdown: [...rules.map((r) => line(`${KEYWORDS[r.k].name}: ${r.text}`)), line(fill(W.cost, { cost: stageCost(st) })), line(gives.join(LINE_SEP))],
    bonuses,
  };
}

/** A build-bar piece that isn't a stage (015): its name and description, nothing more to break down. */
export function describePiece(id: string): Description {
  const def = pieceDef(id);
  return { source: { kind: 'piece', id }, name: def.name, chips: [], summary: [line(def.description)], breakdown: [line(def.description)], bonuses: 0 };
}
