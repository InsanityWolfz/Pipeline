import type { LandmarkDef } from './landmarks';
import type { TilePos, TileRect } from './tiles';

// Moving hand-placed layouts whole (053): each landmark keeps the inner layout its spec tested (its nodes in their
// pockets, its guards, pylon and blocks) and only its place on the round map changes. Pure data helpers.

export interface Shift {
  readonly dx: number;
  readonly dy: number;
}

export const shiftTile = <T extends TilePos>(t: T, d: Shift): T => ({ ...t, tx: t.tx + d.dx, ty: t.ty + d.dy });

export const shiftRect = (r: TileRect, d: Shift): TileRect => ({ x0: r.x0 + d.dx, y0: r.y0 + d.dy, x1: r.x1 + d.dx, y1: r.y1 + d.dy });

/** The middle tile of a rect (rounded down). */
export const rectMid = (r: TileRect): TilePos => ({ tx: Math.floor((r.x0 + r.x1) / 2), ty: Math.floor((r.y0 + r.y1) / 2) });

/** The shift that brings a rect's middle tile to `to`. */
export const shiftTo = (r: TileRect, to: TilePos): Shift => {
  const m = rectMid(r);
  return { dx: to.tx - m.tx, dy: to.ty - m.ty };
};

/** A landmark moved whole by `d`: its area, features, nodes, guards, pylon, seams, blocks, reliquary and stamped tiles. */
export function shiftLandmark(l: LandmarkDef, d: Shift): LandmarkDef {
  return {
    ...l,
    area: shiftRect(l.area, d),
    features: l.features.map((f) => ({ ...f, cx: f.cx + d.dx, cy: f.cy + d.dy })),
    nodes: l.nodes.map((n) => shiftTile(n, d)),
    guards: l.guards.map((g) => shiftTile(g, d)),
    ...(l.pylon ? { pylon: shiftTile(l.pylon, d) } : {}),
    ...(l.veinLines ? { veinLines: l.veinLines.map((v) => v.map((t) => shiftTile(t, d))) } : {}),
    ...(l.blocks ? { blocks: l.blocks.map((t) => shiftTile(t, d)) } : {}),
    ...(l.cache ? { cache: shiftTile(l.cache, d) } : {}),
    ...(l.stamps ? { stamps: l.stamps.map((t) => shiftTile(t, d)) } : {}),
  };
}

/** A landmark moved whole so its area's middle tile lands on `to`. */
export const placeLandmark = (l: LandmarkDef, to: TilePos): LandmarkDef => shiftLandmark(l, shiftTo(l.area, to));
