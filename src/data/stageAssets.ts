import type { DamageType } from './ammo';
import { ROUNDS } from './tags';

// Asset keys for 029's art: the tagged rounds' icons, the rimestone, the Shard
// projectile, the ice over a frozen enemy and the effects. Render draws by
// these keys; the shapes are in src/data/art/stages.ts.

export const STAGE_SPRITES = {
  itemRimestone: 'item-rimestone',
  /** A Shard in flight (029), pointing right, and its shadow. */
  shard: 'shard',
  shardShadow: 'shard-shadow',
  /** The flash where a Split round bursts. */
  splitFlash: 'split-flash',
  /** Ice round a frozen enemy, whole and then cracking in its last ticks; bigger for a boss. */
  iceCase: 'ice-case',
  iceCaseCracked: 'ice-case-cracked',
  iceCaseLarge: 'ice-case-large',
  iceCaseLargeCracked: 'ice-case-large-cracked',
  /** 060: flames round a burning enemy, `BURN_FLAMES.frames` frames (`burn-flames/0` …). */
  burnFlames: 'burn-flames',
} as const;

/** A tagged round's icon frame: `icon-arrow-frost`. */
export const roundIcon = (round: string): string => `icon-${round.replace(/\+/g, '-')}`;

/** Every tagged round's icon, by round id. */
export const ROUND_ICONS: Readonly<Record<string, string>> = Object.fromEntries(ROUNDS.map((r) => [r, roundIcon(r)]));

/** The ice casing cracks over a frozen enemy's last this-many ticks. */
export const ICE_CRACK_TICKS = 20;

/**
 * 060: flames on a burning enemy, an overlay like the ice on a frozen one: `frames` frames shown `frameMs` apart (out
 * of step from enemy to enemy by `phaseMs` an id), drawn `big` times as large on a boss, at `alpha`. Its anchor sits on the enemy's feet.
 */
export const BURN_FLAMES = { key: STAGE_SPRITES.burnFlames, frames: 3, frameMs: 110, phaseMs: 47, big: 1.6, alpha: 0.9 } as const;

/** A burn-flames frame by index: `burn-flames/1`. */
export const burnFlamesFrame = (i: number): string => `${BURN_FLAMES.key}/${i % BURN_FLAMES.frames}`;

/** A chilled enemy's tint: toward this palette colour, `perStack` deeper with each chill stack. */
export const CHILL_TINT = { color: 'water-light', perStack: 0.18 } as const;

/**
 * How a tagged round looks in flight (029), by tag: an image tint (palette id) and a trail along its last `points`
 * drawn positions, `width` px in `color` with a bright `core` (TRAIL_SHAPE), fading from `alpha` at the round to nothing. A frost arrow is pale ice with a short frost
 * trail; a homing bolt leaves a long bright cyan trail that shows it bending.
 */
/** Every trail: its core is this share of its width, and it tapers from this share of its width at the tail to all of it at the round. */
export const TRAIL_SHAPE = { core: 1 / 3, tail: 0.4 } as const;

export const ROUND_LOOKS: Readonly<Record<string, { tint?: string; trail?: { color: string; core: string; points: number; width: number; alpha: number } }>> = {
  frost: { tint: 'foam', trail: { color: 'water-light', core: 'snow', points: 7, width: 3, alpha: 0.75 } },
  // 060: a fire round glows ember with a short flickering flame trail.
  fire: { tint: 'cinder-light', trail: { color: 'flame-dark', core: 'cinder-light', points: 8, width: 3.2, alpha: 0.8 } },
  // 064: a lightning round crackles pale cyan with a short bright violet-white trail.
  lightning: { tint: 'cyan-glow', trail: { color: 'storm-glow', core: 'snow', points: 6, width: 2.6, alpha: 0.85 } },
  homing: { trail: { color: 'cyan', core: 'cyan-glow', points: 20, width: 4, alpha: 0.9 } },
};

/** 054: a Shard's short trail in flight (a Cold one's in frost, 060: a Fire one's in flame, 064: a Lightning one's in storm violet), in ROUND_LOOKS' style, so a star shot's Shards read. */
export const SHARD_TRAILS = {
  ley: { color: 'cyan', core: 'cyan-glow', points: 6, width: 2.5, alpha: 0.85 },
  cold: { color: 'water-light', core: 'snow', points: 6, width: 2.5, alpha: 0.8 },
  fire: { color: 'flame-dark', core: 'cinder-light', points: 6, width: 2.5, alpha: 0.8 },
  lightning: { color: 'storm-glow', core: 'snow', points: 6, width: 2.2, alpha: 0.85 },
} as const;

/** The Split's flash (029): grows from `from` to `to` scale and fades over `ms`, at shot height. */
export const SPLIT_FLASH = { ms: 280, from: 1, to: 2.2 } as const;

/** 039.15: a Burst of an element flashes in its colours, its flash tinted toward this palette colour (a Cold Burst frost, 060: a Fire one ember); a Physical one is drawn as it is. */
export const BURST_TINTS: Readonly<Partial<Record<DamageType, string>>> = { cold: 'water-light', fire: 'cinder', lightning: 'cyan-glow' };
