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

type Prop = GameObjects.Image | GameObjects.Sprite;

/** The registered props' sprites. */
export class Occluders {
  private readonly props = new Set<Prop>();

  add<T extends Prop>(o: T): T {
    this.props.add(o);
    o.once('destroy', () => this.props.delete(o));
    return o;
  }

  /** The shown props in front of `depth` whose position is within `reach` px of (x, y). */
  inFront(x: number, y: number, depth: number, reach: number): Prop[] {
    return [...this.props].filter((o) => o.visible && o.depth > depth && Math.abs(o.x - x) <= reach && Math.abs(o.y - y) <= reach);
  }

  /** True if one of `props` draws an opaque pixel at the world point. */
  static covers(props: readonly Prop[], p: Point): boolean {
    return props.some((o) => {
      const b = o.getBounds();
      if (p.x < b.x || p.x >= b.right || p.y < b.y || p.y >= b.bottom) return false;
      const local = o.getLocalPoint(p.x, p.y);
      const lx = o.flipX ? o.frame.width - local.x : local.x;
      const alpha = o.scene.textures.getPixelAlpha(Math.floor(lx), Math.floor(local.y), o.texture.key, o.frame.name);
      return (alpha ?? 0) >= PLAYER_SILHOUETTE.alphaAtLeast;
    });
  }
}
