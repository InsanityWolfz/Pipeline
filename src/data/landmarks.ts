import { CACHE_RARE } from './drops';
import type { DropTable } from './enemyBase';
import { GROTTO, GROTTO_GROUP } from './grotto';
import type { TileStamp } from './hollows';
import { EMBERWORKS_SITES } from './emberworksSites';
import { STORMCROWN_SITES } from './stormcrownSites';
import { HOLLOWS_SITES } from './hollowsSites';
import { SITES } from './landmarkSites';
import { SPRINGS } from './springs';
import type { Feature, NodePlacement, TilePos, TileRect } from './tiles';

// Landmarks (032): places worth finding, stamped onto the fixed map over the generated
// terrain. Each is hidden until any part of its area comes into view, then stays on the
// minimap; the first sighting is recorded (037 turns it into XP). The four resource
// sites and the Ruined Cache are in landmarkSites.ts; the Frozen Grotto is 029's and the
// springs are 030's, folded in here without moving. Tile coordinates throughout; 034 may
// shift every tile by +40 for Region 2, and did, so positions live only in data.

/** `ruin`: a landmark that is only a place (034's Broken Aqueduct). */
export type LandmarkKind = 'resource-site' | 'frozen-grotto' | 'ley-springs' | 'ruined-cache' | 'ruin';

/** A landmark's minimap icon (landmarkAssets' `MAP_ICONS`). */
export type LandmarkMarker = 'site' | 'grotto' | 'spring' | 'cache' | 'aqueduct' | 'river' | 'bridge';

/** A guard placed by hand; its group is its landmark's id. */
export interface GuardPlacement {
  readonly enemyId: string;
  readonly tx: number;
  readonly ty: number;
  /** 049: this guard is always its pack's champion (the Husk Hive's), named with the seeded RNG; such a pack draws no random one. */
  readonly champion?: true;
}

/** A resource site's ley pylon: its tile, the claim's site id, and the raws it sends home (034: the Cistern Terrace sends two). */
export interface LandmarkPylon extends TilePos {
  readonly site: string;
  readonly supplies: readonly string[];
  /** 059: how many pylons' worth it sends (default 1): the Grotto's sends rimestone at 2×. */
  readonly rate?: number;
}

export interface LandmarkDef {
  readonly id: string;
  readonly name: string;
  readonly kind: LandmarkKind;
  /** The danger ring (017) it sits in: 3 in Stonefall Hollows (034), 4 in the Emberworks (060). */
  readonly ring: 1 | 2 | 3 | 4 | 5;
  /** Kept clear of generated trees, rocks, water and stones; its own features are stamped over it. Seeing any of it discovers it. */
  readonly area: TileRect;
  readonly features: readonly Feature[];
  readonly nodes: readonly NodePlacement[];
  /** Its guard pack, placed by hand, in a group named by the landmark's id. */
  readonly guards: readonly GuardPlacement[];
  readonly pylon?: LandmarkPylon;
  /** More ley seams, each ending on the pylon (the Ley Grotto's crossing lines, where its veins stand). */
  readonly veinLines?: readonly (readonly TilePos[])[];
  /** Cut stones of the lost civilisation (the Quarry) or a broken ruin's walls (the cache): solid ruin blocks. */
  readonly blocks?: readonly TilePos[];
  /** The sealed reliquary's tile (the Ruined Cache): solid. */
  readonly cache?: TilePos;
  /** Its own tiles stamped over the ground (034: the Cut's quarry face, the aqueduct's pillars, arches and fallen spans). */
  readonly stamps?: readonly TileStamp[];
  readonly marker: LandmarkMarker;
  /** How render dresses it (landmarkAssets): old trees on its tree tiles, cut stones (or 049's amber-crusted nest stones) for its blocks, a sunken hollow. */
  readonly look?: { readonly trees?: 'old'; readonly blocks?: 'cut' | 'hive'; readonly hollow?: 'ley' | 'frost'; readonly quarry?: true; readonly paving?: 'terrace' | 'ash' | 'slate'; readonly scorched?: true; readonly stormy?: true };
}

/** The landmark tuning (032). Ticks at 60 Hz. */
export const LANDMARKS = {
  /** The discovery banner shows this long, then fades, ms. */
  bannerMs: 2000,
  /** An opened cache re-arms after this much play time (10 minutes), on a tick it's out of view. Never real time. */
  cacheRearmTicks: 36_000,
  /** Holding E at a cleared cache opens it after this many ticks (like a harvest). */
  cacheOpenTicks: 60,
} as const;

/**
 * A cache's loot bursting out (045, note 14): each item waits `staggerTicks` after the one before, flies from the chest
 * over `flightTicks` on an arc `arc` px high to its own spot on a fan `fanRadius` px round the tile below the chest
 * (right, round the front, to left; a spot in a wall keeps its scattered landing), then lies there `holdTicks` with its name over it before
 * the magnet pull (MAGNET) takes it. Render shows the name, its bottom `nameRise` px over the
 * item's ground point, from the flight's start until the pull, stacked `nameGap` px apart so no two overlap; the bursting
 * items draw over the player. Ticks at 60 Hz.
 */
export const CACHE_BURST = { staggerTicks: 6, flightTicks: 24, holdTicks: 36, arc: 18, fanRadius: 40, nameRise: 20, nameGap: 1 } as const;

/** Region 1's raws: what a Ruined Cache here always holds some of. */
const REGION_RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'] as const;

/** A Ruined Cache's drop table (032): always 3–5 of the region's raws, picked evenly, and 033's rare part and schematic. */
export const CACHE_DROPS: DropTable = {
  always: [],
  chance: 0,
  oneOf: [],
  picks: [{ items: REGION_RAWS, min: 3, max: 5 }],
  rare: CACHE_RARE,
};

const FROZEN_GROTTO: LandmarkDef = {
  id: GROTTO_GROUP,
  name: 'Frozen Grotto',
  kind: 'frozen-grotto',
  ring: 2,
  area: GROTTO.area,
  features: [],
  nodes: GROTTO.nodes,
  guards: GROTTO.pack,
  // 055 (D.6): its pylon sends rimestone home; 059 (Shaun): at 2×, 30 a minute, so frost arrows keep going.
  pylon: { ...GROTTO.pylon, site: GROTTO_GROUP, supplies: ['rimestone'], rate: 2 },
  marker: 'grotto',
  look: { hollow: 'frost' },
};

/** A spring's landmark area (032): its pool and rim stones, this many tiles from its centre, inside 030's clearing. */
const SPRING_AREA = 2;

const SPRING_LANDMARKS: readonly LandmarkDef[] = SPRINGS.map((s) => ({
  id: s.id,
  name: s.name,
  kind: 'ley-springs',
  ring: s.ring,
  area: { x0: s.tx - SPRING_AREA, y0: s.ty - SPRING_AREA, x1: s.tx + SPRING_AREA, y1: s.ty + SPRING_AREA },
  features: [],
  nodes: [],
  guards: [],
  marker: 'spring',
}));

/** Every landmark, the Frozen Grotto first (its guards keep 029's place in the pack list), Stonefall Hollows' (034), then the Emberworks' (060) last. */
export const LANDMARK_LIST: readonly LandmarkDef[] = [FROZEN_GROTTO, ...SITES, ...SPRING_LANDMARKS, ...HOLLOWS_SITES, ...EMBERWORKS_SITES, ...STORMCROWN_SITES];

export function landmarkDef(id: string): LandmarkDef {
  const def = LANDMARK_LIST.find((l) => l.id === id);
  if (!def) throw new Error(`Unknown landmark '${id}'`);
  return def;
}

/** The landmark whose pylon claims a site, if any. */
export const landmarkOfSite = (site: string): LandmarkDef | undefined => LANDMARK_LIST.find((l) => l.pylon?.site === site);
