import type { Rarity } from '../gear';
import type { Ink, Paint, ShapeStyle } from './types';
import type { Tone, WandererLook } from './wandererTypes';

// The arcane ranger's colour schemes and rarity trim (075), and the shading every big shape of it takes: a soft
// gradient lit from the top left and a rim light along its lit edges (the style test's "pushed further" card).

export type WandererSchemeId = 'cobalt' | 'rust' | 'bone';

/** A scheme sets the cloth (hood, cowl and cape) and the jerkin; everything else is the same in every scheme. */
export interface WandererScheme {
  readonly id: WandererSchemeId;
  readonly name: string;
  readonly cloth: Tone;
  readonly jerkin: Tone;
}

export const WANDERER_SCHEMES: Readonly<Record<WandererSchemeId, WandererScheme>> = {
  cobalt: { id: 'cobalt', name: 'Ley cobalt', cloth: { dark: 'cobalt-dark', mid: 'cobalt', light: 'cobalt-light' }, jerkin: { dark: 'leather', mid: 'hide', light: 'hide-light' } },
  rust: { id: 'rust', name: 'Ember rust', cloth: { dark: 'rust-dark', mid: 'rust', light: 'rust-light' }, jerkin: { dark: 'leather', mid: 'hide', light: 'hide-light' } },
  bone: { id: 'bone', name: 'Pale bone', cloth: { dark: 'bone-dark', mid: 'bone', light: 'bone-light' }, jerkin: { dark: 'leather-dark', mid: 'leather', light: 'strap' } },
};

/** The scheme the game draws (075: A, Ley cobalt, until Shaun picks at the playtest). `?scheme=` swaps it in render. */
export const WANDERER_SCHEME: WandererSchemeId = 'cobalt';

/** The trim by the best rarity worn (`none`: nothing worn): the bench's rarity frame colours and glows (036). */
export interface TrimDef {
  /** A palette id, or null for the scheme's cloth light. */
  readonly color: string | null;
  readonly glow: { readonly color: string; readonly blur: number } | null;
  /** Fades between `WANDERER_TRIM_FX.pulse`'s strengths. */
  readonly pulse: boolean;
  /** A bright run along the hem, about once a second. */
  readonly shimmer: boolean;
}

export const WANDERER_TRIM: Readonly<Record<Rarity | 'none', TrimDef>> = {
  none: { color: null, glow: null, pulse: false, shimmer: false },
  common: { color: 'rock-light', glow: null, pulse: false, shimmer: false },
  fine: { color: 'cyan', glow: { color: 'cyan', blur: 2 }, pulse: false, shimmer: false },
  rare: { color: 'gold-trim', glow: { color: 'gold-trim', blur: 2.5 }, pulse: true, shimmer: false },
  relic: { color: 'wisp-light', glow: { color: 'wisp', blur: 3.5 }, pulse: true, shimmer: true },
};

/** The pulse (strength from `min` to `max` and back every `periodMs`) and the shimmer (a `length` px run of `color`). */
export const WANDERER_TRIM_FX = {
  pulse: { min: 0.8, max: 1, periodMs: 2000 },
  shimmer: { periodMs: 1000, length: 5, width: 2.2, color: 'snow', glow: { color: 'wisp-light', blur: 3 } },
  /** The trim's stroke widths, style px: the hem, the hood's edge. */
  hem: 1.9,
  edge: 1.5,
} as const;

/** The look a scheme and a trim give the parts. */
export function wandererLook(scheme: WandererScheme, trim: TrimDef): WandererLook {
  return { cloth: scheme.cloth, jerkin: scheme.jerkin, trim: { color: trim.color ?? scheme.cloth.light, glow: trim.glow } };
}

/** The rim light on the big shapes: warm near-white at about half strength, from the top left (075). */
export const WANDERER_RIM = { color: { id: 'rim-light', alpha: 0.55 } as Ink, width: 1.2, offset: 1.2 } as const;

/** A soft gradient across a box, light at its top left to dark at its bottom right. */
export function lit(t: Tone, x0: number, y0: number, x1: number, y1: number): Paint {
  return {
    linear: [x0, y0, x1, y1],
    stops: [
      { at: 0, color: t.light },
      { at: 0.45, color: t.mid },
      { at: 1, color: t.dark },
    ],
  };
}

/** A big shape: the gradient over its box, the ink outline and the rim light. */
export function big(t: Tone, box: readonly [number, number, number, number]): ShapeStyle {
  return { fill: lit(t, ...box), outline: true, rim: WANDERER_RIM };
}

/** Fixed tones every scheme shares. */
export const TONES = {
  brass: { dark: 'brass-dark', mid: 'brass', light: 'brass-light' },
  leather: { dark: 'leather-dark', mid: 'leather', light: 'strap' },
  bone: { dark: 'bone-dark', mid: 'robe', light: 'robe' },
  breeches: { dark: 'iron-dark', mid: 'iron-dark', light: 'iron' },
} as const satisfies Record<string, Tone>;
