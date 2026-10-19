import { ROUNDS } from './tags';

// Asset keys for 029's art: the tagged rounds' icons, the rime shard, the star
// shard projectile, the ice over a frozen enemy and the effects. Render draws by
// these keys; the shapes are in src/data/art/stages.ts.

export const STAGE_SPRITES = {
  itemRimeShard: 'item-rime-shard',
  /** A star round's shard in flight (029), pointing right, and its shadow. */
  starShard: 'star-shard',
  starShardShadow: 'star-shard-shadow',
  /** The flash where a star round bursts. */
  starBurst: 'star-burst',
  /** Ice round a frozen enemy, whole and then cracking in its last ticks; bigger for a boss. */
  iceCase: 'ice-case',
  iceCaseCracked: 'ice-case-cracked',
  iceCaseLarge: 'ice-case-large',
  iceCaseLargeCracked: 'ice-case-large-cracked',
} as const;

/** A tagged round's icon frame: `icon-arrow-frost`. */
export const roundIcon = (round: string): string => `icon-${round.replace(/\+/g, '-')}`;

/** Every tagged round's icon, by round id. */
export const ROUND_ICONS: Readonly<Record<string, string>> = Object.fromEntries(ROUNDS.map((r) => [r, roundIcon(r)]));

/** The ice casing cracks over a frozen enemy's last this-many ticks. */
export const ICE_CRACK_TICKS = 20;

/** A chilled enemy's tint: toward this palette colour, `perStack` deeper with each chill stack. */
export const CHILL_TINT = { color: 'water-light', perStack: 0.18 } as const;
