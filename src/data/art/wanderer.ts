import type { Rarity } from '../gear';
import { ellipse, path, type LimbStyle } from './types';
import { backView } from './wandererBack';
import { frontView } from './wandererFront';
import { WANDERER_SCHEME, WANDERER_SCHEMES, WANDERER_TRIM, wandererLook, type WandererSchemeId } from './wandererLook';
import { sideView } from './wandererSide';
import type { WandererView, WandererViewDef } from './wandererTypes';

// The wanderer (016), redrawn in 075 as the arcane ranger: an agile, light-armoured scout of the lost civilization in a
// close pointed hood with the faceless cyan glow, a knee-length cape in two tails, an etched leather jerkin, slim arms
// in bracers, a rune bandolier and hip quiver, two-segment legs in ranger boots, and the tube held like a minigun, its
// ringed hose clipped at the belt and running into the brass tank slung high in a harness.
//
// Units are style px: hip-local, y up the screen negative, facing right in the side view. `scale` fits them to the
// game's world px. The rig in src/render/vector/wandererRig.ts poses these parts from sim state every frame; the
// motion that poses it is src/render/vector/wandererMotion.ts, its numbers in wandererMotion.ts here.

export { WANDERER_DYNAMIC, type WandererDynamic, type WandererView, type WandererViewDef, type WandererChannel } from './wandererTypes';
export { TUBE_PARTS } from './wandererTube';
export { WANDERER_SCHEMES, WANDERER_SCHEME, WANDERER_TRIM, WANDERER_TRIM_FX, type WandererSchemeId } from './wandererLook';

/** The three views in a scheme, with the trim for the best rarity worn (null: nothing worn). */
export function wandererViews(scheme: WandererSchemeId, trim: Rarity | null): Record<WandererView, WandererViewDef> {
  const look = wandererLook(WANDERER_SCHEMES[scheme], WANDERER_TRIM[trim ?? 'none']);
  return { side: sideView(look), down: frontView(look), up: backView(look) };
}

export const WANDERER = {
  /** Style px to world px: about 42 px tall, a little over a tile. */
  scale: 0.66,
  /** The canvas the rig draws into each frame, world px, and where the feet sit in it. */
  box: { size: [72, 68], anchor: [36, 52] },
  /** The hip sits this far above the feet at rest. */
  hipHeight: 22,
  /** Rig layout, style px: where limbs bend and rest. */
  rig: {
    /** Feet stand this far apart at rest; `stance` above this spreads them. */
    restStance: 4,
    /** 075: the legs' two segments, hip to knee and knee to ankle, and the ankle's height above the sole. */
    thigh: 10.4,
    shin: 9.6,
    ankle: -2.6,
    /** Seen from the front or back, a knee sits this far out from the hip–foot line. */
    kneeOut: 0.8,
    /** The boot's shaft runs this far up the shin from the ankle; its folded cuff is this long. */
    bootShaft: 5.2,
    cuff: 1.5,
    /** 075: the arms' two segments, shoulder to elbow and elbow to wrist. */
    upperArm: 8,
    forearm: 8.4,
    /** Empty-handed, the hands hang this far from the shoulders. */
    restHand: { far: [-1, 13], near: [1, 14] },
    /** The hose enters the tube's rear from this far back along it, and this far below. */
    hoseBend: { back: 8, drop: 4 },
    /** A full punch (023): the tube thrusts this far forward along its aim (the butt jab); empty-handed, the near fist reaches this far from the shoulder. */
    jab: { thrust: 7, fist: 15 },
  },
  /** The default scheme with no trim (nothing worn): the parts the tests and the docs name. */
  views: wandererViews(WANDERER_SCHEME, null),
  limbs: {
    legFar: { width: 4.4, color: 'hood-dark', outline: true },
    legNear: { width: 4.6, color: 'iron-dark', outline: true },
    /** The wrap below the knee. */
    wrap: { width: 4.9, color: 'leather', outline: false },
    sleeveFar: { width: 3.8, color: 'bone-dark', outline: true },
    sleeveNear: { width: 4, color: 'robe', outline: true },
    bracerFar: { width: 4.2, color: 'leather-dark', outline: true },
    bracerNear: { width: 4.4, color: 'leather', outline: true },
    /** The bracer's etched line. */
    etch: { width: 0.6, color: 'cyan', outline: false },
    bootFar: { width: 5, color: 'leather-dark', outline: true },
    bootNear: { width: 5.2, color: 'leather', outline: true },
    cuff: { width: 5.8, color: 'strap', outline: true },
    hose: { width: 4.4, color: 'cyan', outline: true, bands: { color: 'cyan-deep', dash: [2.2, 2.4] } },
    hoseDormant: { width: 4.4, color: 'dormant', outline: true, bands: { color: 'dormant-dark', dash: [2.2, 2.4] } },
  } satisfies Record<string, LimbStyle>,
  /** Boots at the sole, toe along +x: side on (the far one darker), and from the front and back. */
  boot: {
    back: path('M -3 0 L 3.4 0 Q 6.2 0.2 5.6 -1.2 Q 4.2 -2.6 1.6 -3.2 L -2.8 -3.4 Q -3.8 -1.6 -3 0 Z', { fill: 'leather-dark', outline: true }),
    front: path('M -3 0 L 3.6 0 Q 6.6 0.2 5.9 -1.3 Q 4.4 -2.8 1.7 -3.3 L -2.8 -3.5 Q -3.9 -1.6 -3 0 Z', { fill: 'leather', outline: true }),
    toward: path('M -2.7 -0.2 Q -3.2 -3.4 0 -3.6 Q 3.2 -3.4 2.7 -0.2 Q 0 1.6 -2.7 -0.2 Z', { fill: 'leather', outline: true }),
    away: path('M -2.6 0 Q -3 -3.2 0 -3.4 Q 3 -3.2 2.6 0 Q 0 0.8 -2.6 0 Z', { fill: 'leather-dark', outline: true }),
  },
  /** A fingerless glove, and the bracer's brass rivet. */
  hand: ellipse(0, 0, 2.3, 2.3, { fill: 'leather-dark', outline: true }),
  rivet: ellipse(0, 0, 0.8, 0.8, { fill: 'brass' }),
} as const;

/**
 * Render-side feel the motion doesn't own (016, 075): the aim, the facing band, the roll's smear, glows and flow.
 */
export const WANDERER_FEEL = {
  /** The punch (023): full on its tick, easing back over `ticks` sim ticks; the body leans and shifts into it. */
  jab: { ticks: 10, lean: 0.12, push: 2 },
  /** One 60 Hz frame, ms, and the longest frame the feel steps over at once. */
  frameMs: 16.7,
  maxFrameMs: 100,
  /** Face glow: rest, pulse depth and speed, and on a shot. */
  glow: { rest: 0.78, pulse: 0.12, speed: 0.004, shot: 1 },
  /** Muzzle glow at rest and on a shot. */
  muzzle: { rest: 0.6, shot: 1 },
  /** Hose and tank flow, px per ms: idle and firing. */
  flow: { idle: 0.01, firing: 0.09 },
  /** The roll's smear: ghost copies this far back along the roll, world px, at this opacity. */
  smear: { steps: [10, 5], alpha: 0.22 },
  /** The tube's aim is limited to this far either side of each view's axis. */
  aimSpread: 0.85,
  /** Aim from this high above the feet, world px. */
  aimHeight: 14,
  /**
   * The sprite turns to the other axis only once the aim leads on it by this many world px. The aim is read once a
   * frame but a frame steps 0 to 2 ticks, so walking one diagonal with the cursor on the other swings the aim across
   * the 45° tie by up to two ticks' walk (about 5.7 px): without this the sprite flipped every frame.
   */
  facingBand: 6,
} as const;
