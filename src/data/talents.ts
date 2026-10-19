// The talent tree (037): a small constellation from a centre start, in five lanes
// (Arrows, Bombs, Ley, Survival and Tube), with three keystones: two combos between ammo
// and one lane capstone. One point per node; the start is always taken and free. Effects
// are data, summed into playerStats (src/sim/stats.ts); keystone rules are in
// src/sim/keystones.ts. The node list is spec 037's, kept as written for the first
// playtest; Shaun edits it after. Ids are the spec's in lower case (kebab-case data ids).

import type { DamageType } from './ammo';

export type TalentLane = 'centre' | 'arrows' | 'bombs' | 'ley' | 'survival' | 'tube';

/** The ammo a damage or fire-rate effect reaches: a base ammo (its tagged rounds too), or all of them. */
export type AmmoScope = 'arrow' | 'bomb' | 'ley-bolt' | 'all';

export type KeystoneRule = 'blastfletch' | 'shatterpoint' | 'overpressure';

/** What a node does, as data. Fractions are added to the stat's multiplier (+0.1 is +10%). */
export type TalentEffect =
  | { kind: 'none' }
  | { kind: 'damage'; ammo: AmmoScope; value: number }
  | { kind: 'fire-rate'; ammo: AmmoScope; value: number }
  /** Cold (029): `hits` fewer cold hits to freeze, the freeze `ticks` longer. */
  | { kind: 'freeze'; hits: number; ticks: number }
  | { kind: 'blast-radius'; value: number }
  /** A bomb's flight takes this share less time. */
  | { kind: 'lob-time'; value: number }
  | { kind: 'homing-turn'; value: number }
  /** Star shards (029) added to the burst. */
  | { kind: 'star-shards'; value: number }
  /** Added to the walk multiplier while firing (016's 0.7). */
  | { kind: 'firing-walk'; value: number }
  | { kind: 'max-health'; value: number }
  /** Field regen, HP/s: a whole number of HEAL_RATE_STEP (030), one of the rates that never stack. */
  | { kind: 'regen'; value: number }
  | { kind: 'armor'; value: number }
  | { kind: 'move-speed'; value: number }
  | { kind: 'keystone'; rule: KeystoneRule };

export interface TalentDef {
  id: string;
  name: string;
  lane: TalentLane;
  kind: 'start' | 'minor' | 'keystone';
  /** Where it sits on the panel, px from the constellation's centre (y down). */
  pos: { x: number; y: number };
  /** The nodes it links to (links go both ways). */
  links: readonly string[];
  effect: TalentEffect;
  /** Its effect in a line, for the panel's hover text. */
  text: string;
}

/** The centre start's id: always taken, costs nothing. */
export const TALENT_START = 'start';

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

const node = (id: string, name: string, lane: TalentLane, pos: { x: number; y: number }, links: readonly string[], effect: TalentEffect, text: string, kind: TalentDef['kind'] = 'minor'): TalentDef => ({
  id,
  name,
  lane,
  kind,
  pos,
  links,
  effect,
  text,
});

export const TALENT_LIST: readonly TalentDef[] = [
  node('start', 'Attunement', 'centre', { x: 0, y: 0 }, ['a1', 'b1', 'l1', 't1', 's1'], { kind: 'none' }, 'The centre: always yours.', 'start'),
  node('a1', "Fletcher's Eye", 'arrows', at(L.arrows, 0), ['start', 'a2'], { kind: 'damage', ammo: 'arrow', value: 0.1 }, 'Arrow damage +10%'),
  node('a2', 'Quick Nock', 'arrows', at(L.arrows, 1), ['a1', 'a3'], { kind: 'fire-rate', ammo: 'arrow', value: 0.1 }, 'Arrow fire rate +10%'),
  node('a3', 'Rimecraft', 'arrows', at(L.arrows, 2), ['a2', 'k1', 'k2'], { kind: 'freeze', hits: 1, ticks: 30 }, 'Frost arrows freeze after 1 fewer hit, and the freeze lasts +0.5 s'),
  node('b1', 'Black Powder', 'bombs', at(L.bombs, 0), ['start', 'b2'], { kind: 'damage', ammo: 'bomb', value: 0.1 }, 'Bomb damage +10%'),
  node('b2', 'Wide Casing', 'bombs', at(L.bombs, 1), ['b1', 'b3'], { kind: 'blast-radius', value: 0.15 }, 'Blast radius +15%'),
  node('b3', 'Short Fuse', 'bombs', at(L.bombs, 2), ['b2', 'k1'], { kind: 'lob-time', value: 0.25 }, 'Bombs reach their target 25% sooner'),
  node('l1', 'Attuned Crystal', 'ley', at(L.ley, 0), ['start', 'l2'], { kind: 'damage', ammo: 'ley-bolt', value: 0.1 }, 'Ley bolt damage +10%'),
  node('l2', "Seeker's Lens", 'ley', at(L.ley, 1), ['l1', 'l3'], { kind: 'homing-turn', value: 0.3 }, 'Homing ley bolts turn 30% sharper'),
  node('l3', 'Splinter', 'ley', at(L.ley, 2), ['l2', 'k2'], { kind: 'star-shards', value: 2 }, 'Star ley bolts burst into 7 shards, not 5'),
  node('t1', 'Oiled Breech', 'tube', at(L.tube, 0), ['start', 't2'], { kind: 'fire-rate', ammo: 'all', value: 0.08 }, 'Fire rate +8%, all ammo'),
  node('t2', 'Steady Grip', 'tube', at(L.tube, 1), ['t1', 't3'], { kind: 'firing-walk', value: 0.1 }, 'The walk slow while firing eases from ×0.7 to ×0.8'),
  node('t3', 'Hard Bore', 'tube', at(L.tube, 2), ['t2', 'k3'], { kind: 'damage', ammo: 'all', value: 0.06 }, 'Damage +6%, all ammo'),
  node('s1', 'Tough Hide', 'survival', at(L.survival, 0), ['start', 's2'], { kind: 'max-health', value: 15 }, 'Max health +15'),
  node('s2', 'Mending', 'survival', at(L.survival, 1), ['s1', 's3'], { kind: 'regen', value: 0.5 }, 'Health regen +0.5 HP/s in the field'),
  node('s3', 'Braced', 'survival', at(L.survival, 2), ['s2', 's4'], { kind: 'armor', value: 3 }, 'Armor +3'),
  node('s4', 'Fleet', 'survival', at(L.survival, 3), ['s3'], { kind: 'move-speed', value: 0.05 }, 'Move speed +5%'),
  node('k1', 'Blastfletch', 'arrows', at(between(L.arrows, L.bombs - 360), 3), ['a3', 'b3'], { kind: 'keystone', rule: 'blastfletch' }, "A bomb's blast charges its ground: an arrow through it hits +50% and bursts on the next enemy", 'keystone'),
  node('k2', 'Shatterpoint', 'arrows', at(between(L.arrows, L.ley), 3), ['a3', 'l3'], { kind: 'keystone', rule: 'shatterpoint' }, 'A ley bolt shatters a frozen enemy for double damage, bursting 4 ice shards', 'keystone'),
  node('k3', 'Overpressure', 'tube', at(L.tube, 3), ['t3'], { kind: 'keystone', rule: 'overpressure' }, 'Holding fire ramps the fire rate up to +25% over 2 s', 'keystone'),
];

/** Every node by id. */
export const TALENTS: Readonly<Record<string, TalentDef>> = Object.fromEntries(TALENT_LIST.map((t) => [t.id, t]));

export function talentDef(id: string): TalentDef {
  const def = TALENTS[id];
  if (!def) throw new Error(`Unknown talent '${id}'`);
  return def;
}

/** The keystones' damage type (only physical and cold exist in Milestone 1). */
const PHYSICAL: DamageType = 'physical';

/**
 * Blastfletch: a player bomb's blast leaves its area charged for `chargeTicks`; an arrow flying through it gains
 * `damageScale` damage and bursts in a `burstRadius` px blast of `damageType` on the next enemy it hits, which spends the charge.
 */
export const BLASTFLETCH = { chargeTicks: 20, damageScale: 1.5, burstRadius: 24, damageType: PHYSICAL } as const;

/**
 * Shatterpoint: a ley bolt that hits a frozen enemy ends the freeze for `damageScale` damage, and `shards` ice shards
 * burst from it for `shardScale` of the bolt's damage each, of `damageType` (physical: cold shards would chill their
 * way to more freezes, a chain the spec never asked for), flying `range` px at `speed` px/s (as star shards do).
 */
export const SHATTERPOINT = { damageScale: 2, shards: 4, shardScale: 0.5, range: 64, speed: 360, projectile: 'ice-shard', damageType: PHYSICAL } as const;

/** Overpressure: holding fire ramps the fire rate up to +`maxBonus` over `rampTicks`; releasing fire resets it. */
export const OVERPRESSURE = { rampTicks: 120, maxBonus: 0.25 } as const;
