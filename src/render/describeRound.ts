import { ammoDef, type AmmoDef } from '../data/ammo';
import { TICK_RATE } from '../data/config';
import { itemDef } from '../data/items';
import { KEYWORDS, type KeywordId } from '../data/keywords';
import { LEGIBILITY_WORDS as W, PARAM_STATS, WHEN_LINES } from '../data/legibility';
import { formatDamage, formatParam, formatSeconds, formatStat, LINE_SEP, renderTemplate, textSources, trimNumber } from '../data/rulesText';
import { roundKeywords } from '../data/roundKeywords';
import { roundTier } from '../data/tags';
import { TIER_DAMAGE, TIERS } from '../data/tiers';
import type { StatId } from '../data/statDefs';
import { bombletEmission, roundEmission, shardEmissionOf } from '../sim/emissions';
import type { SimState } from '../sim/state';
import { hitsToFreeze } from '../sim/cold';
import { conditionalHits, rampedFireRate } from '../sim/keystones';
import { resolveStat, statusEmission, type Emission, type Resolved, type Statted } from '../sim/statResolve';
import { linkedTo } from './describeLinks';
import { bonusSources, chipsOf, fill, madeBy, paramValue, statLabel, stepsText } from './statSteps';
import { line, type Description, type TipLine } from './tipTypes';

// A round described (040): its chips (family, delivery, behaviours, damage type), its summary
// with the player's numbers after every bonus, and its breakdown: each stat's steps from
// resolveStat, the held ramp and the "when" multipliers, Linked, and each keyword's rule with
// its final numbers (px included). Fire rates leave out Overpressure's held ramp, which the
// breakdown shows as its own step.

/** What a round is described from: the stats' sources (no tube, so no live ramp) and what the player knows. */
export type Seen = Pick<SimState, 'talents' | 'gear' | 'equipped' | 'crafted' | 'machineMade' | 'carried'>;

/** The stats' sources without the tube: a fire rate's held ramp is shown as its own step, never baked in. */
const still = (s: Seen): Statted => ({ talents: s.talents, gear: s.gear, equipped: s.equipped });

/** A round's own damage before bonuses: a Shot's hit, a Lob's or Mine's Burst. */
const baseDamage = (a: AmmoDef): number => (a.kind === 'lob' ? a.burstDamage : a.damage);

/** Where a keyword param resolves for this round: the round, its Shards, its Bomblets, or the status itself. */
function emissionFor(k: KeywordId, on: 'shard' | 'bomblet' | 'status' | undefined, ammoId: string): Emission {
  const group = KEYWORDS[k].group;
  if (group === 'status' || group === 'ground' || on === 'status') return statusEmission(k);
  if (on === 'shard') return shardEmissionOf(ammoId, true);
  if (on === 'bomblet') return bombletEmission(ammoId);
  return roundEmission(ammoId);
}

/** A keyword param's base for this round: fixed, or read for the round itself (054: a homing round's speed), its base ammo, or its first source. */
function paramBase(k: KeywordId, name: string, a: AmmoDef): number | null {
  const p = KEYWORDS[k].params[name];
  if (!p) return null;
  if ('value' in p) return p.value;
  return p.perSource[a.id] ?? p.perSource[a.base] ?? p.perSource[textSources(k)[0] ?? ''] ?? null;
}

interface ParamNumber {
  keyword: KeywordId;
  name: string;
  stat: StatId | null;
  resolved: Resolved | null;
  text: string;
}

/** Every param of a keyword for this round, resolved through its stat where it has one (PARAM_STATS), in breakdown style. */
function params(s: Statted, k: KeywordId, a: AmmoDef): ParamNumber[] {
  return Object.entries(KEYWORDS[k].params).flatMap(([name, p]) => {
    const base = paramBase(k, name, a);
    if (base === null) return [];
    const map = PARAM_STATS[k]?.[name];
    const resolved = map ? resolveStat(s, map.stat, emissionFor(k, map.on, a.id), base) : null;
    return [{ keyword: k, name, stat: map?.stat ?? null, resolved, text: paramValue(resolved?.final ?? base, p.unit, map?.stat) }];
  });
}

/** The keywords whose rules a round's breakdown shows: its own (not its family) and what they make (Cold's Chill and Freeze). */
const ruleKeywords = (ammoId: string): KeywordId[] => {
  const own = roundKeywords(ammoId).filter((k) => KEYWORDS[k].group !== 'family');
  return [...own, ...madeBy(own)];
};

/** A round described: chips, summary and breakdown. */
export function describeRound(seen: Seen, ammoId: string): Description {
  const s = still(seen);
  const a = ammoDef(ammoId);
  const e = roundEmission(ammoId);
  const keywords = roundKeywords(ammoId);
  const damage = resolveStat(s, 'damage', e, baseDamage(a));
  const rate = resolveStat(s, 'fire-rate', e, TICK_RATE / a.fireTicks);
  const ramp = rampedFireRate(s, ammoId);
  const kws = ruleKeywords(ammoId);
  const nums = kws.flatMap((k) => params(s, k, a));
  const num = (k: KeywordId, name: string): ParamNumber | undefined => nums.find((n) => n.keyword === k && n.name === name);
  const value = (k: KeywordId, name: string): number => num(k, name)?.resolved?.final ?? paramBase(k, name, a) ?? 0;
  // The summary: damage · shots/s, then what its keywords add.
  const head = fill(a.kind === 'straight' ? W.shotLine : W.burstLine, { damage: formatDamage(damage.final), rate: formatStat(rate.final, 'per-s') });
  const extras: string[] = [];
  // 062: a tiered round's material and its × (the breakdown shows it as its own damage step). Its name says it too, so
  // a summary too long for its rows drops it first.
  const tier = roundTier(ammoId);
  const tierText = tier === 'stone' ? [] : [fill(W.tierDamage, { tier: TIERS[tier].prefix, mul: formatParam(TIER_DAMAGE[tier], 'multiplier') })];
  if (kws.includes('freeze')) extras.push(fill(W.freezeIn, { hits: hitsToFreeze(s) }));
  // 060: a Fire round's burn, its share of the hit each second, for its (resolved) time.
  const burn = formatDamage(damage.final * value('fire', 'share'));
  if (keywords.includes('fire')) extras.push(fill(W.burns, { damage: burn, time: formatSeconds(value('fire', 'duration')) }));
  if (keywords.includes('split')) extras.push(fill(W.shards, { count: Math.round(value('split', 'count')), damage: formatDamage(value('split', 'damage')) }));
  if (keywords.includes('cluster')) extras.push(fill(W.bomblets, { count: Math.round(value('cluster', 'count')), damage: formatDamage(value('cluster', 'damage')) }));
  if (a.kind === 'mine') extras.push(fill(W.arms, { time: formatSeconds(value('mine', 'arm')) }));
  // Its bonuses: every talent, relic and affix changing a number it shows (the ramp included).
  const shown = [damage, rate, ...nums.flatMap((n) => (n.resolved ? [n.resolved] : []))];
  const bonuses = new Set([...shown.flatMap(bonusSources), ...(ramp ? [ramp.source] : [])]).size;
  const numbers = { damage: formatDamage(damage.final), perSecond: formatStat(rate.final, 'per-s') };
  // A Burst line too long for its row drops "dmg" before anything is cut (tipFit's short form).
  // 062: so does a tier's note, and then a burn's time (the breakdown has both).
  const shortHead = a.kind === 'straight' ? head : fill(W.burstShort, { damage: formatDamage(damage.final), rate: formatStat(rate.final, 'per-s') });
  const shortExtras = tierText.length > 0 && keywords.includes('fire') ? extras.map((e) => (e.startsWith(fill(W.burnsShort, { damage: burn })) ? fill(W.burnsShort, { damage: burn }) : e)) : extras;
  const full = [head, ...tierText, ...extras].join(LINE_SEP);
  const short = [shortHead, ...shortExtras].join(LINE_SEP);
  const summary: TipLine[] = [{ ...line(full), ...(short !== full ? { short } : {}) }];
  if (bonuses > 0) summary.push(line(fill(bonuses === 1 ? W.bonus : W.bonuses, { count: bonuses }), 'hint'));
  return {
    source: { kind: 'round', id: ammoId },
    name: itemDef(a.itemId).name,
    chips: chipsOf(keywords),
    summary,
    breakdown: breakdown(seen, a, damage, rate, nums),
    bonuses,
    numbers,
  };
}

/** The breakdown: each changed stat's steps, the ramp and "when" lines, Linked, then each keyword's rule with its final numbers. */
function breakdown(seen: Seen, a: AmmoDef, damage: Resolved, rate: Resolved, nums: readonly ParamNumber[]): TipLine[] {
  const s = still(seen);
  const e = roundEmission(a.id);
  const perSec = (v: number) => formatStat(v, 'per-s');
  const out: TipLine[] = [line(stepsText(statLabel('damage'), damage, formatDamage)), line(`${stepsText(statLabel('fire-rate'), rate, perSec)}${LINE_SEP}${fill(W.interval, { time: formatSeconds(TICK_RATE / rate.final, true) })}`)];
  // Overpressure: the rate at the ramp's full height, as resolveStat gives it with the ramp held to the top.
  const ramp = rampedFireRate(s, a.id);
  if (ramp) out.push(line(fill(W.ramp, { rate: trimNumber(ramp.mul), ramp: formatSeconds(ramp.ramp, true), final: perSec(ramp.rate) }), 'when'));
  // Every other number a bonus changes, with its steps (a Burst's radius, Splinter's Shards, Rimecraft's Freeze).
  for (const n of nums) {
    if (!n.resolved || !n.stat || bonusSources(n.resolved).length === 0 || (n.stat === 'damage' && PARAM_STATS[n.keyword]?.[n.name]?.on === undefined)) continue;
    const on = PARAM_STATS[n.keyword]?.[n.name]?.on;
    const status = KEYWORDS[n.keyword].group === 'status' || on === 'status' ? KEYWORDS[n.keyword].name : '';
    // A Shard's or Bomblet's own number by its noun; a status's (or Fire's burn's) by its name (a Boss's shorter Freeze by both).
    const prefix = on && on !== 'status' ? renderTemplate(`{{${on}}}`) : n.name.startsWith('boss') ? `${KEYWORDS.boss.name} ${status}` : status;
    const unit = KEYWORDS[n.keyword].params[n.name]?.unit ?? 'count';
    out.push(line(stepsText(statLabel(n.stat, prefix), n.resolved, (v) => paramValue(v, unit, n.stat ?? undefined))));
  }
  if (a.kind === 'lob') {
    const flight = resolveStat(s, 'flight-time', e, a.maxRange / (a.speed / TICK_RATE));
    if (bonusSources(flight).length > 0) out.push(line(stepsText(statLabel('flight-time'), flight, (v) => formatSeconds(v, true))));
  }
  // The "when" multipliers on its damage: through a Pool (Blastfletch), on a Frozen enemy (Shatterpoint).
  for (const hit of conditionalHits(s, a.id, damage.final)) {
    out.push(line(fill(WHEN_LINES[hit.rule] ?? '', { mul: formatParam(hit.scale, 'multiplier'), source: hit.source, final: formatDamage(hit.damage) }), 'when'));
  }
  out.push(linkedTo(seen, a.id));
  for (const k of ruleKeywords(a.id)) {
    const text = renderTemplate(KEYWORDS[k].template, (name) => nums.find((n) => n.keyword === k && n.name === name)?.text ?? '');
    out.push(line(`${KEYWORDS[k].name}: ${text}`));
  }
  return out;
}
