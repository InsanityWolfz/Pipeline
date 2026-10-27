import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../../data/assets';
import { FOG_LOOK } from '../../data/moods';
import type { Rgb } from './mood';
import { rgbInt } from './mood';

// 074: the region's fog, a soft haze hugging the ground: a tileable blob texture baked once, drawn as one or two
// TileSprites covering the view at a depth over the glows and under the ground decals (telegraphs) and anything
// standing. The texture is fixed to the world and drifts, so the haze doesn't slide with the camera.

const KEY = FX_TEXTURES.fog;

/** A small fixed hash, so the fog's blobs are the same every boot. */
const hash = (i: number): number => {
  let h = (i + 1) * 0x9e3779b1;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 0xffffffff;
};

/** Smooth tileable value noise at (x, y) on a `cells`-cell lattice over `size` px, 0..1. */
function noise(x: number, y: number, cells: number, size: number, seed: number): number {
  const fx = (x / size) * cells;
  const fy = (y / size) * cells;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const sx = fx - x0;
  const sy = fy - y0;
  const at = (cx: number, cy: number) => hash((((cx % cells) + cells) % cells) + (((cy % cells) + cells) % cells) * cells + seed * 1000);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * ease(sx);
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * ease(sx);
  return top + (bottom - top) * ease(sy);
}

/** Soft drifting wisps: two octaves of tileable value noise, thresholded softly into white at varying alpha. */
function makeTexture(scene: Scene): void {
  if (scene.textures.exists(KEY)) return;
  const F = FOG_LOOK;
  const tex = scene.textures.createCanvas(KEY, F.size, F.size);
  const c = tex?.getContext();
  if (!tex || !c) return;
  const img = c.createImageData(F.size, F.size);
  for (let y = 0; y < F.size; y++) {
    for (let x = 0; x < F.size; x++) {
      const n = noise(x, y, F.cells[0], F.size, 1) * 0.65 + noise(x, y, F.cells[1], F.size, 2) * 0.35;
      const t = Math.min(1, Math.max(0, (n - F.floor) / (1 - F.floor)));
      const i = (y * F.size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
  }
  c.putImageData(img, 0, 0);
  tex.refresh();
}

export class FogView {
  private readonly layers: GameObjects.TileSprite[];
  private drift = 0;
  private shown = 0;

  constructor(scene: Scene) {
    makeTexture(scene);
    this.layers = FOG_LOOK.layers.map((l) => scene.add.tileSprite(0, 0, 8, 8, KEY).setOrigin(0).setDepth(DEPTHS.fog).setTileScale(l.scale).setVisible(false));
  }

  /** Lays the fog over `view` (world px): `layers` of it (0 hides it), its colour, alpha and drift speed px/s. */
  update(view: { x: number; y: number; width: number; height: number }, layers: number, fog: { rgb: Rgb; alpha: number; speed: number }, deltaMs: number): void {
    this.drift += (fog.speed * deltaMs) / 1000;
    const on = fog.alpha > 0.001 ? layers : 0;
    this.shown = on;
    const pad = 8;
    for (const [i, s] of this.layers.entries()) {
      const L = FOG_LOOK.layers[i];
      if (!L || i >= on) {
        s.setVisible(false);
        continue;
      }
      const x = Math.floor(view.x) - pad;
      const y = Math.floor(view.y) - pad;
      const d = this.drift * L.speed;
      s.setVisible(true)
        .setPosition(x, y)
        .setSize(Math.ceil(view.width) + 2 * pad, Math.ceil(view.height) + 2 * pad)
        .setTint(rgbInt(fog.rgb))
        .setAlpha(fog.alpha * L.alpha);
      s.setTilePosition((x - d * L.dir[0]) / L.scale, (y - d * L.dir[1]) / L.scale);
    }
  }

  /** Fog layers drawn now. */
  get layersShown(): number {
    return this.shown;
  }
}
