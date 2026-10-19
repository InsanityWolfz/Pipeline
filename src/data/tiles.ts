// Tile shapes the overworld's data is written in (017, 018): points, rectangles and the
// hand-placed features that explain nodes. Kept apart from overworld.ts so landmark data
// can use them without an import cycle.

export type TilePos = { readonly tx: number; readonly ty: number };

/** A rectangle of tiles, inclusive. */
export interface TileRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * A small hand-placed feature that explains a node (018), stamped over the terrain:
 * a grove or rock field round a pocket of grass the node stands in, or a pond the
 * reeds stand at the edge of. Radii in tiles; centres may sit between tiles.
 */
export type Feature =
  | { readonly kind: 'grove' | 'rocks'; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly kind: 'pond'; readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number };

/** A node placed on a map tile. */
export interface NodePlacement {
  readonly nodeId: string;
  readonly tx: number;
  readonly ty: number;
}
