import { affixLine, MOVE_BONUS_CAP, ROLL_COOLDOWN_FLOOR, SLOT_BASE, type GearPiece } from '../data/gear';
import type { KeywordId } from '../data/keywords';
import { isRuleLine, type ContentLine, type RuleId, type RuleLine, type Scope } from '../data/lines';
import { relicDef } from '../data/relics';
import { STATS, type StatId } from '../data/statDefs';
import { TALENTS } from '../data/talents';
import { TIER_DAMAGE, TIERS, type TierId } from '../data/tiers';
import type { SimState } from './state';
import { wornPieces } from './worn';

// One stat path (039): `resolveStat` gives any stat of any emission (a round, a Shard, a
// Bomblet, a Pool-burst, a status, the player) as its base, every +% add, × mul and flat
// change with its source, and the final value, `(base + Σflats) × (1 + Σadds) × Πmuls`.
// Every system reads stats through it. A line reaches an emission when its scope is one of
// the emission's keywords, `all-ammo` on any ammo, `you` on the player (039.1). Nothing
// derived is rounded here; only text rounds.

/**
 * What a stat is read for: its keywords, whether it's ammo (All ammo reaches it), the player (You), or a Shard (Shard
 * damage lines reach its damage); 062: a tiered round's material tier, which multiplies its damage (no keyword).
 */
export interface Emission {
  keywords: readonly KeywordId[];
  ammo: boolean;
  you?: true;
  shard?: true;
  tier?: TierId;
}

/** The player (039.1: scope You). */
export const YOU: Emission = { keywords: [], ammo: false, you: true };

/** A status or a ground keyword's own numbers (Chill, Freeze, Stun, Pool). */
export const statusEmission = (k: KeywordId): Emission => ({ keywords: [k], ammo: false });

export interface Contribution {
  /** The talent, relic or gear piece it comes from, by name. */
  source: string;
  value: number;
}

export interface Resolved {
  base: number;
  adds: Contribution[];
  muls: Contribution[];
  flats: Contribution[];
  final: number;
}

/** What stats are made of: the taken talents (037) and the worn gear (036); the tube's ramp (037: Overpressure) when there is one. */
export type Statted = Pick<SimState, 'talents' | 'gear' | 'equipped'> & { tube?: Pick<SimState['tube'], 'overpressure'> };

/** Floats from tenths and hundredths, rounded back so sums read clean (0.3 + 0.5 is 0.8): float hygiene, not rounding. */
export const clean = (v: number): number => Math.round(v * 1e6) / 1e6;

interface Sourced<L extends ContentLine = ContentLine> {
  source: string;
  line: L;
  /** A worn affix: gear's caps apply to these. */
  affix?: true;
}

/** The last loadout's lines: its talents (by id) and its worn pieces (by reference: an identified piece never changes). */
let lastLoadout: { talents: string; pieces: readonly GearPiece[]; lines: Sourced[] } | null = null;

/**
 * Every line in play: the taken talents', the worn relics' and every worn affix (always scope You). Kept for the last
 * loadout, so the many reads in a tick don't rebuild it: the same talents and the same worn pieces give the same lines.
 */
export function activeLines(state: Statted): Sourced[] {
  const talents = state.talents.join(',');
  const pieces = wornPieces(state);
  const last = lastLoadout;
  if (last && last.talents === talents && last.pieces.length === pieces.length && last.pieces.every((p, i) => p === pieces[i])) return last.lines;
  const out: Sourced[] = [];
  for (const id of state.talents) for (const line of TALENTS[id]?.lines ?? []) out.push({ source: TALENTS[id]?.name ?? id, line });
  for (const p of pieces) {
    if (p.relic) for (const line of relicDef(p.relic).lines) out.push({ source: p.name, line });
    for (const a of p.affixes) out.push({ source: p.name, line: affixLine(a), affix: true });
  }
  lastLoadout = { talents, pieces, lines: out };
  return out;
}

/** Whether a scope reaches an emission. */
export function reaches(scope: Scope, e: Emission): boolean {
  if (scope === 'you') return e.you === true;
  if (scope === 'all-ammo') return e.ammo;
  return e.keywords.includes(scope);
}

/** The rule lines in play with this rule, and where each comes from; with an emission, only those that reach it. */
export function ruleLines(state: Statted, rule: RuleId, e?: Emission): Sourced<RuleLine>[] {
  return activeLines(state).flatMap((s) => (isRuleLine(s.line) && s.line.rule === rule && (!e || reaches(s.line.scope, e)) ? [{ source: s.source, line: s.line }] : []));
}

/** The first rule line in play with this rule that reaches `e` (or any, without one), or null. */
export const ruleFor = (state: Statted, rule: RuleId, e?: Emission): RuleLine | null => ruleLines(state, rule, e)[0]?.line ?? null;

/** Worn gear's caps (036, 039.9): its move speed adds stop at MOVE_BONUS_CAP, its roll cooldown adds at ROLL_COOLDOWN_FLOOR. A cap shows as its own add. */
function gearCaps(stat: StatId, affixAdds: readonly Contribution[]): Contribution[] {
  const sum = affixAdds.reduce((n, c) => n + c.value, 0);
  if (stat === 'move-speed' && sum > MOVE_BONUS_CAP) return [{ source: 'gear cap', value: clean(MOVE_BONUS_CAP - sum) }];
  if (stat === 'roll-cooldown' && sum < ROLL_COOLDOWN_FLOOR) return [{ source: 'gear cap', value: clean(ROLL_COOLDOWN_FLOOR - sum) }];
  return [];
}

/** A material tier's damage step's source (062): its name, "Steel" or "Glass". Not a bonus: the breakdown shows it as a step only. */
export const TIER_SOURCES: readonly string[] = Object.values(TIERS).map((t) => t.prefix);

/** Rule-made multipliers: a tiered round's damage (062), heavy armor's walk (unless a rule lifts it) and a fire-rate ramp at its current height. */
function ruleMuls(state: Statted, stat: StatId, e: Emission, lines: readonly Sourced[]): Contribution[] {
  const out: Contribution[] = [];
  if (stat === 'damage' && e.tier) out.push({ source: TIERS[e.tier].prefix, value: TIER_DAMAGE[e.tier] });
  if (stat === 'move-speed' && e.you) {
    const body = wornPieces(state).find((p) => p.slot === 'body');
    const lift = lines.find((s) => isRuleLine(s.line) && s.line.rule === 'no-heavy-slow');
    const scale = lift && isRuleLine(lift.line) ? (lift.line.params.walk ?? 1) : body?.weight ? SLOT_BASE.body[body.weight].walkScale : 1;
    if (scale !== 1) out.push({ source: lift?.source ?? body?.name ?? 'armor', value: scale });
  }
  if (stat === 'fire-rate' && state.tube) {
    for (const s of lines) {
      if (!isRuleLine(s.line) || s.line.rule !== 'ramp' || !reaches(s.line.scope, e)) continue;
      const { rate = 1, ramp = 1 } = s.line.params;
      out.push({ source: s.source, value: 1 + ((rate - 1) * Math.min(state.tube.overpressure, ramp)) / ramp });
    }
  }
  return out;
}

/** Whether a stat line counts toward `stat` on `e`: its own stat, or a Shard's damage from Shard-damage lines. */
const countsFor = (lineStat: StatId, stat: StatId, e: Emission): boolean => lineStat === stat || (stat === 'damage' && e.shard === true && lineStat === 'shard-damage');

/** A stat of an emission from its base, with every change in play and where it comes from. */
export function resolveStat(state: Statted, stat: StatId, e: Emission, base: number): Resolved {
  const lines = activeLines(state);
  const adds: Contribution[] = [];
  const muls: Contribution[] = [];
  const flats: Contribution[] = [];
  const affixAdds: Contribution[] = [];
  for (const s of lines) {
    const l = s.line;
    if (isRuleLine(l) || !countsFor(l.stat, stat, e) || !reaches(l.scope, e)) continue;
    const c = { source: s.source, value: l.value };
    if (l.op === 'add') (s.affix ? affixAdds : adds).push(c);
    else if (l.op === 'mul') muls.push(c);
    else flats.push(c);
  }
  adds.unshift(...affixAdds, ...gearCaps(stat, affixAdds));
  muls.push(...ruleMuls(state, stat, e, lines));
  const add = clean(adds.reduce((n, c) => n + c.value, 0));
  const flat = clean(flats.reduce((n, c) => n + c.value, 0));
  const mul = muls.reduce((n, c) => n * c.value, 1);
  const final = STATS[stat].points ? clean(base + flat + add) * mul : (base + flat) * clean(1 + add) * mul;
  return { base, adds, muls, flats, final };
}

/** Just the final value. */
export const statOf = (state: Statted, stat: StatId, e: Emission, base: number): number => resolveStat(state, stat, e, base).final;
