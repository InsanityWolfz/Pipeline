// Where a hover name tag goes (050, A.2; 050.1): under the hovered thing's feet, so the E prompt over it stays clear,
// unless the tag would cover the player there; then above the thing, clear of its prompt. Kept inside the view's
// sides, and off the minimap (017): if both places meet it, the tag slides left of it. Pure, world px.

export interface TagBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TagPlaceInput {
  /** The thing's centre x, and where the tag's top goes below it and its bottom above it. */
  cx: number;
  below: number;
  above: number;
  /** The tag's size, padding included. */
  w: number;
  h: number;
  /** Boxes the tag never covers: the player's sprite, and the minimap's frame in the overworld. */
  avoid: readonly TagBox[];
  /** The view's box (the camera's), world px; the tag stays `edge` px inside its sides. */
  view: TagBox;
  edge: number;
}

const meets = (a: TagBox, b: TagBox): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** The tag's top-left: the first of below, above (then the same left of whatever it met) that meets nothing; else below. */
export function placeNameTag(o: TagPlaceInput): { x: number; y: number; side: 'below' | 'above' } {
  const { view, edge, w, h } = o;
  const clampX = (x: number): number => Math.min(Math.max(x, view.x + edge), view.x + view.w - edge - w);
  const x0 = clampX(o.cx - w / 2);
  const tries: { x: number; y: number; side: 'below' | 'above' }[] = [
    { x: x0, y: o.below, side: 'below' },
    { x: x0, y: o.above - h, side: 'above' },
  ];
  // Slid left of the first box both places meet (the minimap at the top right), below then above.
  const blocker = o.avoid.find((b) => tries.every((t) => meets({ ...t, w, h }, b)));
  if (blocker) tries.push({ x: clampX(blocker.x - edge - w), y: o.below, side: 'below' }, { x: clampX(blocker.x - edge - w), y: o.above - h, side: 'above' });
  const inView = (t: { y: number }): boolean => t.y >= view.y + edge && t.y + h <= view.y + view.h - edge;
  const clear = tries.find((t) => inView(t) && !o.avoid.some((b) => meets({ ...t, w, h }, b)));
  return clear ?? tries.find(inView) ?? { x: x0, y: o.below, side: 'below' };
}
