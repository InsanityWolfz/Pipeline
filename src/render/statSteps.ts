import { KEYWORDS, type KeywordId, type ParamUnit } from '../data/keywords';
import { type ChipId } from '../data/legibility';
import { formatDamage, formatParam, formatStat, renderTemplate, scopeName, signOf, trimNumber } from '../data/rulesText';
import { STATS, type StatId } from '../data/statDefs';
import { TIER_SOURCES, type Contribution, type Resolved } from '../sim/statResolve';
import type { Chip } from './tipTypes';

// The breakdown's numbers (040), pure: a stat's value in its unit, and a stat's steps from
// resolveStat — "Damage 14 × (1 + 10% Fletcher's Eye + 6% Hard Bore) = 16.2" — so every
// number shown is the one the sim uses. Px and 2-decimal times are for the breakdown and the
// glossary only (Q14, 039.8); summaries use rulesText's own formats.

/** A stat's value in its unit, breakdown style: damage to 1 decimal, rates /s, px, speeds px/s, times to 2 decimals where 1 isn't exact. */
export function statValue(stat: StatId, v: number): string {
  if (stat === 'damage' || stat === 'shard-damage') return formatDamage(v);
  if (stat === 'speed') return formatParam(v, 'px-per-s');
  return formatStat(v, STATS[stat].unit, true);
}

/** A keyword param's value in its unit, breakdown style (a damage param to 1 decimal). */
export function paramValue(v: number, unit: ParamUnit, stat?: StatId): string {
  if (stat === 'damage' || stat === 'shard-damage') return formatDamage(v);
  return formatParam(v, unit, true);
}

/** A stat's label with a capital: "Fire rate", "Shard damage". */
export function statLabel(stat: StatId, prefix = ''): string {
  const label = `${prefix}${prefix ? ' ' : ''}${renderTemplate(STATS[stat].label)}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const signed = (v: number, text: string): string => `${signOf(v)} ${text}`;
const sum = (cs: readonly Contribution[]): string => cs.map((c) => `${signed(c.value, `${Math.round(Math.abs(c.value) * 100)}%`)} ${c.source}`).join(' ');

/**
 * A stat's steps, one line: the base, each flat (in the stat's unit), every +% summed in one pool, every ×, then the
 * final: "Damage 14 × (1 + 10% Fletcher's Eye + 6% Hard Bore) = 16.2", "Shards 5 + 2 Splinter = 7". With nothing
 * changing it, just "Damage 10". `fmt` writes a value in the stat's unit.
 */
export function stepsText(label: string, r: Resolved, fmt: (v: number) => string): string {
  if (r.adds.length + r.flats.length + r.muls.length === 0) return `${label} ${fmt(r.final)}`;
  const flats = r.flats.map((c) => ` ${signed(c.value, fmt(Math.abs(c.value)))} ${c.source}`).join('');
  let text = `${fmt(r.base)}${flats}`;
  if (r.adds.length > 0) text = `${r.flats.length > 0 ? `(${text})` : text} × (1 ${sum(r.adds)})`;
  for (const m of r.muls) text += ` × ${trimNumber(m.value)} ${m.source}`;
  return `${label} ${text} = ${fmt(r.final)}`;
}

/** The talents, relics and gear that change a resolved stat, by name (a gear cap is no bonus, nor 062's material tier: it is the round's own). */
export const bonusSources = (r: Resolved): string[] => [...r.adds, ...r.muls, ...r.flats].map((c) => c.source).filter((s) => s !== 'gear cap' && !TIER_SOURCES.includes(s));

/** A chip for a keyword or scope: its name and its group's colour. */
export function chipOf(id: ChipId): Chip {
  if (id === 'all-ammo' || id === 'you') return { id, label: scopeName(id), group: id };
  return { id, label: KEYWORDS[id].name, group: KEYWORDS[id].group };
}

/** Chips for keywords and scopes, each once, in order. */
export const chipsOf = (ids: readonly ChipId[]): Chip[] => [...new Set(ids)].map(chipOf);

/** What a keyword makes on its own, and what that makes (Cold → Chill → Freeze), in order. */
export function madeBy(ids: readonly KeywordId[]): KeywordId[] {
  const out: KeywordId[] = [];
  const queue = [...ids];
  for (let k = queue.shift(); k !== undefined; k = queue.shift()) {
    for (const c of KEYWORDS[k].creates ?? []) {
      if (ids.includes(c) || out.includes(c)) continue;
      out.push(c);
      queue.push(c);
    }
  }
  return out;
}

/** A template with its `{slot}`s filled (and its `{{id}}` references named). */
export const fill = (template: string, slots: Readonly<Record<string, string | number>>): string => renderTemplate(template, (n) => String(slots[n] ?? ''));
