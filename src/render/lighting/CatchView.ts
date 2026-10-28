import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { Quality } from '../../data/settings';
import { catchAt, lightsFor, type PlacedLight } from './lightCatch';

// 074: the light catch. The readability layer (enemies, the player, ground items) is never darkened by a mood; lights
// reach it only as this: an additive copy of its frame in the light's colour, at most 0.35 alpha, just in front of it.
// Views offer their sprites from the loops they already run each frame, and only sprites in view are looked at; the
// copies come from a pool and are hidden when not needed.

type Lit = GameObjects.Image | GameObjects.Sprite;
type View = { x: number; y: number; width: number; height: number };

/** A catch as drawn, for the test hook: whose (an enemy's id, `player` or an item's id) and its colour and alpha. */
export interface CatchShown {
  kind: 'enemy' | 'player' | 'item';
  id: number;
  color: number;
  alpha: number;
}

const PAD = 48;

export class CatchView {
  private readonly scene: Scene;
  private readonly pool: GameObjects.Image[] = [];
  private used = 0;
  private lights: readonly PlacedLight[] = [];
  private playerLights: readonly PlacedLight[] = [];
  private quality: Quality = 'low';
  private view: View = { x: 0, y: 0, width: 0, height: 0 };
  shown: CatchShown[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** Starts a frame's catches from the lights placed now. */
  begin(lights: readonly PlacedLight[], quality: Quality, view: View): void {
    this.lights = lights;
    this.playerLights = lightsFor('player', lights);
    this.quality = quality;
    this.view = view;
    this.used = 0;
    this.shown = [];
  }

  /** A sprite whose feet stand at (x, y) is offered the catch; it gets one if a light reaches its feet. */
  offer(sprite: Lit, x: number, y: number, kind: CatchShown['kind'], id: number): void {
    if (this.lights.length === 0 || !sprite.visible || sprite.alpha <= 0) return;
    const v = this.view;
    if (x < v.x - PAD || x > v.x + v.width + PAD || y < v.y - PAD || y > v.y + v.height + PAD) return;
    const c = catchAt(x, y, kind === 'player' ? this.playerLights : this.lights, this.quality);
    if (!c) return;
    let copy = this.pool[this.used];
    if (!copy) {
      copy = this.scene.add.image(0, 0, sprite.texture.key).setBlendMode(BlendModes.ADD);
      this.pool.push(copy);
    }
    this.used += 1;
    copy
      .setTexture(sprite.texture.key, sprite.frame.name)
      .setPosition(sprite.x, sprite.y)
      .setOrigin(sprite.originX, sprite.originY)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlip(sprite.flipX, sprite.flipY)
      .setRotation(sprite.rotation)
      .setDepth(sprite.depth + 0.001)
      .setTint(c.color)
      .setAlpha(c.alpha * sprite.alpha)
      .setVisible(true);
    this.shown.push({ kind, id, color: c.color, alpha: c.alpha });
  }

  /** Hides the copies this frame didn't use. */
  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]?.setVisible(false);
  }
}
