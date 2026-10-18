import type { AnimDef } from './assets';

// Room dressing (014). Props are looks only: none has collision of its own.
// - `block` props stand on a ruin block tile (B) and replace its look, so they're solid through the tile.
// - `wall` props stand at the foot of a wall face (a wall tile with floor below), against the wall.
// - `floor` props lie flat under everything; `standing` ones sort by their foot like the player.

export type PropLayer = 'block' | 'wall' | 'floor' | 'standing';

export interface PropDef {
  anim: AnimDef;
  layer: PropLayer;
  /** Wall props: how far below the wall's foot the sprite's bottom sits, px (negative hangs it up the face). */
  drop?: number;
  /** A soft light around it: a palette id, and its radius in px. */
  glow?: { color: string; radius: number };
}

const still = (key: string): AnimDef => ({ key, frames: 1, frameRate: 1, loop: true });
const loop = (key: string, frames: number, frameRate: number): AnimDef => ({ key, frames, frameRate, loop: true });

export const PROPS = {
  column: { anim: still('prop-column'), layer: 'block' },
  runestone: { anim: loop('prop-runestone', 2, 1.5), layer: 'block', glow: { color: 'ley-cyan', radius: 18 } },
  tuft: { anim: loop('prop-tuft', 4, 3), layer: 'standing' },
  mushrooms: { anim: still('prop-mushrooms'), layer: 'standing' },
  rubble: { anim: still('prop-rubble'), layer: 'floor' },
  'ley-crack': { anim: loop('prop-ley-crack', 2, 2), layer: 'floor', glow: { color: 'ley-cyan', radius: 22 } },
  vines: { anim: still('prop-vines'), layer: 'wall', drop: -2 },
  banner: { anim: loop('prop-banner', 2, 1.5), layer: 'wall', drop: -6 },
  brazier: { anim: loop('prop-brazier', 4, 9), layer: 'wall', drop: 6, glow: { color: 'ember-light', radius: 48 } },
} as const satisfies Record<string, PropDef>;

export type PropId = keyof typeof PROPS;

/** A prop in a room, by tile. */
export interface PropPlacement {
  propId: PropId;
  tx: number;
  ty: number;
}
