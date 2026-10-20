import { ammoDef, lobAmmo, mineAmmo, straightAmmo } from '../data/ammo';
import { TICK_RATE } from '../data/config';
import { itemDef } from '../data/items';
import { KEYWORDS } from '../data/keywords';
import { CHILD_NAMES, LEGIBILITY_WORDS as W } from '../data/legibility';
import { RULES, type RuleLine, type StatLine } from '../data/lines';
import { ROLLBREAKER } from '../data/relics';
import { LINE_SEP, renderTemplate, ruleText, scopeName } from '../data/rulesText';
import { STATS, type StatId } from '../data/statDefs';
import { CLUSTER, COLD, HOMING, SPLIT } from '../data/tags';
import { BLASTFLETCH } from '../data/talents';
import { bombletEmission, poolBurstEmission, roundEmission, shardEmissionOf } from '../sim/emissions';
import { playerStats, type PlayerStats } from '../sim/stats';
import { reaches, resolveStat, statusEmission, type Emission, type Resolved, type Statted } from '../sim/statResolve';
import { totalsParts } from './gearText';
import { fill, paramValue, statLabel, statValue } from './statSteps';

// What a line changes, before → after (040), pure: every emission a stat line reaches —
// "Burst radius: Bomb 48 → 55.2 px · Bomblet 20 → 23 px · Landmine 24 → 27.6 px · Pool-burst
// 24 → 27.6 px" — or the player's own numbers for a You line; and a rule line in full, its
// times precise and the px its text leaves out. Bases come from the ammo and tag data.

/** Something a line can change: a round, a child or a status, by name, with its stats' bases. */
interface Target {
  id: string;
  name: string;
  /** A shape-tagged round's base: shown only when its change reads differently from the base's. */
  of?: string;
  emission: Emission;
  bases: Partial<Record<StatId, number>>;
}

const named = (id: string): string => itemDef(ammoDef(id).itemId).name;

/** "before → after", the unit written once when both share it: "48 → 55.2 px", "100 → 115". */
function beforeAfter(name: string, before: string, after: string): string {
  const unit = before.match(/ [^\d\s]+$/)?.[0];
  const b = unit && after.endsWith(unit) ? before.slice(0, -unit.length) : before;
  return fill(W.change, { name, before: b, after }).trim();
}

/** Every emission a line can change, in breakdown order. Built once from data. */
function buildTargets(): Target[] {
  const arrow = straightAmmo('arrow');
  const bolt = straightAmmo('ley-bolt');
  const bomb = lobAmmo('bomb');
  const mine = mineAmmo('landmine');
  const shot = (a: typeof arrow) => ({ damage: a.damage, 'fire-rate': TICK_RATE / a.fireTicks, range: a.range, speed: a.speed, knockback: a.knockback });
  const round = (id: string, bases: Target['bases'], of?: string): Target => ({ id, name: named(id), emission: roundEmission(id), bases, ...(of ? { of } : {}) });
  const bombBases = { damage: bomb.burstDamage, 'fire-rate': TICK_RATE / bomb.fireTicks, radius: bomb.burstRadius, range: bomb.maxRange, 'flight-time': bomb.maxRange / (bomb.speed / TICK_RATE) };
  return [
    round('arrow', shot(arrow)),
    round('ley-bolt', shot(bolt)),
    round('ley-bolt+homing', { ...shot(bolt), 'turn-rate': HOMING.turnDegrees, 'lock-radius': HOMING.lockRadius }, 'ley-bolt'),
    round('ley-bolt+split', { ...shot(bolt), shards: SPLIT.shards }, 'ley-bolt'),
    { id: 'shard', name: renderTemplate('{{shard}}'), emission: shardEmissionOf('ley-bolt+split', true), bases: { damage: SPLIT.damage, range: SPLIT.range, speed: SPLIT.speed } },
    round('bomb', bombBases),
    round('bomb+cluster', { ...bombBases, bomblets: CLUSTER.count }, 'bomb'),
    { id: 'bomblet', name: renderTemplate('{{bomblet}}'), emission: bombletEmission('bomb+cluster'), bases: { damage: CLUSTER.damage, radius: CLUSTER.radius } },
    round('landmine', { damage: mine.damage, 'fire-rate': TICK_RATE / mine.fireTicks, radius: mine.radius, range: mine.maxRange, 'arm-time': mine.armTicks }),
    { id: 'pool-burst', name: renderTemplate(CHILD_NAMES['pool-burst']), emission: poolBurstEmission('arrow'), bases: { radius: BLASTFLETCH.burstRadius } },
    { id: 'chill', name: '', emission: statusEmission('chill'), bases: { 'stacks-to-freeze': COLD.stacksToFreeze, duration: COLD.stackTicks, slow: COLD.slowPerStack } },
    { id: 'freeze', name: '', emission: statusEmission('freeze'), bases: { duration: COLD.freezeTicks, immunity: COLD.refreezeTicks } },
    { id: 'boss-freeze', name: KEYWORDS.boss.name, emission: statusEmission('freeze'), bases: { duration: COLD.bossFreezeTicks } },
    { id: 'stun', name: '', emission: statusEmission('stun'), bases: { duration: ROLLBREAKER.stunTicks } },
    { id: 'pool', name: '', emission: statusEmission('pool'), bases: { duration: BLASTFLETCH.poolTicks } },
  ];
}

let targets: Target[] | null = null;

/** The player's own numbers by stat (036's totals and Steady Grip's walk), from playerStats. */
const YOU_STATS: Partial<Record<StatId, (p: PlayerStats) => number>> = {
  'max-health': (p) => p.maxHealth,
  armor: (p) => p.armor,
  'field-regen': (p) => p.regen,
  'move-speed': (p) => p.walkScale,
  'firing-walk': (p) => p.firingWalk,
  'roll-cooldown': (p) => p.rollCooldown,
  'roll-distance': (p) => p.rollDistance,
};

/** What a stat line resolves on each target it reaches, with the stats' sources in `s`. */
export function reached(s: Statted, l: StatLine): { target: Target; resolved: Resolved }[] {
  targets ??= buildTargets();
  return targets.flatMap((t) => {
    const base = t.bases[l.stat];
    if (base === undefined || !reaches(l.scope, t.emission)) return [];
    return [{ target: t, resolved: resolveStat(s, l.stat, t.emission, base) }];
  });
}

/** A stat line's change before → after: on each target it reaches, or the player's own number for a You line. */
export function changeLine(before: Statted, after: Statted, l: StatLine): string {
  const you = YOU_STATS[l.stat];
  if (l.scope === 'you' && you) {
    const [b, a] = [you(playerStats(before)), you(playerStats(after))];
    return `${statLabel(l.stat)}: ${beforeAfter('', statValue(l.stat, b), statValue(l.stat, a))}`;
  }
  // A shape-tagged round shows only when it reads differently from its base (a Cluster bomb's radius is a bomb's).
  const seenBy = new Map<string, string>();
  const afters = reached(after, l);
  const parts = reached(before, l).flatMap(({ target: t, resolved }, i) => {
    const change = beforeAfter('', statValue(l.stat, resolved.final), statValue(l.stat, afters[i]?.resolved.final ?? resolved.final));
    if (t.of !== undefined && seenBy.get(t.of) === change) return [];
    seenBy.set(t.id, change);
    return [`${t.name} ${change}`.trim()];
  });
  const label = statLabel(l.stat, scopeName(l.scope));
  return `${label}: ${parts.length > 0 ? parts.join(LINE_SEP) : W.noChange}`;
}

/** A rule line in full for a breakdown: its text with times to 2 decimals where 1 isn't exact, and the px its text leaves out. */
export function ruleDetail(l: RuleLine): string {
  const rule = RULES[l.rule];
  const hidden = Object.entries(rule.params).flatMap(([name, unit]) => {
    const v = l.params[name];
    if (v === undefined || (unit !== 'px' && unit !== 'px-per-s') || rule.template.includes(`{${name}}`)) return [];
    const label = name in STATS ? renderTemplate(STATS[name as StatId].label) : name;
    return [fill(W.hiddenParam, { label, value: paramValue(v, unit) })];
  });
  return [`${scopeName(l.scope)}: ${ruleText(l, {}, true)}`, ...hidden].join(LINE_SEP);
}

/** The player's totals a piece of gear moves, before → after, in the totals line's words and order (036's gearText). */
export function totalsChange(before: Statted, after: Statted): string {
  const b = totalsParts(playerStats(before));
  const a = totalsParts(playerStats(after));
  const parts = b.flatMap((p, i) => {
    const q = a[i];
    return q && q.value !== p.value ? [beforeAfter(p.label, p.value, q.value)] : [];
  });
  return fill(W.wearing, { changes: parts.length > 0 ? parts.join(LINE_SEP) : W.noChange });
}
