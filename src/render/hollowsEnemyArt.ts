import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { HOLLOWS_ENEMY_LOOK, HOLLOWS_ENEMY_SPRITES } from '../data/hollowsEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';
import { addVector, showFrame } from './vector/textures';

// What Region 2's four (035) show beyond their sprite and ground telegraph, for EnemyView:
// a Burrower underground as its ripple, a moving mound of cracked earth, its body hidden;
// a Shardback's crystals flaring on its shield as it winds up its bash.

export interface HollowsArt {
  ripple?: GameObjects.Image;
  /** Light added over the sprite: the Shardback's flare. */
  light?: GameObjects.Graphics;
}

/** The extras an enemy of these kinds needs, made once with its sprite. */
export function makeHollowsArt(scene: Scene, def: EnemyDef): HollowsArt | undefined {
  if (def.kind === 'burrower') return { ripple: addVector(scene, 0, 0, HOLLOWS_ENEMY_SPRITES.ripple[0]).setVisible(false) };
  if (def.kind === 'shardback') return { light: scene.add.graphics().setBlendMode(BlendModes.ADD) };
  return undefined;
}

/** Shows the extras for this frame; hides the body while it's under the ground. */
export function drawHollowsArt(art: HollowsArt | undefined, sprite: GameObjects.Sprite, e: EnemyState, def: EnemyDef, now: number): void {
  sprite.setVisible(!e.underground);
  if (art?.light && def.kind === 'shardback') drawFlare(art.light, e, def.bash.windupTicks, now);
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

/** The Shardback's crystals flaring on its shield through the wind-up, flickering, brighter as the bash nears. */
function drawFlare(g: GameObjects.Graphics, e: EnemyState, windupTicks: number, now: number): void {
  g.clear();
  if (e.mode !== 'windup') return;
  const F = HOLLOWS_ENEMY_LOOK.flare;
  const k = Math.min(1, e.modeTicks / windupTicks);
  const flicker = 0.8 + 0.2 * Math.sin((now / F.pulseMs) * Math.PI * 2);
  const x = e.x + Math.cos(e.angle) * F.ahead;
  const y = e.y + Math.sin(e.angle) * F.ahead * 0.5 - F.rise;
  g.setDepth(e.y + DEPTHS.overlayNudge + 1);
  g.fillStyle(colorOf(F.color), F.alpha * k * flicker).fillCircle(x, y, F.radius * (0.5 + 0.5 * k));
}

export function destroyHollowsArt(art: HollowsArt | undefined): void {
  art?.ripple?.destroy();
  art?.light?.destroy();
}
