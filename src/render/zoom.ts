import { BUILD_ZOOMS } from '../data/config';

// 069: build mode's zoom, pure. The wheel steps along BUILD_ZOOMS (down zooms out, up zooms in), stopping at either
// end; a room narrower than the zoomed-out view gets its camera bounds widened evenly, so it sits centred rather than
// against the view's left edge (Phaser's clamp).

/** The zoom step after `steps` wheel notches (positive is down, out), kept in range. */
export function stepZoom(index: number, steps: number): number {
  return Math.min(BUILD_ZOOMS.length - 1, Math.max(0, index + Math.sign(steps)));
}

/** The world's zoom at a step. */
export const zoomAt = (index: number): number => BUILD_ZOOMS[index] ?? 1;

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A room's camera bounds for a view `viewW` world px wide: widened evenly when the room is narrower, else as they are. */
export function centredBounds(room: Bounds, viewW: number): Bounds {
  if (viewW <= room.w) return room;
  const pad = (viewW - room.w) / 2;
  return { ...room, x: room.x - pad, w: viewW };
}
