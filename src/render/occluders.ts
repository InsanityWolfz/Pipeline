import type { GameObjects } from 'phaser';
import { PLAYER_SILHOUETTE } from '../data/silhouette';

// 070: what can hide the player, and whether it does. Views register the sprites of the props that hide (ruin blocks,
// grove trees, tree nodes, the bench, machines) as they make them; a registered sprite leaves when it's destroyed.
// The cover test is pure: a prop hides the player when it sorts in front of them (its depth, its bottom, is deeper)
// and covers at least a share of their body box.

/** A box in world px with its draw depth. */
export interface PropBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  depth: number;
}

/** The player's body box standing on the feet point (x, bottom), at the depth they sort by. */
export function bodyBox(x: number, bottom: number): PropBox {
  const B = PLAYER_SILHOUETTE.body;
  return { x0: x - B.w / 2, y0: bottom - B.h, x1: x + B.w / 2, y1: bottom, depth: bottom };
}

/** The share of `body` that `prop` covers, 0..1. */
export function coverShare(body: PropBox, prop: PropBox): number {
  const w = Math.max(0, Math.min(body.x1, prop.x1) - Math.max(body.x0, prop.x0));
  const h = Math.max(0, Math.min(body.y1, prop.y1) - Math.max(body.y0, prop.y0));
  const area = (body.x1 - body.x0) * (body.y1 - body.y0);
  return area > 0 ? (w * h) / area : 0;
}

/** True if any prop in front of the body covers at least `share` of it. */
export function hiddenBehind(body: PropBox, props: Iterable<PropBox>, share: number): boolean {
  for (const p of props) if (p.depth > body.depth && coverShare(body, p) >= share) return true;
  return false;
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

  /** The boxes of the shown props whose position is within `reach` px of (x, y) (a quick cut before measuring bounds). */
  near(x: number, y: number, reach: number): PropBox[] {
    const out: PropBox[] = [];
    for (const o of this.props) {
      if (!o.visible || Math.abs(o.x - x) > reach || Math.abs(o.y - y) > reach) continue;
      const b = o.getBounds();
      out.push({ x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height, depth: o.depth });
    }
    return out;
  }
}
