import { TICK_RATE, TILE_SIZE } from './config';
import { itemDef } from './items';
import { keywordDef, KEYWORDS, NOUNS, SCOPES, type KeywordId, type ParamUnit } from './keywords';
import { isRuleLine, RULES, type ContentLine, type RuleLine, type Scope, type StatLine } from './lines';
import { BASE_FAMILY } from './roundKeywords';
import { stageLines, type StageDef } from './stages';
import { STATS, type StatUnit } from './statDefs';
import { tagDef } from './tags';

// The one formatter for player text (039): params and stats into words, keyword templates
// rendered, and every content line in the grammar `Scope: change label` or `Scope: rule
// text`. Times read in seconds to 1 decimal, changes in %, multipliers as ×, counts and HP
// whole, rates /s to 1 decimal, turn rates °/s. Px only show where a template asks (040's
// glossary and breakdown); no content line shows them. Pure, so data tests read it.

/** The minus sign every change is written with, and a change's sign. */
export const MINUS = '−';
export const signOf = (v: number): string => (v < 0 ? MINUS : '+');

/** The units written after a number with a space (a wrapped line keeps each with its number, 040). */
export const UNITS = { seconds: 's', px: 'px', pxPerS: 'px/s', hp: 'HP', hpPerS: 'HP/s' } as const;
const SEP = ' · ';

/** A number to at most `places` decimals, without trailing zeros: 1.5, 2, 0.75. */
export function trimNumber(v: number, places = 2): string {
  return String(Number(v.toFixed(places)));
}

/** Damage to 1 decimal without a trailing ".0" (040): 16.2, 12. */
export const formatDamage = (v: number): string => trimNumber(v, 1);

/**
 * Ticks in seconds: to 1 decimal ("0.7 s"), or with `precise` (040's breakdown and glossary, 039.8) to 2 where 1
 * isn't exact ("0.67 s", "1.5 s").
 */
export function formatSeconds(ticks: number, precise = false): string {
  const s = ticks / TICK_RATE;
  const one = s.toFixed(1);
  return `${precise && Math.abs(Number(one) - s) > 1e-9 ? s.toFixed(2) : one} ${UNITS.seconds}`;
}

/** A param's value in its unit's words; `precise` times as formatSeconds says. */
export function formatParam(value: number, unit: ParamUnit, precise = false): string {
  switch (unit) {
    case 'ticks':
      return formatSeconds(value, precise);
    case 'px':
      return `${trimNumber(value, 1)} ${UNITS.px}`;
    case 'px-per-s':
      return `${trimNumber(value, 1)} ${UNITS.pxPerS}`;
    case 'deg':
      return `${trimNumber(value, 0)}°`;
    case 'deg-per-s':
      return `${trimNumber(value, 0)}°/s`;
    case 'deg-per-tick':
      return `${trimNumber(value * TICK_RATE, 0)}°/s`;
    case 'fraction':
      return `${Math.round(value * 100)}%`;
    case 'multiplier':
      return `×${trimNumber(value)}`;
    case 'count':
      return `${Math.round(value)}`;
    case 'hp':
      return `${Math.round(value)} ${UNITS.hp}`;
    case 'hp-per-s':
      return `${value.toFixed(1)} ${UNITS.hpPerS}`;
  }
}

/** A stat's value in its unit's words (a flat change, a total); `precise` times as formatSeconds says. */
export function formatStat(value: number, unit: StatUnit, precise = false): string {
  switch (unit) {
    case 'count':
      return `${Math.round(value)}`;
    case 'seconds':
      return formatParam(value, 'ticks', precise);
    case 'hp-per-s':
      return formatParam(value, 'hp-per-s');
    case 'px':
      return formatParam(value, 'px');
    case 'fraction':
      return formatParam(value, 'fraction');
    case 'deg-per-tick':
      return formatParam(value, 'deg-per-tick');
    case 'per-s':
      return `${value.toFixed(1)}/s`;
    case 'tiles': {
      const tiles = trimNumber(value / TILE_SIZE, 1);
      return `${tiles} ${tiles === '1' ? 'tile' : 'tiles'}`;
    }
  }
}

/** A keyword's or child noun's name, or one of a keyword's own forms (`freeze.adj`: "Frozen"). */
export function refName(id: string, form?: string): string {
  if (id in NOUNS) return NOUNS[id as keyof typeof NOUNS];
  const def = keywordDef(id);
  if (!form) return def.name;
  const f = def.forms?.[form];
  if (!f) throw new Error(`Keyword '${id}' has no form '${form}'`);
  return f;
}

/** The `{{id}}` and `{{id.form}}` references in a template. */
export const REF = /\{\{([a-z-]+)(?:\.([a-z]+))?\}\}/g;
/** The `{param}` slots in a template, once its references are rendered. */
export const SLOT = /\{([a-zA-Z]+)\}/g;

/** A template with its references named and each slot read by `param`. */
export function renderTemplate(template: string, param: (name: string) => string = () => ''): string {
  return template.replace(REF, (_, id: string, form?: string) => refName(id, form)).replace(SLOT, (_, name: string) => param(name));
}

/** A keyword's rules line, its per-source params read for `source` (its first source by default). */
export function keywordText(id: KeywordId, source?: string): string {
  const def = KEYWORDS[id];
  return renderTemplate(def.template, (name) => {
    const p = def.params[name];
    if (!p) throw new Error(`Keyword '${id}' has no param '${name}'`);
    if ('value' in p) return formatParam(p.value, p.unit);
    const at = source ?? textSources(id)[0] ?? '';
    const v = p.perSource[at];
    if (v === undefined) throw new Error(`Keyword '${id}' has no '${name}' for '${at}'`);
    return formatParam(v, p.unit);
  });
}

/**
 * The sources a keyword's text can be read for: those named by every one of its per-source params, in order (none for
 * a keyword whose params are all fixed). A Pool-burst has a Burst radius but no damage of its own (it deals its arrow's hit).
 */
export function textSources(id: KeywordId): string[] {
  const lists = Object.values(KEYWORDS[id].params).flatMap((p) => ('perSource' in p ? [Object.keys(p.perSource)] : []));
  const [first, ...rest] = lists;
  return (first ?? []).filter((s) => rest.every((l) => l.includes(s)));
}

/** A scope's name: a keyword's, or a plain scope's, All ammo and You (039.1). */
export function scopeName(scope: Scope): string {
  if (scope === 'all-ammo' || scope === 'you') return SCOPES[scope].name;
  return KEYWORDS[scope].name;
}

const signed = (v: number, text: string): string => `${signOf(v)}${text}`;

/** A stat line's change and label, change first: "+10% damage", "−1 stack to Freeze", "×0.75 roll distance". */
export function changeText(line: StatLine): string {
  const def = STATS[line.stat];
  const label = renderTemplate(def.label);
  if (line.op === 'mul') return `×${trimNumber(line.value)} ${label}`;
  if (line.op === 'add') return `${signed(line.value, `${Math.round(Math.abs(line.value) * 100)}%`)} ${label}`;
  return `${signed(line.value, formatStat(Math.abs(line.value), def.unit))} ${label}`;
}

/** A rule line's text after its scope, its params in their units; `extra` fills slots that aren't numbers (a stage's `{rounds}`); `precise` times to 2 decimals where 1 isn't exact (040). */
export function ruleText(line: RuleLine, extra: Readonly<Record<string, string>> = {}, precise = false): string {
  const rule = RULES[line.rule];
  return renderTemplate(rule.template, (name) => {
    const text = extra[name];
    if (text !== undefined) return text;
    const unit = rule.params[name];
    const v = line.params[name];
    if (unit === undefined || v === undefined) throw new Error(`Rule '${line.rule}' has no param '${name}'`);
    return formatParam(v, unit, precise);
  });
}

/** A content line as the player reads it: "Bomb: +10% damage", "You: rolling through an enemy Stuns it for 0.7 s, once per roll". */
export function lineText(line: ContentLine, extra: Readonly<Record<string, string>> = {}): string {
  return `${scopeName(line.scope)}: ${isRuleLine(line) ? ruleText(line, extra) : changeText(line)}`;
}

/** Several lines in one string, as a hover or a gear row shows them. */
export const linesText = (lines: readonly ContentLine[]): string => lines.map((l) => lineText(l)).join(SEP);

/** The rounds a stage's tag takes, in words: "any round" when it takes every family, else "Ley rounds". */
export function stageRounds(stage: StageDef): string {
  const families = tagDef(stage.tag).appliesTo.map((base) => BASE_FAMILY[base] ?? base);
  if (families.length === Object.keys(BASE_FAMILY).length) return 'any round';
  return `${families.map((f) => scopeName(f as KeywordId)).join(' and ')} rounds`;
}

/** A stage's cost per batch: "1 rimestone per 4". */
export const stageCost = (stage: StageDef): string => `${stage.materialCount} ${itemDef(stage.material).name.toLowerCase()} per ${stage.batch}`;

/** A stage's lines, as its bench row's hover shows them: "Cold: added to any round". */
export function stageLineText(stage: StageDef): string {
  const rounds = stageRounds(stage);
  return stageLines(stage).map((l) => lineText(l, { rounds })).join(SEP);
}

/** A stage's build tip: its lines and its cost, "Cold: added to any round · 1 rimestone per 4". */
export const stageText = (stage: StageDef): string => [stageLineText(stage), stageCost(stage)].join(SEP);

export { SEP as LINE_SEP };
