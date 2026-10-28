import { ARENAS } from './arenas';

// The boss arenas' doors (055): one sprite pair per door width (in tiles), sealed and open. Render stands one over each
// door's tiles; the look's numbers are tuning values.

export interface ArenaDoorFrames {
  readonly sealed: string;
  readonly open: string;
}

const framesFor = (tiles: number): ArenaDoorFrames => ({ sealed: `arena-door-${tiles}-sealed`, open: `arena-door-${tiles}-open` });

/** The door frames by width in tiles: every arena's door's width. */
export const ARENA_DOOR_SPRITES: Readonly<Record<number, ArenaDoorFrames>> = Object.fromEntries(
  [...new Set(ARENAS.map((a) => a.door.tiles.length))].map((n) => [n, framesFor(n)]),
);

/** The door's frames for a width, in tiles. */
export function arenaDoorFrames(tiles: number): ArenaDoorFrames {
  const f = ARENA_DOOR_SPRITES[tiles];
  if (!f) throw new Error(`No arena door ${tiles} tiles wide`);
  return f;
}

/** The door's look, world px: how tall it stands over its row's bottom edge, its jambs' and lintel's sizes. */
export const ARENA_DOOR_LOOK = { height: 60, jamb: 9, lintel: 10, overhang: 3, medallion: 8 } as const;

/**
 * fix-playtest-ui (Shaun: "need to fix the boss bar covering the bosses"): while a boss fights, the camera eases up just
 * enough that the boss's top (`heights` px over its feet, by enemy id, else `height`; the Conductor's counts the arena
 * rod behind it) stays `clear` px below the boss bar, never more than `max` px off the player, easing over `easeMs`.
 */
export const BOSS_LOOK = {
  height: 64,
  heights: { forgewright: 76, conductor: 104 } as Readonly<Record<string, number>>,
  clear: 4,
  max: 96,
  easeMs: 200,
} as const;

/**
 * 080: the boss phase looks' part sprites (src/data/art/bossPhaseParts.ts), placed on the posed rig by render: the
 * Bulwark's shield runes (three frames, lit one by one), chipped rim, red crack and shoulder spikes; the Forgewright's
 * open chest plates and flame crest; the Conductor's storm-glass dome and arc halo (two frames, crackling).
 */
export const BOSS_PHASE_SPRITES = {
  runes: 'boss-phase-runes',
  /** The runes' frames (one, two, three lit) and the halo's two, as frame sets. */
  runeFrames: { key: 'boss-phase-runes', frames: 3, frameRate: 1, loop: false },
  haloFrames: { key: 'boss-phase-halo', frames: 2, frameRate: 8, loop: true },
  chips: 'boss-phase-chips',
  crack: 'boss-phase-crack',
  spikes: 'boss-phase-spikes',
  plates: 'boss-phase-plates',
  crest: 'boss-phase-crest',
  dome: 'boss-phase-dome',
  halo: 'boss-phase-halo',
} as const;
