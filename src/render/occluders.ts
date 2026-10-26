import type { GameObjects } from 'phaser';
import { PLAYER_SILHOUETTE } from '../data/silhouette';

// 070: what can hide the player, and whether it does. Views register the sprites of the props that hide (ruin blocks,
// grove trees, tree nodes, the bench, machines) as they make them; a registered sprite leaves when it's destroyed.
// The player is hidden when enough points spread over their body box land on a prop's drawn (opaque) pixels, a prop
// that sorts in front of them (its depth, its bottom, is deeper). Pixels, not boxes: a round canopy's box has empty
// corners that would hide a player standing beside it.

export interface Point {
  x: number;
  y: number;
}

/** The points sampled over the player's body box standing on the feet point (x, bottom): a grid, cell centres. */
export function bodySamples(x: number, bottom: number): Point[] {
  const { w, h } = PLAYER_SILHOUETTE.body;
  const { cols, rows } = PLAYER_SILHOUETTE.samples;
  return Array.from({ length: cols * rows }, (_, i) => ({ x: x - w / 2 + ((i % cols) + 0.5) * (w / cols), y: bottom - h + (Math.floor(i / cols) + 0.5) * (h / rows) }));
}

/** The share of the samples `covered` says a prop in front covers, 0..1. */
export function hiddenShare(samples: readonly Point[], covered: (p: Point) => boolean): number {
  return samples.length === 0 ? 0 : samples.filter(covered).length / samples.length;
}

/**
 * The cover test's cache key: the feet point and each prop in front with its frame, so a tree cut to a stump (NodeView
 * swaps its frame on the same image) or regrown is tested again. '' with nothing in front.
 */
export function coverKey(x: number, y: number, props: readonly { x: number; y: number; frame: { name: string } }[]): string {
  return props.length === 0 ? '' : `${Math.round(x)},${Math.round(y)}|${props.map((o) => `${Math.round(o.x)},${Math.round(o.y)},${o.frame.name}`).join('|')}`;
}

type Prop = GameObjects.Image | GameObjects.Sprite;

/** The registry's buckets are this many px square (props stand still; a frame looks only at the buckets round the player). */
const CELL = 128;
const cellKey = (cx: number, cy: number): string => `${cx},${cy}`;

/** The registered props' sprites, bucketed by where they stand. */
export class Occluders {
  private readonly cells = new Map<string, Set<Prop>>();

  add<T extends Prop>(o: T): T {
    const key = cellKey(Math.floor(o.x / CELL), Math.floor(o.y / CELL));
    const cell = this.cells.get(key) ?? new Set<Prop>();
    this.cells.set(key, cell);
    cell.add(o);
    o.once('destroy', () => {
      cell.delete(o);
      if (cell.size === 0) this.cells.delete(key);
    });
    return o;
  }

  /** The shown props in front of `depth` standing within `reach` px of (x, y). */
  inFront(x: number, y: number, depth: number, reach: number): Prop[] {
    const out: Prop[] = [];
    for (let cy = Math.floor((y - reach) / CELL); cy <= Math.floor((y + reach) / CELL); cy++) {
      for (let cx = Math.floor((x - reach) / CELL); cx <= Math.floor((x + reach) / CELL); cx++) {
        for (const o of this.cells.get(cellKey(cx, cy)) ?? []) {
          if (o.visible && o.depth > depth && Math.abs(o.x - x) <= reach && Math.abs(o.y - y) <= reach) out.push(o);
        }
      }
    }
    return out;
  }

  /**
   * The share of `samples` on an opaque pixel of one of `props`. Bounds are measured once a prop, and a prop whose
   * bounds miss every sample is never read.
   */
  static coveredShare(props: readonly Prop[], samples: readonly Point[]): number {
    const boxes = props.map((o) => ({ o, b: o.getBounds() }));
    const inside = (b: { x: number; y: number; right: number; bottom: number }, p: Point) => p.x >= b.x && p.x < b.right && p.y >= b.y && p.y < b.bottom;
    const near = boxes.filter(({ b }) => samples.some((p) => inside(b, p)));
    if (near.length === 0) return 0;
    return hiddenShare(samples, (p) =>
      near.some(({ o, b }) => {
        if (!inside(b, p)) return false;
        const local = o.getLocalPoint(p.x, p.y);
        const lx = o.flipX ? o.frame.width - local.x : local.x;
        const alpha = o.scene.textures.getPixelAlpha(Math.floor(lx), Math.floor(local.y), o.texture.key, o.frame.name);
        return (alpha ?? 0) >= PLAYER_SILHOUETTE.alphaAtLeast;
      }),
    );
  }
}
