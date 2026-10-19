import type { DropTable } from './enemies';
import { GROTTO, GROTTO_GROUP } from './grotto';
import { SITES } from './landmarkSites';
import { SPRINGS } from './springs';
import type { Feature, NodePlacement, TilePos, TileRect } from './tiles';

// Landmarks (032): places worth finding, stamped onto the fixed map over the generated
// terrain. Each is hidden until any part of its area comes into view, then stays on the
// minimap; the first sighting is recorded (037 turns it into XP). The four resource
// sites and the Ruined Cache are in landmarkSites.ts; the Frozen Grotto is 029's and the
// springs are 030's, folded in here without moving. Tile coordinates throughout; 034 may
// shift every tile by +40 for Region 2, so positions live only in data.

export type LandmarkKind = 'resource-site' | 'frozen-grotto' | 'ley-springs' | 'ruined-cache';

/** A landmark's minimap icon (landmarkAssets' `MAP_ICONS`). */
export type LandmarkMarker = 'site' | 'grotto' | 'spring' | 'cache';

/** A guard placed by hand; its group is its landmark's id. */
export interface GuardPlacement {
  readonly enemyId: string;
  readonly tx: number;
  readonly ty: number;
}

/** A resource site's ley pylon: its tile, the claim's site id, and the item it sends home. */
export interface LandmarkPylon extends TilePos {
  readonly site: string;
  readonly supplies: string;
}

export interface LandmarkDef {
  readonly id: string;
  readonly name: string;
  readonly kind: LandmarkKind;
  /** The danger ring (017) it sits in. */
  readonly ring: 1 | 2;
  /** Kept clear of generated trees, rocks, water and stones; its own features are stamped over it. Seeing any of it discovers it. */
  readonly area: TileRect;
  readonly features: readonly Feature[];
  readonly nodes: readonly NodePlacement[];
  /** Its guard pack, placed by hand, in a group named by the landmark's id. */
  readonly guards: readonly GuardPlacement[];
  readonly pylon?: LandmarkPylon;
  /** The pylon's ley line home (018): from the pylon to the foundry's stairs. */
  readonly leyLine?: readonly TilePos[];
  /** More ley seams, each ending on the pylon (the Ley Grotto's crossing lines, where its veins stand). */
  readonly veinLines?: readonly (readonly TilePos[])[];
  /** Cut stones of the lost civilisation (the Quarry) or a broken ruin's walls (the cache): solid ruin blocks. */
  readonly blocks?: readonly TilePos[];
  /** The sealed reliquary's tile (the Ruined Cache): solid. */
  readonly cache?: TilePos;
  readonly marker: LandmarkMarker;
  /** How render dresses it (landmarkAssets): old trees on its tree tiles, cut stones for its blocks, a sunken hollow. */
  readonly look?: { readonly trees?: 'old'; readonly blocks?: 'cut'; readonly hollow?: 'ley' | 'frost' };
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

/** Region 1's raws: what a Ruined Cache here always holds some of. */
const REGION_RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'] as const;

/**
 * A Ruined Cache's drop table (032): always 3–5 of the region's raws, picked evenly. Its rare entries, 033's
 * `ancient-gear` at 50% and the schematic roll at 20%, belong to 033, which adds them here as data: until then
 * it opens with raws only.
 */
export const CACHE_DROPS: DropTable = {
  always: [],
  chance: 0,
  oneOf: [],
  picks: [{ items: REGION_RAWS, min: 3, max: 5 }],
  rare: [],
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

/** Every landmark, the Frozen Grotto first (its guards keep 029's place in the pack list). */
export const LANDMARK_LIST: readonly LandmarkDef[] = [FROZEN_GROTTO, ...SITES, ...SPRING_LANDMARKS];

export function landmarkDef(id: string): LandmarkDef {
  const def = LANDMARK_LIST.find((l) => l.id === id);
  if (!def) throw new Error(`Unknown landmark '${id}'`);
  return def;
}

/** The landmark whose pylon claims a site, if any. */
export const landmarkOfSite = (site: string): LandmarkDef | undefined => LANDMARK_LIST.find((l) => l.pylon?.site === site);
