import { shiftRect, shiftTile, type Shift } from './place';
import type { TilePos, TileRect } from './tiles';
import { WORLD_SHAPE } from './worldShape';

// The ground round the foundry and the shrine (017, 053): the foundry's entrance, a big ruined gatehouse over the
// stairs (053, D.2), the ruin field's broken walls round its courtyard, and the walled shrine where the Pylon Warden
// waits, in the round map's north-east quadrant. The ruin field, the meadow and their nodes keep 017's shapes,
// moved with the foundry to the round map's centre (`HOME_SHIFT`). Tiles throughout.

/** 053: how far 017's ground round the foundry moved: its old stairs (80, 20) to the round map's centre. */
export const HOME_SHIFT: Shift = { dx: WORLD_SHAPE.centre.tx - 80, dy: WORLD_SHAPE.centre.ty - 20 };

/** 053: the shrine's walled site as 017 drew it, moved whole to the north-east quadrant (bearing 40°, 31 tiles). */
export const SHRINE_SHIFT: Shift = { dx: -2, dy: 51 };

/** The foundry entrance: the stairs' door tile, and the tile you arrive on coming out. */
export const ENTRANCE: TilePos = WORLD_SHAPE.centre;
export const ARRIVE: TilePos = { tx: ENTRANCE.tx, ty: ENTRANCE.ty + 1 };

/**
 * The foundry's ruin (053, D.2: "make it really obvious that it's like a big thing"): a gatehouse this many tiles
 * wide and deep, its front row on the door's, all solid but the door. Its sprite stands over the whole footprint.
 */
export const RUIN = { w: 9, h: 5 } as const;

/** The ruin's footprint, a rect of tiles with the door in the middle of its front row. */
export const RUIN_AREA: TileRect = {
  x0: ENTRANCE.tx - Math.floor(RUIN.w / 2),
  y0: ENTRANCE.ty - RUIN.h + 1,
  x1: ENTRANCE.tx + Math.floor(RUIN.w / 2),
  y1: ENTRANCE.ty,
};

/** The ruin's blocks: every footprint tile but the door. */
export const MOUND: readonly TilePos[] = Array.from({ length: RUIN.w * RUIN.h }, (_, i) => ({ tx: RUIN_AREA.x0 + (i % RUIN.w), ty: RUIN_AREA.y0 + Math.floor(i / RUIN.w) })).filter(
  (t) => t.tx !== ENTRANCE.tx || t.ty !== ENTRANCE.ty,
);

const home = (tx: number, ty: number): TilePos => shiftTile({ tx, ty }, HOME_SHIFT);

/** Broken walls of the ruin field round the courtyard (017): runs of wall with gaps, where the roads leave. */
export const FIELD_WALLS: readonly TilePos[] = [
  ...[71, 72, 73, 76, 77, 83, 84, 87, 88, 89].map((tx) => home(tx, 12)),
  ...[13, 14, 17, 18].map((ty) => home(71, ty)),
  ...[13, 14, 15, 18, 19].map((ty) => home(89, ty)),
  home(74, 16),
  home(86, 16),
];

/** The shrine site: an open-air ruin in ring 2, walled, with a 3-tile gap at the bottom. */
export const SHRINE: TileRect = shiftRect({ x0: 98, y0: 3, x1: 114, y1: 15 }, SHRINE_SHIFT);
const SHRINE_GAP = [105, 106, 107].map((tx) => tx + SHRINE_SHIFT.dx);
/** The front wall's two fallen stretches, and the side walls' gap row. */
const FALLEN = [101, 111].map((tx) => tx + SHRINE_SHIFT.dx);
const SIDE_GAP = 9 + SHRINE_SHIFT.dy;

export function shrineWalls(): TilePos[] {
  const out: TilePos[] = [];
  for (let tx = SHRINE.x0; tx <= SHRINE.x1; tx++) {
    // The back wall is whole; the front wall leaves the gate gap and two fallen stretches.
    out.push({ tx, ty: SHRINE.y0 });
    if (!SHRINE_GAP.includes(tx) && !FALLEN.includes(tx)) out.push({ tx, ty: SHRINE.y1 });
  }
  for (let ty = SHRINE.y0 + 1; ty < SHRINE.y1; ty++) {
    if (ty === SIDE_GAP) continue;
    out.push({ tx: SHRINE.x0, ty });
    out.push({ tx: SHRINE.x1, ty });
  }
  return out;
}

/** The gap the ley barrier seals until the first line fills the tube (012). */
export const SHRINE_GATE: readonly TilePos[] = SHRINE_GAP.map((tx) => ({ tx, ty: SHRINE.y1 }));
export const SHRINE_PYLON: TilePos = shiftTile({ tx: 106, ty: 8 }, SHRINE_SHIFT);

/** The meadow's ley vein (018), the tutorial's first crystals: since 053 it stands on the Reed Marsh's line home. */
export const MEADOW_VEIN: TilePos = shiftTile({ tx: 84, ty: 31 }, HOME_SHIFT);
