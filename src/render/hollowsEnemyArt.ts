import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { HOLLOWS_ENEMY_LOOK, HOLLOWS_ENEMY_SPRITES } from '../data/hollowsEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { addVector, showFrame } from './vector/textures';

// What Region 2's four (035) show beyond their sprite and ground telegraph, for EnemyView:
// a Burrower underground as its ripple, a moving mound of cracked earth, its body hidden.

export interface HollowsArt {
  ripple?: GameObjects.Image;
}

/** The extras an enemy of these kinds needs, made once with its sprite. */
export function makeHollowsArt(scene: Scene, def: EnemyDef): HollowsArt | undefined {
  if (def.kind === 'burrower') return { ripple: addVector(scene, 0, 0, HOLLOWS_ENEMY_SPRITES.ripple[0]).setVisible(false) };
  return undefined;
}

/** Shows the extras for this frame; hides the body while it's under the ground. */
export function drawHollowsArt(art: HollowsArt | undefined, sprite: GameObjects.Sprite, e: EnemyState, now: number): void {
  sprite.setVisible(!e.underground);
  if (!art?.ripple) return;
  art.ripple.setVisible(e.underground);
  if (!e.underground) return;
  // The mound heaves while it moves, and lies still while its ring grows.
  const moving = Math.hypot(e.vx, e.vy) > HOLLOWS_ENEMY_LOOK.ripple.minSpeed;
  const frame = moving ? Math.floor((now + e.id * 97) / HOLLOWS_ENEMY_LOOK.ripple.wobbleMs) % 2 : 0;
  const name = HOLLOWS_ENEMY_SPRITES.ripple[frame] ?? HOLLOWS_ENEMY_SPRITES.ripple[0];
  if (art.ripple.frame.name !== name) showFrame(art.ripple, name);
  art.ripple.setPosition(Math.round(e.x), Math.round(e.y + 4)).setDepth(DEPTHS.groundFx + 0.1);
}

export function destroyHollowsArt(art: HollowsArt | undefined): void {
  art?.ripple?.destroy();
}
