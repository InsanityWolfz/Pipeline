import type { Part, PathCmd, Shape } from './types';

// The wanderer rig's shapes of data (016, redrawn as the arcane ranger in 075): what a view holds, and the look a
// scheme and a trim give it. The parts themselves are in wandererSide.ts, wandererFront.ts and wandererBack.ts.

export type WandererView = 'side' | 'down' | 'up';

type Pt = readonly [number, number];

/** Dynamic pieces the rig draws itself, by token in a view's draw order. */
export const WANDERER_DYNAMIC = ['@far-arm', '@near-arm', '@far-leg', '@near-leg', '@hose', '@tube', '@window', '@bubble', '@glow', '@shimmer', '@flash'] as const;
export type WandererDynamic = (typeof WANDERER_DYNAMIC)[number];

/** Pose channels that swing parts hung on a joint (075): the cape and its tails, the hood's tail, the skirt's flaps. */
export type WandererChannel = 'cape' | 'capeTail' | 'hoodTail' | 'skirtFront' | 'skirtBack';

/**
 * A joint parts hang on. `turn` rotates by the channel; the cape's joint seen from the front or back (`flare`) turns by
 * its sway only and stretches by its trail (`stretch`: x and y scale per radian of trail), as a cape blown back
 * toward or away from the camera.
 */
export interface WandererJoint {
  readonly at: Pt;
  readonly kind: 'turn' | 'flare';
  readonly stretch?: Pt;
}

/** A dark, a mid and a light palette id. */
export interface Tone {
  readonly dark: string;
  readonly mid: string;
  readonly light: string;
}

/** What a view's parts are drawn in: the scheme's cloth (hood, cowl and cape) and jerkin, and the trim's look. */
export interface WandererLook {
  readonly cloth: Tone;
  readonly jerkin: Tone;
  /** The rarity trim on the hem, the hood's edge and the clasp gem: a colour and, above common, a glow. */
  readonly trim: { readonly color: string; readonly glow: { readonly color: string; readonly blur: number } | null };
}

export interface WandererViewDef {
  /** Draw order: part ids and dynamic tokens. */
  readonly order: readonly (string | WandererDynamic)[];
  readonly parts: readonly Part[];
  /** Joints by channel, and the channels each swinging part hangs on, outermost first. */
  readonly joints: Partial<Record<WandererChannel, WandererJoint>>;
  readonly chains: Readonly<Record<string, readonly WandererChannel[]>>;
  /** Parts that ride the tank in its harness (bobbing and squashing about `tankBase`). */
  readonly tankParts: readonly string[];
  readonly tankBase: Pt;
  /** Parts drawn in the trim (the rare's pulse fades them), and the hem the relic's shimmer runs along. */
  readonly trimParts: readonly string[];
  readonly hem?: { readonly part: string; readonly d: readonly PathCmd[] };
  /** Where each arm leaves the body, hip-local. */
  readonly shoulders: { readonly far: Pt; readonly near: Pt };
  /** Where each leg leaves the hips, hip-local. */
  readonly hips: { readonly far: Pt; readonly near: Pt };
  /** The tube's pivot, hip-local. */
  readonly gunPivot: Pt;
  /** The hose leaves the tank here (it rides the tank), runs through the belt's clip, and bends by `sag` on the way. */
  readonly hose: { readonly from: Pt; readonly clip: Pt; readonly sag: Pt };
  /** The tank window (lit or dormant) and the bubble rising in it. */
  readonly window?: { readonly lit: string; readonly dormant: string; readonly bubble: Shape; readonly rise: number };
  /** The face glow, or none (seen from behind). */
  readonly glow?: Shape;
  /** 075.2: the upper arms' sleeves, near and far: the cape's dark tone, so the near arm doesn't read as a pale bar. */
  readonly sleeves: { readonly near: string; readonly far: string };
  /** 050 (A.1): both arms alike, the far one mirrored, so facing forward they match. */
  readonly matchedArms?: boolean;
}
