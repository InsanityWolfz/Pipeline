import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { HP_BAR } from '../data/hudPanels';
import { colorOf } from './color';

// The low-HP screen edges (031): a red tint round the screen's edges, pulsing with
// the HP bar below a quarter health, drawn over the room's mood and under the HUD
// and menus. Fixed to the screen.
export class EdgeTint {
  private readonly image: GameObjects.Image;

  constructor(scene: Scene) {
    makeTexture(scene);
    this.image = scene.add.image(0, 0, FX_TEXTURES.lowHp).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.lowHp);
    this.image.setTint(colorOf(HP_BAR.edge.color)).setVisible(false);
  }

  /** `low` shows it; `pulse` (0 to 1) swells it with the bar. */
  update(low: boolean, pulse: number): void {
    const { alpha, floor } = HP_BAR.edge;
    this.image.setVisible(low).setAlpha(alpha * (floor + (1 - floor) * pulse));
  }
}

/** A white edge gradient over the 640x360 view, clear in the middle and strongest in the corners, tinted when shown. Drawn once. */
function makeTexture(scene: Scene): void {
  if (scene.textures.exists(FX_TEXTURES.lowHp)) return;
  const tex = scene.textures.createCanvas(FX_TEXTURES.lowHp, VIEW_WIDTH, VIEW_HEIGHT);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return;
  // An ellipse fitted to the screen (squashed from a circle), so the long edges tint as much as the short ones.
  const squash = VIEW_HEIGHT / VIEW_WIDTH;
  const r = (VIEW_WIDTH / 2) * Math.SQRT2;
  ctx.setTransform(1, 0, 0, squash, 0, 0);
  const grad = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_WIDTH / 2, r * HP_BAR.edge.inner, VIEW_WIDTH / 2, VIEW_WIDTH / 2, r);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_WIDTH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  tex.refresh();
}
