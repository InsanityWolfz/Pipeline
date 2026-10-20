// The talent tree (037): a small constellation from a centre start, in five lanes
// (Arrows, Bombs, Ley, Survival and Tube), with three keystones: two combos between ammo
// and one lane capstone. One point per node; the start is always taken and free. What a
// node does is its content lines (039), read through resolveStat (src/sim/statResolve.ts);
// keystone rules are in src/sim/keystones.ts. The node list is spec 037's, kept as written for the first
// playtest; Shaun edits it after. Ids are the spec's in lower case (kebab-case data ids).

import type { ContentLine, Scope, StatLine } from './lines';
import type { StatId } from './statDefs';

export type TalentLane = 'centre' | 'arrows' | 'bombs' | 'ley' | 'survival' | 'tube';

export type KeystoneRule = 'blastfletch' | 'shatterpoint' | 'overpressure';

export interface TalentDef {
  id: string;
  name: string;
  lane: TalentLane;
  kind: 'start' | 'minor' | 'keystone';
  /** Where it sits on the panel, px from the constellation's centre (y down). */
  pos: { x: number; y: number };
  /** The nodes it links to (links go both ways). */
  links: readonly string[];
  /** What it does (039), each line naming one scope; rulesText renders them for the panel's hover. */
  lines: readonly ContentLine[];
  /** A keystone's own rule, for its icon (its lines are what the sim reads). */
  keystone?: KeystoneRule;
}

/** The centre start's id: always taken, costs nothing. */
export const TALENT_START = 'start';

/** Talent points a node costs (037: one each; the start is free). */
export const TALENT_POINT_COST = 1;

/** Each lane's direction from the centre on the panel, degrees (0 right, −90 up): Arrows up, Ley up-right, Tube down-right, Survival down-left, Bombs up-left. */
export const LANE_ANGLES: Readonly<Record<Exclude<TalentLane, 'centre'>, number>> = { arrows: -90, ley: -18, tube: 54, survival: 126, bombs: 198 };

/** Each lane's colour on the panel (palette ids). */
export const LANE_COLORS: Readonly<Record<TalentLane, string>> = { centre: 'snow', arrows: 'rust-light', bombs: 'cinder', ley: 'cyan', survival: 'leaf-light', tube: 'brass-light' };

/** How far out each step of a lane sits, px; keystones sit on the outer ring. */
const STEPS = [36, 64, 92, 120] as const;

/** A point `step` steps out along a direction, px from the centre. */
function at(angle: number, step: 0 | 1 | 2 | 3): { x: number; y: number } {
  const a = (angle * Math.PI) / 180;
  const r = STEPS[step];
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

const L = LANE_ANGLES;
/** Between two lanes' directions. */
const between = (a: number, b: number): number => (a + b) / 2;

const node = (id: string, name: string, lane: TalentLane, pos: { x: number; y: number }, links: readonly string[], kind: TalentDef['kind'] = 'minor', keystone?: KeystoneRule): TalentDef => ({
  id,
  name,
  lane,
  kind,
  pos,
  links,
  lines: LINES[id] ?? [],
  ...(keystone ? { keystone } : {}),
});

const add = (scope: Scope, stat: StatId, value: number): StatLine => ({ scope, stat, op: 'add', value });
const flat = (scope: Scope, stat: StatId, value: number): StatLine => ({ scope, stat, op: 'flat', value });

/**
 * Blastfletch: a Bomb Burst leaves a Pool over its area for `poolTicks`; an Arrow flying through it gains
 * `damageScale` damage and Bursts `burstRadius` px round its next hit, which spends the Pool. The Pool-burst is of the
 * arrow's damage type (039.3: children inherit it; a Frost arrow's is Cold).
 */
export const BLASTFLETCH = { poolTicks: 20, damageScale: 1.5, burstRadius: 24 } as const;

/**
 * Shatterpoint: a Ley round that hits a Frozen enemy ends the Freeze for `damageScale` damage, and `shards` Shards
 * fly from it for `shardScale` of the bolt's damage each, of the bolt's damage type (039.3: a Frost ley bolt's are
 * Cold), `range` px at `speed` px/s (as a Split's do).
 */
export const SHATTERPOINT = { damageScale: 2, shards: 4, shardScale: 0.5, range: 64, speed: 360 } as const;

/** Overpressure: holding fire ramps the fire rate up to ×`rate` over `rampTicks` (039, Q13: a keystone multiplies); releasing fire resets it. */
export const OVERPRESSURE = { rampTicks: 120, rate: 1.25 } as const;

/** Each node's lines (039): a stat line per stat it changes, a rule line per keystone rule. */
const LINES: Readonly<Record<string, readonly ContentLine[]>> = {
  a1: [add('arrow', 'damage', 0.1)],
  a2: [add('arrow', 'fire-rate', 0.1)],
  // Rimecraft: a Freeze one Chill sooner, and half a second longer (a boss's shorter one too).
  a3: [flat('chill', 'stacks-to-freeze', -1), flat('freeze', 'duration', 30)],
  b1: [add('bomb', 'damage', 0.1)],
  b2: [add('burst', 'radius', 0.15)],
  b3: [add('lob', 'flight-time', -0.25)],
  l1: [add('ley', 'damage', 0.1)],
  l2: [add('homing', 'turn-rate', 0.3)],
  l3: [flat('split', 'shards', 2)],
  t1: [add('all-ammo', 'fire-rate', 0.08)],
  // 039.10: points of walk speed while firing, 70% to 80%.
  t2: [add('you', 'firing-walk', 0.1)],
  t3: [add('all-ammo', 'damage', 0.06)],
  s1: [flat('you', 'max-health', 15)],
  s2: [flat('you', 'field-regen', 0.5)],
  s3: [flat('you', 'armor', 3)],
  s4: [add('you', 'move-speed', 0.05)],
  k1: [
    { scope: 'bomb', rule: 'pool-on-burst', trigger: 'burst', creates: 'pool', params: { duration: BLASTFLETCH.poolTicks } },
    { scope: 'arrow', rule: 'pool-strike', trigger: 'pool', creates: 'burst', params: { damage: BLASTFLETCH.damageScale, radius: BLASTFLETCH.burstRadius } },
  ],
  k2: [
    {
      scope: 'ley',
      rule: 'shatter',
      trigger: 'freeze',
      params: { damage: SHATTERPOINT.damageScale, count: SHATTERPOINT.shards, share: SHATTERPOINT.shardScale, range: SHATTERPOINT.range, speed: SHATTERPOINT.speed },
    },
  ],
  k3: [{ scope: 'all-ammo', rule: 'ramp', params: { rate: OVERPRESSURE.rate, ramp: OVERPRESSURE.rampTicks } }],
};

export const TALENT_LIST: readonly TalentDef[] = [
  node('start', 'Attunement', 'centre', { x: 0, y: 0 }, ['a1', 'b1', 'l1', 't1', 's1'], 'start'),
  node('a1', "Fletcher's Eye", 'arrows', at(L.arrows, 0), ['start', 'a2']),
  node('a2', 'Quick Nock', 'arrows', at(L.arrows, 1), ['a1', 'a3']),
  node('a3', 'Rimecraft', 'arrows', at(L.arrows, 2), ['a2', 'k1', 'k2']),
  node('b1', 'Black Powder', 'bombs', at(L.bombs, 0), ['start', 'b2']),
  node('b2', 'Wide Casing', 'bombs', at(L.bombs, 1), ['b1', 'b3']),
  node('b3', 'Swift Arc', 'bombs', at(L.bombs, 2), ['b2', 'k1']),
  node('l1', 'Attuned Crystal', 'ley', at(L.ley, 0), ['start', 'l2']),
  node('l2', "Seeker's Lens", 'ley', at(L.ley, 1), ['l1', 'l3']),
  node('l3', 'Splinter', 'ley', at(L.ley, 2), ['l2', 'k2']),
  node('t1', 'Oiled Breech', 'tube', at(L.tube, 0), ['start', 't2']),
  node('t2', 'Steady Grip', 'tube', at(L.tube, 1), ['t1', 't3']),
  node('t3', 'Hard Bore', 'tube', at(L.tube, 2), ['t2', 'k3']),
  node('s1', 'Tough Hide', 'survival', at(L.survival, 0), ['start', 's2']),
  node('s2', 'Mending', 'survival', at(L.survival, 1), ['s1', 's3']),
  node('s3', 'Braced', 'survival', at(L.survival, 2), ['s2', 's4']),
  node('s4', 'Fleet', 'survival', at(L.survival, 3), ['s3']),
  node('k1', 'Blastfletch', 'arrows', at(between(L.arrows, L.bombs - 360), 3), ['a3', 'b3'], 'keystone', 'blastfletch'),
  node('k2', 'Shatterpoint', 'arrows', at(between(L.arrows, L.ley), 3), ['a3', 'l3'], 'keystone', 'shatterpoint'),
  node('k3', 'Overpressure', 'tube', at(L.tube, 3), ['t3'], 'keystone', 'overpressure'),
];

/** Every node by id. */
export const TALENTS: Readonly<Record<string, TalentDef>> = Object.fromEntries(TALENT_LIST.map((t) => [t.id, t]));

export function talentDef(id: string): TalentDef {
  const def = TALENTS[id];
  if (!def) throw new Error(`Unknown talent '${id}'`);
  return def;
}
