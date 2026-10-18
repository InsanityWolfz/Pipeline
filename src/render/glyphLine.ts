import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, digitFrame, HUD_DIGITS } from '../data/assets';

/**
 * A line of HUD font glyphs that only rebuilds when its text changes. It's fixed to
 * the screen unless `world` is set, which places it in the world like a sprite.
 */
export class GlyphLine {
  private readonly scene: Scene;
  private readonly depth: number;
  private readonly world: boolean;
  private x: number;
  private y: number;
  private text = '';
  private visible = true;
  private alpha = 1;
  private glyphs: GameObjects.Image[] = [];

  constructor(scene: Scene, x: number, y: number, depth: number = DEPTHS.hud, world = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.depth = depth;
    this.world = world;
  }

  /** Width of the current text, px. */
  get width(): number {
    return this.text.length * HUD_DIGITS.advance;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const g of this.glyphs) g.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
    for (const g of this.glyphs) g.setAlpha(alpha);
  }

  /** Moves the line; its glyphs follow. */
  moveTo(x: number, y: number): void {
    if (x === this.x && y === this.y) return;
    for (const [i, g] of this.glyphs.entries()) g.setPosition(x + i * HUD_DIGITS.advance, y);
    this.x = x;
    this.y = y;
  }

  set(text: string): void {
    if (text === this.text) return;
    this.text = text;
    for (const g of this.glyphs) g.destroy();
    this.glyphs = [...text].map((ch, i) =>
      this.scene.add
        .image(this.x + i * HUD_DIGITS.advance, this.y, ATLAS_KEY, digitFrame(ch))
        .setOrigin(0)
        .setScrollFactor(this.world ? 1 : 0)
        .setDepth(this.depth)
        .setVisible(this.visible)
        .setAlpha(this.alpha),
    );
  }
}
