import { TintModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, WANDERER_KEY } from '../data/assets';
import { PLAYER_SILHOUETTE } from '../data/silhouette';
import { colorOf } from './color';
import { bodyBox, hiddenBehind, type Occluders } from './occluders';

/** How far from the feet a registered prop's position may be and still be measured, px (the tallest props' height). */
const REACH = 96;

// 070: while a ruin block, a grove tree, the bench or a machine stands in front of the player and hides them, the
// player shows through it as a soft silhouette: the wanderer's own frame drawn again over every prop, filled with a
// faint tint inside a pale rim (as a node's glow is drawn, 051). Only the player has one.
export class SilhouetteView {
  private readonly rim: GameObjects.Image;
  private readonly fill: GameObjects.Image;
  /** Whether it shows now (`ui().silhouette`). */
  shown = false;
  private readonly occluders: Occluders;

  /** Made after PlayerView, whose canvas texture it shares. */
  constructor(scene: Scene, occluders: Occluders) {
    this.occluders = occluders;
    const S = PLAYER_SILHOUETTE;
    const add = (color: string, alpha: number, depth: number) =>
      scene.add.image(0, 0, WANDERER_KEY).setTint(colorOf(color)).setTintMode(TintModes.FILL).setAlpha(alpha).setDepth(depth).setVisible(false);
    this.rim = add(S.rim.color, S.rim.alpha, DEPTHS.silhouette);
    this.fill = add(S.tint, S.alpha, DEPTHS.silhouette + 0.5);
  }

  /** Follows the player's sprite; `visible` false (another room, or the KO's fall) hides it. */
  update(player: GameObjects.Image, visible: boolean): void {
    const body = bodyBox(player.x, player.y);
    this.shown = visible && player.visible && hiddenBehind(body, this.occluders.near(player.x, player.y, REACH), PLAYER_SILHOUETTE.cover);
    this.rim.setVisible(this.shown);
    this.fill.setVisible(this.shown);
    if (!this.shown) return;
    for (const o of [this.rim, this.fill]) o.setOrigin(player.originX, player.originY).setPosition(player.x, player.y).setScale(player.scaleX, player.scaleY).setFlipX(player.flipX);
    // The rim: the same frame a little bigger round the body's middle, so it shows as an outline behind the fill.
    const px = PLAYER_SILHOUETTE.rim.px;
    const cx = player.x;
    const cy = player.y - PLAYER_SILHOUETTE.body.h / 2;
    const kx = 1 + (2 * px) / Math.max(1, player.displayWidth);
    const ky = 1 + (2 * px) / Math.max(1, player.displayHeight);
    this.rim.setScale(player.scaleX * kx, player.scaleY * ky).setPosition(cx + (player.x - cx) * kx, cy + (player.y - cy) * ky);
  }
}
