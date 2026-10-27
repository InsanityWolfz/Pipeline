import { LEY_FLOW, RIPPLES } from '../ambient';
import { AMBIENT_FRAMES } from '../worldArtAssets';
import { one } from './decorParts';
import { EMBER_DECOR } from './decorEmber';
import { HOLLOWS_DECOR } from './decorHollows';
import { MEADOW_DECOR } from './decorMeadow';
import { STORM_DECOR } from './decorStorm';
import { MEADOW_SET_PIECES } from './setPiecesMeadow';
import { HOLLOWS_SET_PIECES } from './setPiecesHollows';
import { EMBER_SET_PIECES } from './setPiecesEmber';
import { STORM_SET_PIECES } from './setPiecesStorm';
import { ellipse, line, type VectorSprite } from './types';

// 077: every sprite of the world's detail, set pieces and ambient motion, for the vector catalog (baked at boot) and
// the contact sheet. The ripple ring and glint are white, tinted per pond or spring; the ley bead is drawn in its colour.

/** A water ripple's ring, 20 px across (render scales it to its width), squashed to half its height; white. */
const RIPPLE = one(AMBIENT_FRAMES.ripple, [24, 14], [12, 7], [ellipse(0, 0, 10, 10 * RIPPLES.squash, { stroke: { color: 'snow', width: 1.1 } })]);

/** High's twinkling glint on a pond: a small four-point star; white. */
const GLINT = one(AMBIENT_FRAMES.glint, [8, 8], [4, 4], [line([-3, 0, 3, 0], 0.6, 'snow'), line([0, -2, 0, 2], 0.6, 'snow'), ellipse(0, 0, 0.9, 0.9, { fill: 'snow' })]);

/** A ley bead: a soft streak of light LEY_FLOW.length px long, its head bright, pointing along +x (render turns it along the line). */
const HALF = LEY_FLOW.length / 2;
const BEAD = one(AMBIENT_FRAMES.bead, [LEY_FLOW.length * 2, 6], [LEY_FLOW.length, 3], [{ ...line([-HALF, 0, HALF, 0], 1.8, LEY_FLOW.color), glow: { color: 'cyan', blur: 3 } }, ellipse(HALF - 0.8, 0, 1.1, 0.9, { fill: 'snow' })]);

export const WORLD_ART_SPRITES: readonly VectorSprite[] = [
  ...MEADOW_DECOR,
  ...HOLLOWS_DECOR,
  ...EMBER_DECOR,
  ...STORM_DECOR,
  ...MEADOW_SET_PIECES,
  ...HOLLOWS_SET_PIECES,
  ...EMBER_SET_PIECES,
  ...STORM_SET_PIECES,
  RIPPLE,
  GLINT,
  BEAD,
];
