import type { KeywordId, ParamUnit } from './keywords';
import type { StatId } from './statDefs';

// Content lines (039): what a talent, relic, stage or affix does, as structured data, never
// free text. Each line names exactly one scope (039.1): a keyword (a family, delivery,
// behaviour, damage type, status or ground), `all-ammo` or `you`. A stat line changes one
// stat; a rule line names a rule from RULES, the status, Pool or behaviour it consumes
// (`trigger`) and the one it makes (`creates`), and its numbers. rulesText renders them.

export type Scope = KeywordId | 'all-ammo' | 'you';

/** `add` is a +% into the stat's one additive pool; `mul` a × (relics and keystones only); `flat` in the stat's own unit. */
export type StatOp = 'add' | 'mul' | 'flat';

export interface StatLine {
  scope: Scope;
  stat: StatId;
  op: StatOp;
  value: number;
}

export type RuleId = 'adds' | 'pool-on-burst' | 'pool-strike' | 'shatter' | 'ramp' | 'roll-stun' | 'ward' | 'no-heavy-slow' | 'last-stand';

export interface RuleLine {
  scope: Scope;
  rule: RuleId;
  trigger?: KeywordId;
  creates?: KeywordId;
  params: Readonly<Record<string, number>>;
}

export type ContentLine = StatLine | RuleLine;

export const isRuleLine = (l: ContentLine): l is RuleLine => 'rule' in l;

/**
 * Each rule's text after its scope (`{param}` slots read from the line's params, `{{id}}` keyword references, no
 * digits), and the unit of each param it uses. A rule may carry params its text doesn't show (the Pool-burst's
 * radius: px never show in a summary line). `adds` is a stage's line: `{rounds}` is the families its tag takes. A rule
 * that `consumes` reacts to a keyword (a Burst, a Pool, a Freeze): its line names it as `trigger` (Q19).
 */
export const RULES: Readonly<Record<RuleId, { template: string; params: Readonly<Record<string, ParamUnit>>; consumes?: true }>> = {
  adds: { template: 'added to {rounds}', params: {} },
  'pool-on-burst': { template: 'each {{burst}} leaves a {{pool}} for {duration}', params: { duration: 'ticks' }, consumes: true },
  'pool-strike': { template: 'through a {{pool}}, its next hit deals {damage} damage and {{burst}}s', params: { damage: 'multiplier', radius: 'px' }, consumes: true },
  shatter: {
    consumes: true,
    template: 'a hit on a {{freeze.adj}} enemy ends the {{freeze}}, deals {damage} damage and sends {count} {{shard}}s for {share} its damage',
    params: { damage: 'multiplier', count: 'count', share: 'multiplier', range: 'px', speed: 'px-per-s' },
  },
  ramp: { template: 'held fire ramps up to {rate} fire rate over {ramp}', params: { rate: 'multiplier', ramp: 'ticks' } },
  'roll-stun': { template: 'rolling through an enemy {{stun}}s it for {duration}, once per roll', params: { duration: 'ticks' } },
  ward: { template: 'after {ward} unhit, the next hit is blocked', params: { ward: 'ticks' } },
  'no-heavy-slow': { template: 'no move speed slow from heavy armor', params: { walk: 'multiplier' } },
  'last-stand': { template: 'once a trip, a killing hit leaves you on {health}, invulnerable for {invuln}', params: { health: 'hp', invuln: 'ticks' } },
};
