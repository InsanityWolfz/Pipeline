import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { TIP } from '../data/legibility';

// Where a hover tablet goes (040), pure: beside the thing it describes, on the first side
// (in order of preference) where it fits at least TIP.edge px inside the 640×360 view,
// sliding along that side to fit; else the first side, pushed inside. Or docked in a box's
// bottom corner on the side away from the thing (037's info area on the T panel).

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = 'above' | 'below' | 'right' | 'left';

/** What a tablet is placed by: the hovered thing's box, the sides to try, or a box to dock in. */
export interface Anchor {
  box: Box;
  prefer: readonly Side[];
  /** Docks the tablet in this box's bottom corner, on the side away from `box` (the talent tree's info area). */
  dock?: Box;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** A position pushed inside the view, `TIP.edge` px from every side. */
function inside(x: number, y: number, w: number, h: number): { x: number; y: number } {
  const e = TIP.edge;
  return { x: Math.round(clamp(x, e, VIEW_WIDTH - e - w)), y: Math.round(clamp(y, e, VIEW_HEIGHT - e - h)) };
}

/** The tablet on one side of the box, slid along that side into the view; and whether it then fits across. */
function onSide(side: Side, b: Box, w: number, h: number): { x: number; y: number; fits: boolean } {
  const e = TIP.edge;
  const g = TIP.gap;
  if (side === 'above' || side === 'below') {
    const y = side === 'above' ? b.y - g - h : b.y + b.h + g;
    const x = clamp(b.x + b.w / 2 - w / 2, e, VIEW_WIDTH - e - w);
    return { x: Math.round(x), y: Math.round(y), fits: y >= e && y + h <= VIEW_HEIGHT - e };
  }
  const x = side === 'right' ? b.x + b.w + g : b.x - g - w;
  const y = clamp(b.y, e, VIEW_HEIGHT - e - h);
  return { x: Math.round(x), y: Math.round(y), fits: x >= e && x + w <= VIEW_WIDTH - e };
}

/** The tablet's top-left, `w` × `h` px, by its anchor: always at least TIP.edge px inside the view. */
export function placeTip(anchor: Anchor, w: number, h: number): { x: number; y: number } {
  const { box, dock } = anchor;
  if (dock) {
    const left = box.x + box.w / 2 > dock.x + dock.w / 2;
    return inside(left ? dock.x : dock.x + dock.w - w, dock.y + dock.h - h, w, h);
  }
  for (const side of anchor.prefer) {
    const at = onSide(side, box, w, h);
    if (at.fits) return { x: at.x, y: at.y };
  }
  const first = onSide(anchor.prefer[0] ?? 'above', box, w, h);
  return inside(first.x, first.y, w, h);
}

/** True if a point is inside a box. */
export const inBox = (b: Box, x: number, y: number): boolean => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
