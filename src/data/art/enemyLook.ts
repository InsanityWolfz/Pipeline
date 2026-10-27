import { family, type FamilyId } from './enemyFamilies';
import { ellipse, line, path, rect, svg, type Ink, type Paint, type Shape, type ShapeStyle } from './types';

// 076: the pushed vector look for enemies (as 075's wanderer): big shapes take a soft gradient from their ramp's
// light id (top left) to its dark id (bottom right), a static rim light in their family's colour along their lit
// edges, and the ink outline. The family marks every member wears (moss, rune discs, slate plates, ley-iron bands,
// soot, cinder seams, rivets, storm-glass) are shapes made here, so a family looks the same on every rig.
// Units are each rig's style px.

/** Three palette ids of one material, dark to light. */
export interface Tone {
  readonly dark: string;
  readonly mid: string;
  readonly light: string;
}

export const tone = (dark: string, mid: string, light: string): Tone => ({ dark, mid, light });

/** The rim on every family's big shapes: its colour at half strength, 1 px wide, 1 px in (spec 076). */
export const ENEMY_RIM = { alpha: 0.5, width: 1, offset: 1 } as const;

export const rimOf = (f: FamilyId): { color: Ink; width: number; offset: number } => ({ color: { id: family(f).rim, alpha: ENEMY_RIM.alpha }, width: ENEMY_RIM.width, offset: ENEMY_RIM.offset });

/** A soft gradient across a box, light at its top left, mid, dark at its bottom right. */
export function shade(t: Tone, [x0, y0, x1, y1]: readonly [number, number, number, number]): Paint {
  return { linear: [x0, y0, x1, y1], stops: [{ at: 0, color: t.light }, { at: 0.45, color: t.mid }, { at: 1, color: t.dark }] };
}

/** A big shape's style: the gradient over its box, the outline, and its family's rim. */
export function big(t: Tone, box: readonly [number, number, number, number], f: FamilyId): ShapeStyle {
  return { fill: shade(t, box), outline: true, rim: rimOf(f) };
}

/** The box a path's points span. */
function pathBox(d: string): [number, number, number, number] {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const c of svg(d)) {
    for (let i = 1; i + 1 < c.length; i += 2) {
      xs.push(c[i] as number);
      ys.push(c[i + 1] as number);
    }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Shaded shapes: the gradient over the shape's own box, outlined, rimmed. */
export const litEllipse = (x: number, y: number, rx: number, ry: number, t: Tone, f: FamilyId): Shape => ellipse(x, y, rx, ry, big(t, [x - rx, y - ry, x + rx, y + ry], f));
export const litRect = (x: number, y: number, w: number, h: number, r: number, t: Tone, f: FamilyId): Shape => rect(x, y, w, h, r, big(t, [x, y, x + w, y + h], f));
export const litPath = (d: string, t: Tone, f: FamilyId): Shape => path(d, big(t, pathBox(d), f));
/** Shaded but with no outline or rim (a panel inside an outlined shape). */
export const softPath = (d: string, t: Tone, alpha = 1): Shape => path(d, { fill: shade(t, pathBox(d)), alpha });

/** A glowing line (a rune, a vein, a seam), with no outline. */
export const glowLine = (pts: readonly number[], width: number, color: string, blur: number, curve = false): Shape => ({ kind: 'line', pts, width, color, outline: false, curve, glow: { color, blur } });

// --- Mossbound ruins -------------------------------------------------------------------------------------------

export const MOSS = tone('leaf-dark', 'moss-tuft', 'leaf-light');
export const RUIN_STONE = tone('rock-dark', 'rock', 'rock-light');
export const GUARDIAN = tone('warden-dark', 'warden', 'warden-light');

/** A tuft of moss lying over a top edge from `x0` to `x1` at `y`: soft bumps, a lit crown, a dark underside. */
export function mossTuft(x0: number, x1: number, y: number, h = 2.4): Shape[] {
  const w = x1 - x0;
  const n = Math.max(2, Math.round(w / 3.2));
  const step = w / n;
  let d = `M ${x0} ${y + h * 0.4}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step;
    const bump = h * (i % 2 === 0 ? 1 : 0.75);
    d += ` Q ${a + step / 2} ${y - bump} ${a + step} ${y + (i === n - 1 ? h * 0.4 : 0)}`;
  }
  d += ` Q ${x0 + w / 2} ${y + h * 0.9} ${x0} ${y + h * 0.4} Z`;
  return [path(d, { fill: shade(MOSS, [x0, y - h, x1, y + h]), outline: true }), ellipse(x0 + w * 0.32, y - h * 0.35, Math.max(0.6, w * 0.12), h * 0.22, { fill: 'leaf-pale', alpha: 0.75 })];
}

/** A carved ruin-stone disc with a cyan rune, hanging or set in: radius `r`. */
export function runeDisc(x: number, y: number, r: number): Shape[] {
  return [
    ellipse(x, y, r, r, big(RUIN_STONE, [x - r, y - r, x + r, y + r], 'ruin')),
    ellipse(x + r * 0.15, y + r * 0.15, r * 0.62, r * 0.62, { fill: 'rock-dark', alpha: 0.35 }),
    glowLine([x - r * 0.45, y - r * 0.4, x, y + r * 0.5, x + r * 0.45, y - r * 0.4], Math.max(0.6, r * 0.22), 'cyan', 2),
    ellipse(x, y - r * 0.55, r * 0.16, r * 0.16, { fill: 'cyan-glow' }),
  ];
}

// --- Quarry constructs ------------------------------------------------------------------------------------------

export const SLATE = tone('hollow-dark', 'hollow', 'hollow-light');
export const LEY_IRON = tone('iron-dark', 'iron', 'iron-light');
export const BRASS = tone('brass-dark', 'brass', 'brass-light');

/** Layered slate: `n` plate edges stacked across a box from its top, each with a lit lip and a shadow under it. */
export function slateLips(x: number, y: number, w: number, h: number, n: number): Shape[] {
  const out: Shape[] = [];
  for (let i = 1; i <= n; i++) {
    const yy = y + (h * i) / (n + 1);
    const inset = i % 2 === 0 ? w * 0.06 : 0;
    out.push(line([x + inset, yy + 0.7, x + w - inset, yy + 0.7], 0.9, { id: 'hollow-dark', alpha: 0.75 }));
    out.push(line([x + inset, yy, x + w - inset, yy], 0.7, 'hollow-pale'));
  }
  return out;
}

/** A ley-iron band from (x0, y0) to (x1, y1), `w` wide: rust skin over iron, a cyan vein along it. */
export function ironBand(x0: number, y0: number, x1: number, y1: number, w: number): Shape[] {
  return [line([x0, y0, x1, y1], w, 'iron-rust', true), line([x0, y0 - w * 0.25, x1, y1 - w * 0.25], w * 0.35, 'iron-light'), glowLine([x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15, x1 - (x1 - x0) * 0.15, y1 - (y1 - y0) * 0.15], Math.max(0.5, w * 0.28), 'vein', 1.5)];
}

// --- Forge constructs and Storm-works (slice B) ----------------------------------------------------------------

export const ASH = tone('ash-dark', 'ash', 'ash-light');
export const FORGE_IRON = tone('iron-dark', 'iron', 'iron-light');
export const CINDER = tone('flame-dark', 'cinder', 'cinder-light');
export const STORM_SLATE = tone('storm-dark', 'storm', 'storm-light');
export const STORM_GLASS = tone('storm-glow', 'storm-pale', 'snow');

/** Brass rivets at points, radius `r`. */
export const rivets = (pts: readonly (readonly [number, number])[], r = 0.8): Shape[] => pts.flatMap(([x, y]) => [ellipse(x, y, r, r, { fill: 'brass', outline: true }), ellipse(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.35, { fill: 'brass-light' })]);

/** Soot creeping up a lower edge: a dark wash over the box's bottom, fading upward. */
export const soot = (x: number, y: number, w: number, h: number): Shape => rect(x, y, w, h, Math.min(w, h) / 3, { fill: { linear: [0, y + h, 0, y], stops: [{ at: 0, color: { id: 'ash-dark', alpha: 0.75 } }, { at: 1, color: { id: 'ash-dark', alpha: 0 } }] } });

/** A cinder glow in a seam or crack. */
export const cinderSeam = (pts: readonly number[], width = 1): Shape[] => [glowLine(pts, width + 0.6, 'cinder', 2.5), line(pts, width * 0.5, 'cinder-light')];

/** A storm-glass inlay: a small faceted shard, white to violet. */
export function glassInlay(x: number, y: number, r: number): Shape[] {
  return [path(`M ${x} ${y - r} L ${x + r * 0.8} ${y} L ${x} ${y + r} L ${x - r * 0.8} ${y} Z`, { fill: shade(STORM_GLASS, [x - r, y - r, x + r, y + r]), outline: true, glow: { color: 'storm-glow', blur: 2 } }), line([x - r * 0.3, y - r * 0.4, x, y - r * 0.75], 0.5, 'snow')];
}

/** A violet lightning vein. */
export const stormVein = (pts: readonly number[], width = 0.9): Shape[] => [glowLine(pts, width + 0.5, 'storm-glow', 2.5), line(pts, width * 0.45, 'snow')];
