import type { PropPlacement } from './props';

// Rooms as tile grids. One character per tile; see TILE below.

/** Tile symbols used in room rows. */
export const TILE = {
  floor: '.',
  wall: '#',
  ruinBlock: 'B',
  /** A gap in the outer wall that leads to another room. Only the player walks through it. */
  door: 'D',
  // The overworld (017):
  /** A dirt path: floor that keeps trees and rocks off it. */
  path: ',',
  /** A pond's shallow edge: walkable. */
  shallow: ':',
  /** Deep water: stops feet, not shots. */
  water: '~',
  /** A tree: stops feet and shots. */
  tree: 'T',
  /** A boulder: stops feet and shots. */
  rock: 'R',
  // Stonefall Hollows (034):
  /** A cliff or quarry face: stops feet and straight shots (lobs fly over everything). */
  cliff: 'C',
  /** An aqueduct pillar or a colonnade column: stops feet and shots. */
  pillar: 'P',
  /** A fallen aqueduct span, its stones heaped: stops feet and shots. */
  fallen: 'F',
  /** Open ground under a standing arch: walkable, shots pass. */
  arch: 'A',
  /** A quarry-cut terrace step: walkable. */
  terrace: '=',
} as const;

/** Tiles feet can cross. Anything else, and outside the grid, is solid. */
export const WALKABLE: readonly string[] = [TILE.floor, TILE.path, TILE.shallow, TILE.arch, TILE.terrace];

/** Tiles shots fly over though feet can't (017). */
export const SHOT_THROUGH: readonly string[] = [TILE.water];

export type TileSymbol = (typeof TILE)[keyof typeof TILE];

export interface Room {
  id: string;
  /** Rows of tile symbols, top to bottom. All rows are the same length. */
  rows: readonly string[];
  /** Spawn tile; the player stands at its centre. */
  spawn: { tx: number; ty: number };
  /** Optional decoration tile for the ley crystal from 001. No gameplay, no collision. */
  crystal?: { tx: number; ty: number };
  /** Enemies placed in the room; each one's tile is its home. A `group` (017) ties it to a gate or a site. */
  enemies?: readonly { enemyId: string; tx: number; ty: number; group?: string }[];
  /** Gathering nodes; each stands at its tile's centre. */
  nodes?: readonly { nodeId: string; tx: number; ty: number }[];
  /** Door tiles on the outer wall, each linked to a door in another room (by its index there). */
  doorways?: readonly Doorway[];
  /** Where the dormant tube rests until the player takes it (012); solid. */
  tubeStone?: { tx: number; ty: number };
  /** Ley pylons (009, 032): solid; claiming one claims its site (017: a part of the room, by id). */
  pylons?: readonly PylonDef[];
  /** Sealed reliquaries (032), by landmark id: solid. */
  caches?: readonly { id: string; tx: number; ty: number }[];
  /** Tiles a tutorial gate seals while shut, as the shrine site's gap in the overworld (017) and the Hollows' barrier (034). */
  gateTiles?: readonly { tx: number; ty: number; gate: GateId }[];
  /** Boss altars (034): solid stones, each by its arena, summoning its boss again after the first kill. */
  altars?: readonly { id: string; tx: number; ty: number; boss: string }[];
  /** Generated ground features render draws (017): ponds and paths, in tiles. */
  terrain?: Terrain;
  /** Dressing (014): looks only, never collision (block props stand on B tiles, which are solid already). */
  props?: readonly PropPlacement[];
}

/** A ley pylon in a room (009, 017, 032). */
export interface PylonDef {
  tx: number;
  ty: number;
  /** The claim's site id: its guards are the enemies in this group. */
  site: string;
  /** Its landmark's name, for the waystone's menu (032). */
  name: string;
  /** Its safe zone's radius once claimed, tiles. */
  safeRadius: number;
  /** A site that must be claimed first: until then it is dormant and can't be claimed (032). */
  wakes?: string;
}

export interface Doorway {
  tx: number;
  ty: number;
  to: string;
  toDoor: number;
  /** Where coming through this door from the other side lands; by default the floor tile inward of an outer-wall door (017: the foundry stairs open south). */
  arrive?: { tx: number; ty: number };
  /** A tutorial gate (012) that seals this door until it opens. */
  gate?: GateId;
}

/** A pond (017): an ellipse in tiles. */
export interface Pond {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface Terrain {
  ponds: readonly Pond[];
  /** Tile polylines of the dirt paths. */
  paths: readonly (readonly { tx: number; ty: number }[])[];
}

/**
 * The gates (012): the foundry opens when the field pack is dead, the shrine when the first line fills the tube, and
 * Stonefall Hollows' ley barrier (034) when the shrine's pylon is claimed.
 */
export type GateId = 'foundry' | 'shrine' | 'hollows';

/** Gates whose sealed tiles stop shots too, not just feet (034: the Hollows' barrier stops every projectile). */
export const SHOT_GATES: readonly GateId[] = ['hollows'];

/** Rooms written out by hand; the overworld is generated (src/sim/world.ts). */
export const STATIC_ROOMS: Readonly<Record<string, Room>> = {
  // The sealed ruin the player rebuilds: open floor to build on, its corners fallen in (014).
  foundry: {
    id: 'foundry',
    rows: [
      '########################',
      '###......##..........###',
      '##....................##',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................D',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '##.....................#',
      '###..................###',
      '########################',
    ],
    spawn: { tx: 22, ty: 8 },
    props: [
      { propId: 'brazier', tx: 4, ty: 0 },
      { propId: 'brazier', tx: 20, ty: 0 },
      { propId: 'banner', tx: 8, ty: 0 },
      { propId: 'banner', tx: 16, ty: 0 },
    ],
    doorways: [{ tx: 23, ty: 8, to: 'overworld', toDoor: 0 }],
  },
};

/** The open map outside (017): where every start but the foundry's is. */
export const DEFAULT_ROOM = 'overworld';

/** The claimable site with its pylon (009), a part of the overworld since 017. */
export const SHRINE_SITE = 'shrine';

/** 044: the sandbox's test room, reached only by `?sandbox` (laid out in src/data/sandbox.ts, built in src/sim/sandboxRoom.ts). */
export const SANDBOX_ROOM = 'sandbox';

/** The room that holds the buildable foundry grid. */
export const FOUNDRY_ROOM = 'foundry';
