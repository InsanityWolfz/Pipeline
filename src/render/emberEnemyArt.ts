import type { GameObjects, Scene } from 'phaser';
import type { EnemyDef } from '../data/enemies';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import type { EnemyState } from '../sim/enemies';

// What the Emberworks' enemies (061) show beyond their sprite and ground telegraph, for EnemyView (through
// hollowsEnemyArt.ts): a cinder mote swelling with its wind-up.

export interface EmberArt {
  /** Light drawn over the world (061: kept for the tender's beam and its target's glow). */
  light?: GameObjects.Graphics;
}

/** The extras an enemy of these kinds needs, made once with its sprite; undefined for any other kind. */
export function makeEmberArt(_scene: Scene, def: EnemyDef): EmberArt | undefined {
  if (def.kind === 'mote') return {};
  return undefined;
}

/** Shows the extras for this frame. */
export function drawEmberArt(_art: EmberArt | undefined, sprite: GameObjects.Sprite, e: EnemyState, def: EnemyDef): void {
  // The mote swells as its burst nears.
  if (def.kind === 'mote' && e.mode === 'windup') sprite.setScale(sprite.scaleX * (1 + EMBER_ENEMY_LOOK.swell.grow * Math.min(1, e.modeTicks / def.swell.windupTicks)));
}

export function destroyEmberArt(art: EmberArt | undefined): void {
  art?.light?.destroy();
}
