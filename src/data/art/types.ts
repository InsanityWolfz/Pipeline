// Vector art (016): sprites are shapes in world px, coloured by DAYLIGHT_PALETTE ids.
// Render code draws them into textures at boot (static sprites and baked enemy
// frames) or every frame (the wanderer). See docs/art.md.

/** A palette id, or a palette id at an opacity. */
export type Ink = string | { readonly id: string; readonly alpha: number };

export interface Stop {
  /** 0..1 along the gradient. */
  readonly at: number;
  readonly color: Ink;
}

/** A flat colour, or a gradient in the shape's own coordinates. */
export type Paint =
  | Ink
  | { readonly linear: readonly [x0: number, y0: number, x1: number, y1: number]; readonly stops: readonly Stop[] }
  | { readonly radial: readonly [x: number, y: number, r: number]; readonly stops: readonly Stop[] };

/** Path commands, as in SVG: move, line, quadratic, cubic, close. */
export type PathCmd =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

export interface ShapeStyle {
  readonly fill?: Paint;
  /** A stroke along the shape (not the outline), e.g. a gold hem or a crack. */
  readonly stroke?: { readonly color: Ink; readonly width: number; readonly dash?: readonly [number, number] };
  /** Draw the shared ink outline around it. */
  readonly outline?: boolean;
  /** A soft glow in a palette colour, blur in world px. */
  readonly glow?: { readonly color: string; readonly blur: number };
  /** Opacity of the whole shape, 0..1. */
  readonly alpha?: number;
  /**
   * 075: a static rim light from the top left: render clips to the shape and strokes its own path shifted down and
   * right by `offset`, so a band of `color`, `width` wide, shows along its top and left edges only. Shape units.
   */
  readonly rim?: { readonly color: Ink; readonly width: number; readonly offset: number };
}

export type Shape = ShapeStyle &
  (
    | { readonly kind: 'ellipse'; readonly x: number; readonly y: number; readonly rx: number; readonly ry: number }
    | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly r?: number }
    | { readonly kind: 'path'; readonly d: readonly PathCmd[] }
    /** A round-capped polyline (x0, y0, x1, y1, ...) or, with 8 numbers and `curve`, a cubic. */
    | { readonly kind: 'line'; readonly pts: readonly number[]; readonly width: number; readonly color: Ink; readonly curve?: boolean }
  );

/** A rig part: its shapes are drawn around `pivot` after the rig's pose moves and turns it. */
export interface Part {
  readonly id: string;
  readonly pivot: readonly [number, number];
  readonly shapes: readonly Shape[];
}

/** How a limb a rig draws between two posed points looks (arms, legs, the hose). */
export interface LimbStyle {
  readonly width: number;
  readonly color: Ink;
  readonly outline: boolean;
  /** Bands along it, as the hose's rings: colour and a dash of [on, off] px. */
  readonly bands?: { readonly color: Ink; readonly dash: readonly [number, number] };
}

/** A static or animated sprite drawn from shapes. Frames share a box; `anchor` is where (0, 0) of the shapes sits in it. */
export interface VectorSprite {
  /** The frame name: `key` for one frame, `key/0`.. for several (as the atlas names frames). */
  readonly key: string;
  readonly size: readonly [w: number, h: number];
  readonly anchor: readonly [x: number, y: number];
  readonly frames: readonly (readonly Shape[])[];
}

/** Colour ids a shape uses, for the palette test. */
export function inksOf(shape: Shape): string[] {
  const ids: string[] = [];
  const ink = (i: Ink): void => {
    ids.push(typeof i === 'string' ? i : i.id);
  };
  const paint = (p: Paint): void => {
    if (typeof p === 'string' || 'id' in p) ink(p);
    else for (const s of p.stops) ink(s.color);
  };
  if (shape.fill) paint(shape.fill);
  if (shape.stroke) ink(shape.stroke.color);
  if (shape.glow) ids.push(shape.glow.color);
  if (shape.rim) ink(shape.rim.color);
  if (shape.kind === 'line') ink(shape.color);
  return ids;
}

/** An SVG-style path string ("M 0 0 Q 1 2 3 4 Z") as path commands, so shape data stays short. */
export function svg(d: string): PathCmd[] {
  const tokens = d.trim().split(/[\s,]+/);
  const out: PathCmd[] = [];
  let i = 0;
  const n = (): number => {
    const v = Number(tokens[i++]);
    if (Number.isNaN(v)) throw new Error(`Bad number in path '${d}'`);
    return v;
  };
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') out.push([cmd, n(), n()]);
    else if (cmd === 'Q') out.push(['Q', n(), n(), n(), n()]);
    else if (cmd === 'C') out.push(['C', n(), n(), n(), n(), n(), n()]);
    else if (cmd === 'Z') out.push(['Z']);
    else throw new Error(`Unknown path command '${cmd}' in '${d}'`);
  }
  return out;
}

/** Shorthands for shape data. */
export const path = (d: string, style: ShapeStyle): Shape => ({ kind: 'path', d: svg(d), ...style });
export const rect = (x: number, y: number, w: number, h: number, r: number, style: ShapeStyle): Shape => ({ kind: 'rect', x, y, w, h, r, ...style });
export const ellipse = (x: number, y: number, rx: number, ry: number, style: ShapeStyle): Shape => ({ kind: 'ellipse', x, y, rx, ry, ...style });
export const line = (pts: readonly number[], width: number, color: Ink, outline = false): Shape => ({ kind: 'line', pts, width, color, outline });
/** Filled and outlined. */
export const solid = (fill: Paint): ShapeStyle => ({ fill, outline: true });
/** Filled, no outline (shading and highlights inside an outlined shape). */
export const flat = (fill: Paint): ShapeStyle => ({ fill });
/** A stroke only, e.g. a hem trim. */
export const trim = (color: Ink, width: number): ShapeStyle => ({ stroke: { color, width } });
