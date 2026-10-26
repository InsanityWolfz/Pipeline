import type { KeywordGroup, KeywordId } from './keywords';
import type { Scope } from './lines';
import type { StatId } from './statDefs';
import type { TalentLane } from './talents';
import { TALENT_PANEL } from './talentAssets';

// The legibility UI (040): the hover tablet's sizes and colours, the keyword chips, the T
// panel's Build tab and the glossary, and every word they add around 039's generated text.
// Templates follow 039's rules: `{slot}` for a number or a list, `{{id}}` for a keyword or
// child noun (rulesText renders its name), and no digits. Px are the 640×360 view's; colours
// are palette ids. Chip colours, tabs and tablets are pending Shaun's review by eye.

/** A chip's group: a keyword's own, or one of the two plain scopes (039.1). */
export type ChipGroup = KeywordGroup | 'all-ammo' | 'you';

/**
 * The hover tablet (040): a summary at most `summaryW` px wide, a breakdown (Shift) at most `breakdownW` px wide and
 * `maxLines` lines of `lineHeight` px, `pad` px in, `gap` px beside what it describes and at least `edge` px inside
 * the view. It stays `graceMs` after the cursor leaves its source, so its chips can be reached (040.1).
 */
export const TIP = {
  summaryW: 200,
  /** A summary's most drawn rows: its name (and chip) rows, its rules lines and the hint (040). */
  summaryRows: 4,
  breakdownW: 280,
  maxLines: 16,
  lineHeight: 10,
  /** The name row is a chip's height and a px. */
  nameRow: 12,
  pad: 4,
  gap: 4,
  edge: 4,
  graceMs: 200,
  /** Chips start this far after the name, `CHIP.gap` apart. */
  nameGap: 5,
  colors: { text: 'snow', dim: 'rock-light', lit: 'cyan', when: 'brass-light', hint: 'rock-light' },
  /** A line cut at the bottom of a full tablet ends with this. */
  more: '…',
} as const;

/** A keyword chip (040): a small rounded tablet, its name in the body face (the `chip` style), filled in its group's colour. */
export const CHIP = {
  h: 10,
  padX: 3,
  radius: 3,
  /** The top of its capitals, px below the chip's top. */
  textY: 2,
  gap: 3,
  edge: 'ink',
  alpha: 0.95,
  colors: {
    delivery: 'brass-dark',
    behaviour: 'cyan-deep',
    'damage-type': 'water-deep',
    status: 'wisp-dark',
    ground: 'leaf-dark',
    family: 'rust-dark',
    trait: 'iron',
    'all-ammo': 'rock-dark',
    you: 'rock-dark',
  } satisfies Record<ChipGroup, string>,
} as const;

/** The T panel's tabs (040): `TALENT_PANEL.tabs` (src/data/talentAssets.ts), named here beside the other 040 sizes. */
export const TALENT_TABS = TALENT_PANEL.tabs;

export type TalentTab = (typeof TALENT_TABS.tabs)[number]['id'];

/**
 * The Build tab (040): under the header line, a header per family then a row per known round, `rowH` px each (icon,
 * name, shape and element chips, final damage, shots/s and "N sources"); a second column only when one doesn't fit
 * (031's rule). X are px from the column's left (`right*` from its right edge). In the Build tab the panel moves left
 * so a round's breakdown sits beside it inside the view.
 */
export const BUILD_TAB = {
  top: 20,
  rowH: 14,
  columns: 2,
  columnGap: 8,
  iconScale: 0.75,
  name: { x: 15, y: 3 },
  chipsY: 2,
  /**
   * A row's fields from its column's right edge: "N sources" `sourcesW` wide, shots/s `rateW`, damage `damageW`, the
   * chips `chipsW` before them, `gap` apart; the name takes what's left after the icon. A column narrower than
   * `compact.below` (two columns) shows the sources as a count `compact.sourcesW` wide and leaves the chips to the
   * row's breakdown.
   */
  fields: { sourcesW: 44, rateW: 34, damageW: 26, chipsW: 72, gap: 4 },
  compact: { below: 200, sourcesW: 14 },
  header: { x: 0, y: 3, color: 'brass-light' },
  hover: { color: 'brass', alpha: 0.18 },
  /** The panel's left edge in the Build tab: the panel and the breakdown beside it, centred together. */
  breakdownGap: 4,
} as const;

/** The glossary entry (040): a tablet at most `w` × `h` px, centred above any panel. */
export const GLOSSARY = { w: 260, h: 170 } as const;

/** Each chip group's name, as the glossary shows it beside the name. */
export const GROUP_NAMES: Readonly<Record<ChipGroup, string>> = {
  delivery: 'Delivery',
  behaviour: 'Behaviour',
  'damage-type': 'Damage type',
  status: 'Status',
  ground: 'Ground',
  family: 'Family',
  trait: 'Trait',
  'all-ammo': 'Scope',
  you: 'Scope',
};

/** Each talent lane's name (037's), as a talent's breakdown shows it; the ammo lanes are their family's name. */
export const LANE_NAMES: Readonly<Record<TalentLane, string>> = { centre: 'Centre', arrows: '{{arrow}}s', bombs: '{{bomb}}s', ley: '{{ley}}', survival: 'Survival', tube: 'Tube' };

/** What a talent costs, in words (its points are the sim's TALENT_POINT_COST; the start is free). */
export const TALENT_COST = { point: 'point', points: 'points', free: 'free' } as const;

/**
 * The words around the generated lines. Summary: a Shot round's "16.2 dmg · 4.0/s", a Lob or Mine round's Burst; then
 * Cold's Freeze hits, Split's Shards, Cluster's Bomblets, a Mine's arm time; the bonus hint (040.7). Breakdown: a
 * stat's steps, the interval, the ramp and the "when" lines, Linked. Glossary: its sections.
 */
export const LEGIBILITY_WORDS = {
  shotLine: '{damage} dmg · {rate}',
  burstLine: '{damage} {{burst}} dmg · {rate}',
  /** A Burst line's short form, when the whole line would run the summary past its rows (its Burst chip already says it's damage). */
  burstShort: '{damage} {{burst}} · {rate}',
  freezeIn: '{{freeze}} in {hits} hits',
  /** 062: a tiered round's material, and its × on every hit's damage. */
  tierDamage: '{tier} {mul} dmg',
  /** 060: a Fire round's burn, each second and how long. */
  burns: 'burns {damage}/s for {time}',
  /** 062: a burn's short form, when a tiered round's summary would run past its rows (its time is in the breakdown). */
  burnsShort: 'burns {damage}/s',
  /** 064: a Lightning round's chain: how many arcs, and each arc's damage. */
  arcs: 'arcs {count}× for {damage}',
  shards: '{count} {{shard}}s × {damage}',
  bomblets: '{count} {{bomblet}}s × {damage}',
  arms: 'arms in {time}',
  bonus: '{count} bonus · hold Shift',
  bonuses: '{count} bonuses · hold Shift',
  reaches: 'Reaches: {rounds}',
  reachesNothing: 'Reaches: nothing you have yet',
  /** "Reaches:" as a count, when the list would run the summary past its rows (the list is in the breakdown). */
  reachesOne: 'Reaches: {count} round',
  reachesCount: 'Reaches: {count} rounds',
  takes: 'Takes: {rounds}',
  takesNothing: 'Takes: none of your rounds yet',
  /** "Takes:" as a count, when the list would run the summary past its rows (the breakdown lists every round). */
  takesOne: 'Takes: one of your rounds',
  takesCount: 'Takes: {count} of your rounds',
  gearHead: '{rarity} {slot} · armor {armor}',
  /** A breakdown's stat: its steps, then "= final". */
  interval: 'one every {time}',
  ramp: '× up to {rate} while held {ramp} = {final}',
  linked: 'Linked: ',
  lane: 'Lane: {lane} · {cost}',
  cost: 'Cost: {cost}',
  gives: '{from} → {to}',
  wearing: 'Wearing it: {changes}',
  noChange: 'no change',
  changes: '{label}: {list}',
  change: '{name} {before} → {after}',
  /** A rule's param its text doesn't show (px): "radius 24 px". */
  hiddenParam: '{label} {value}',
  sources: 'Sources: ',
  payoffs: 'Payoffs: ',
  stats: 'Changes: ',
  noneYet: 'None yet',
  more: '(more: None yet)',
  yours: '(yours: {value})',
  noStats: 'nothing yet',
  /** A Build tab row's count of what changes it. */
  /** 062: a Build tab row's stone round, marked with the tiers of it also known (they share its row). */
  rowTiers: '{name} · {tiers}',
  rowSource: '{count} source',
  rowSources: '{count} sources',
  /** Every gear affix, as one payoff of You. */
  affixes: 'gear affixes',
} as const;

/**
 * The "when" lines (040): a conditional × after a round's damage, by the rule that gives it: "×1.5 through a Pool
 * (Blastfletch) = 17.4", "×2 on a Frozen enemy (Shatterpoint) = 28".
 */
export const WHEN_LINES: Readonly<Partial<Record<'pool-strike' | 'shatter', string>>> = {
  'pool-strike': '{mul} through a {{pool}} ({source}) = {final}',
  shatter: '{mul} on a {{freeze.adj}} enemy ({source}) = {final}',
};

/** Child emissions a breakdown names (Shard and Bomblet are 039's nouns): the Pool-burst. */
export const CHILD_NAMES = { 'pool-burst': '{{pool}}-burst' } as const;

/**
 * Where a keyword param's number resolves (040): its stat, on the round (default), its Shards or its Bomblets. A
 * status's params resolve on the status, as does a param marked `status` (060: Fire's burn, which the sim reads on Fire alone).
 */
export interface ParamStat {
  stat: StatId;
  on?: 'shard' | 'bomblet' | 'status';
}

/**
 * Which stat each keyword param is (040), so a breakdown and the glossary's "yours:" show the final number through
 * resolveStat. A param without an entry is fixed (Cold's chill per hit, Cluster's delay and distance).
 */
export const PARAM_STATS: Readonly<Partial<Record<KeywordId, Readonly<Record<string, ParamStat>>>>> = {
  shot: { range: { stat: 'range' }, speed: { stat: 'speed' } },
  lob: { range: { stat: 'range' } },
  mine: { range: { stat: 'range' }, arm: { stat: 'arm-time' } },
  homing: { lock: { stat: 'lock-radius' }, turn: { stat: 'turn-rate' } },
  split: { count: { stat: 'shards' }, damage: { stat: 'damage', on: 'shard' } },
  burst: { damage: { stat: 'damage' }, radius: { stat: 'radius' } },
  cluster: { count: { stat: 'bomblets' }, damage: { stat: 'damage', on: 'bomblet' }, radius: { stat: 'radius', on: 'bomblet' } },
  knockback: { push: { stat: 'knockback' } },
  fire: { duration: { stat: 'duration', on: 'status' }, radius: { stat: 'spread-radius', on: 'status' } },
  lightning: { range: { stat: 'chain-range', on: 'status' }, chains: { stat: 'chains', on: 'status' } },
  chill: { stacks: { stat: 'stacks-to-freeze' }, slow: { stat: 'slow' }, duration: { stat: 'duration' } },
  freeze: { duration: { stat: 'duration' }, bossDuration: { stat: 'duration' }, immune: { stat: 'immunity' } },
  stun: { duration: { stat: 'duration' } },
  pool: { duration: { stat: 'duration' } },
};

/** The scopes a chip can name: a keyword, All ammo or You. */
export type ChipId = Scope;
