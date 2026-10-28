import type { AnimDef } from './assets';
import { FIXTURE_SPRITES } from './foundryAssets';

// Room dressing (014). Props are looks only: none has collision of its own.
// - `block` props stand on a ruin block tile (B) and replace its look, so they're solid through the tile.
// - `wall` props stand at the foot of a wall face (a wall tile with floor below), against the wall.
// - `side` props (079) stand on a side wall's top with floor beside it, reaching into the room (mirrored on the east wall).
// - `floor` props lie flat under everything; `standing` ones sort by their foot like the player.

export type PropLayer = 'block' | 'wall' | 'side' | 'floor' | 'standing';

export interface PropDef {
  anim: AnimDef;
  layer: PropLayer;
  /** Wall props: how far below the wall's foot the sprite's bottom sits, px (negative hangs it up the face). */
  drop?: number;
  /** A soft light around it: a palette id, and its radius in px. */
  glow?: { color: string; radius: number };
  /** 079: the light it gives in the foundry, a key into `FOUNDRY_LIGHTS.walls` (src/data/lights.ts). */
  light?: string;
}

const loop = (key: string, frames: number, frameRate: number): AnimDef => ({ key, frames, frameRate, loop: true });

/** The prop ids (017: only the foundry's dressing is left; the overworld draws its own in vector). 044: the sandbox's bench. */
export type PropId = 'banner' | 'brazier' | 'bench' | 'torch';

export const PROPS: Readonly<Record<PropId, PropDef>> = {
  banner: { anim: loop('prop-banner', 2, 1.5), layer: 'wall', drop: -6 },
  brazier: { anim: loop('prop-brazier', 4, 9), layer: 'wall', drop: 6, glow: { color: 'cinder', radius: 64 }, light: 'brazier' },
  // 079: a brass wall sconce on a side wall's top, an iron cup and a four-frame flame (the brazier's, smaller).
  torch: { anim: loop('prop-torch', 4, 6), layer: 'side', drop: -8, glow: { color: 'cinder', radius: 40 }, light: 'torch' },
  // 044: the identification bench (036) on its block in the sandbox, so the stash's gear can be worn there.
  bench: { anim: FIXTURE_SPRITES.bench, layer: 'block' },
};

/** A prop in a room, by tile. */
export interface PropPlacement {
  propId: PropId;
  tx: number;
  ty: number;
}
