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

const loop = (key: string, frames: number, frameRate: number): AnimDef => ({ key, frames, frameRate, loop: true });

/** The prop ids (017: only the foundry's dressing is left; the overworld draws its own in vector). */
export type PropId = 'banner' | 'brazier';

export const PROPS: Readonly<Record<PropId, PropDef>> = {
  banner: { anim: loop('prop-banner', 2, 1.5), layer: 'wall', drop: -6 },
  brazier: { anim: loop('prop-brazier', 4, 9), layer: 'wall', drop: 6, glow: { color: 'ember-light', radius: 48 } },
};

/** A prop in a room, by tile. */
export interface PropPlacement {
  propId: PropId;
  tx: number;
  ty: number;
}
