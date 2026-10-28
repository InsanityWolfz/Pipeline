import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../../data/assets';
import { LIGHT_POOL } from '../../data/lights';
import { colorOf } from '../color';
import type { PlacedLight } from './lightCatch';

// 074.13: Medium's lights on the ground. Each placed light is a soft pool of its colour added over the ground (a
// radial texture made once, falling off as Phaser's lights do), just over the ground and under the glows, the fog and
// everything standing: a few quads a frame, where per-pixel lighting (High) shades every lit pixel for every light.

const KEY = FX_TEXTURES.lightPool;

function makeTexture(scene: Scene): void {
  if (scene.textures.exists(KEY)) return;
  const n = LIGHT_POOL.size;
  const tex = scene.textures.createCanvas(KEY, n, n);
  const c = tex?.getContext();
  if (!tex || !c) return;
  const img = c.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const i = (y * n + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = d >= 1 ? 0 : Math.round(255 * (1 - d * d) ** 1.5);
    }
  }
  c.putImageData(img, 0, 0);
  tex.refresh();
}

export class PoolView {
  private readonly scene: Scene;
  private readonly pools: GameObjects.Image[] = [];
  private used = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    makeTexture(scene);
  }

  /** Lays a pool under each light (none when `lights` is empty). */
  place(lights: readonly PlacedLight[]): void {
    this.used = 0;
    for (const l of lights) {
      let p = this.pools[this.used];
      if (!p) {
        p = this.scene.add.image(0, 0, KEY).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.lightPool);
        this.pools.push(p);
      }
      this.used += 1;
      p.setPosition(l.x, l.y)
        .setDisplaySize(l.radius * 2, l.radius * 2)
        .setTint(colorOf(l.color))
        .setAlpha(Math.min(LIGHT_POOL.maxAlpha, LIGHT_POOL.alpha * l.intensity))
        .setVisible(true);
    }
    for (let i = this.used; i < this.pools.length; i++) this.pools[i]?.setVisible(false);
  }

  get shown(): number {
    return this.used;
  }
}
