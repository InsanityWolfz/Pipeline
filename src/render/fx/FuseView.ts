import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { SHOT_FX_TEXTURES } from '../../data/assets';
import { FX_LOOK } from '../../data/fxQuality';
import { colorOf } from '../color';
import { textureScale } from '../vector/textures';
import { Pool } from './fxPool';
import { FLASH_PX, makeShotTextures } from './shotTextures';

// 078 review: a bomb's and a bomblet's fuse glint in flight: a small star at the fuse tip, just in front of the round,
// twinkling (steady with Flashes off), additive on Medium and High. Pooled images, placed afresh each frame.

export class FuseView {
  private readonly pool: Pool<GameObjects.Image>;
  private readonly unit: number;
  private time = 0;

  constructor(scene: Scene) {
    makeShotTextures(scene);
    this.unit = 1 / textureScale();
    this.pool = new Pool(() => scene.add.image(0, 0, SHOT_FX_TEXTURES.star).setVisible(false).setTint(colorOf(FX_LOOK.fuseGlint.color)));
  }

  /** A new frame: last frame's glints go back to the pool. */
  begin(deltaMs: number): void {
    this.time += deltaMs;
    for (const g of this.pool.live) g.setVisible(false);
    this.pool.releaseAll();
  }

  /** A fuse's glint at a drawn point, over a round drawn at `depth`; `phase` keeps neighbours out of step. */
  glint(x: number, y: number, depth: number, phase: number, flashes: boolean, additive: boolean): void {
    const G = FX_LOOK.fuseGlint;
    const wave = flashes ? 0.5 + 0.5 * Math.sin((this.time / 1000) * G.hz * Math.PI * 2 + phase) : 1;
    const k = G.min + (1 - G.min) * wave;
    this.pool
      .take()
      .setPosition(x, y)
      .setDepth(depth + 0.01)
      .setScale((G.size / FLASH_PX) * this.unit * k)
      .setRotation(phase)
      .setAlpha(G.alpha)
      .setBlendMode(additive ? BlendModes.ADD : BlendModes.NORMAL)
      .setVisible(true);
  }

  get count(): number {
    return this.pool.live.length;
  }

  clear(): void {
    this.begin(0);
  }
}
