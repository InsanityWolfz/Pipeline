// Stats (039): every number content may change, each with one label and one unit, used by
// talents, affixes, the gear totals line and 040's breakdown. A label may name a keyword or
// child noun only through a `{{id}}` reference (rulesText renders it), never typed by hand.

export type StatId =
  | 'damage'
  | 'fire-rate'
  | 'range'
  | 'speed'
  | 'flight-time'
  | 'arm-time'
  | 'turn-rate'
  | 'lock-radius'
  | 'shards'
  | 'shard-damage'
  | 'radius'
  | 'bomblets'
  | 'knockback'
  | 'stacks-to-freeze'
  | 'slow'
  | 'duration'
  | 'immunity'
  | 'max-health'
  | 'armor'
  | 'field-regen'
  | 'move-speed'
  | 'firing-walk'
  | 'roll-cooldown'
  | 'roll-distance';

/**
 * How a stat's own value reads, for a `flat` change and for totals: `count` whole, `seconds` from ticks to 1 decimal,
 * `hp-per-s` to 1 decimal with "HP/s", `px` whole with "px" (breakdown only), `fraction` as a whole %, `deg-per-tick`
 * as °/s, `per-s` to 1 decimal with "/s".
 */
export type StatUnit = 'count' | 'seconds' | 'hp-per-s' | 'px' | 'fraction' | 'deg-per-tick' | 'per-s';

export interface StatDef {
  id: StatId;
  /** Lower case, as it follows a change: "+10% damage". */
  label: string;
  unit: StatUnit;
  /**
   * Its `add` lines add points to the base, not a share of it (039.10: walk speed while firing, 70% → 80%). Every other
   * stat's `+%` lines add into one pool that multiplies the base.
   */
  points?: true;
}

const stat = (id: StatId, label: string, unit: StatUnit, points?: true): StatDef => ({ id, label, unit, ...(points ? { points } : {}) });

export const STATS: Readonly<Record<StatId, StatDef>> = {
  damage: stat('damage', 'damage', 'count'),
  'fire-rate': stat('fire-rate', 'fire rate', 'per-s'),
  range: stat('range', 'range', 'px'),
  speed: stat('speed', 'speed', 'px'),
  'flight-time': stat('flight-time', 'flight time', 'seconds'),
  'arm-time': stat('arm-time', 'arm time', 'seconds'),
  'turn-rate': stat('turn-rate', 'turn rate', 'deg-per-tick'),
  'lock-radius': stat('lock-radius', 'lock radius', 'px'),
  shards: stat('shards', '{{shard}}s', 'count'),
  'shard-damage': stat('shard-damage', '{{shard}} damage', 'count'),
  radius: stat('radius', 'radius', 'px'),
  bomblets: stat('bomblets', '{{bomblet}}s', 'count'),
  knockback: stat('knockback', '{{knockback}}', 'px'),
  'stacks-to-freeze': stat('stacks-to-freeze', 'stack to {{freeze}}', 'count'),
  slow: stat('slow', 'slow', 'fraction'),
  duration: stat('duration', 'duration', 'seconds'),
  immunity: stat('immunity', 'immunity', 'seconds'),
  'max-health': stat('max-health', 'max health', 'count'),
  armor: stat('armor', 'armor', 'count'),
  'field-regen': stat('field-regen', 'field regen', 'hp-per-s'),
  'move-speed': stat('move-speed', 'move speed', 'fraction'),
  'firing-walk': stat('firing-walk', 'walk speed while firing', 'fraction', true),
  'roll-cooldown': stat('roll-cooldown', 'roll cooldown', 'seconds'),
  'roll-distance': stat('roll-distance', 'roll distance', 'px'),
};
