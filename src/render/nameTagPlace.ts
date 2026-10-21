// Where a hover name tag goes (050, A.2; 050.1): under the hovered thing's feet, so the E prompt over it stays clear,
// unless the tag would cover the player (or a prompt) there; then just above the thing, then beside it (away from the
// player first), then above its E prompt. Kept inside the view's sides, and off the minimap (017): if every place meets
// it, the tag slides left of it. Pure, world px.

export interface TagBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TagPlaceInput {
  /** The thing's centre x and half width, its ground point (feet) and how far up it stands. */
  cx: number;
  halfW: number;
  feet: number;
  rise: number;
  /** Where the tag's top goes below it (its feet, or under a readout), and where its bottom goes when it can't go just over it (a readout's top). */
  below: number;
  top: number;
  /** The player's x: beside the thing, the side away from the player is tried first. */
  playerX: number;
  /** The gap between the tag and the thing, and how far over the feet the tag's bottom sits above an E prompt. */
  gap: number;
  promptClear: number;
  /** The tag's size, padding included. */
  w: number;
  h: number;
  /** Boxes the tag never covers: the player's sprite, an E prompt's key cap, the minimap's frame in the overworld. */
  avoid: readonly TagBox[];
  /** The view's box (the camera's), world px; the tag stays `edge` px inside its sides. */
  view: TagBox;
  edge: number;
}

export type TagSide = 'below' | 'above' | 'beside' | 'over-prompt';
type Place = { x: number; y: number; side: TagSide };

const meets = (a: TagBox, b: TagBox): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** The tag's top-left: the first place in order that meets nothing (each also slid left of a box every place meets); else below. */
export function placeNameTag(o: TagPlaceInput): Place {
  const { view, edge, w, h } = o;
  const clampX = (x: number): number => Math.min(Math.max(x, view.x + edge), view.x + view.w - edge - w);
  const centred = clampX(o.cx - w / 2);
  const mid = o.feet - o.rise / 2 - h / 2;
  const left: Place = { x: o.cx - o.halfW - o.gap - w, y: mid, side: 'beside' };
  const right: Place = { x: o.cx + o.halfW + o.gap, y: mid, side: 'beside' };
  const tries: Place[] = [
    { x: centred, y: o.below, side: 'below' },
    { x: centred, y: o.top - o.gap - h, side: 'above' },
    ...(o.playerX >= o.cx ? [left, right] : [right, left]),
    { x: centred, y: o.feet - o.promptClear - h, side: 'over-prompt' },
  ];
  const inView = (t: Place): boolean => t.x >= view.x + edge && t.x + w <= view.x + view.w - edge && t.y >= view.y + edge && t.y + h <= view.y + view.h - edge;
  // Slid left of a box every place in view meets (the minimap at the top right).
  const blocker = o.avoid.find((b) => tries.filter(inView).every((t) => meets({ ...t, w, h }, b)));
  if (blocker) tries.push(...tries.map((t) => ({ ...t, x: clampX(blocker.x - edge - w) })));
  const clear = tries.find((t) => inView(t) && !o.avoid.some((b) => meets({ ...t, w, h }, b)));
  return clear ?? tries.find(inView) ?? { x: centred, y: o.below, side: 'below' };
}
