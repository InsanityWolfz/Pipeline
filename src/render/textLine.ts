import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TEXT_STYLES, type TextStyleKey } from '../data/fonts';
import { phaserStyle } from './fonts';
import { textureScale } from './vector/textures';

/** How far the top of a capital sits below the top of the text box, as a fraction of the font size. */
const CAP_DROP = 0.3;

/**
 * A line of text in one of the bundled fonts (020). (x, y) is where the top of its
 * capitals sits, so layouts line up on the letters, not the font's box. It's fixed
 * to the screen unless `world` is set, which places it in the world like a sprite.
 * `scale` draws the style's font that much bigger (025: the tube slot's counts).
 */
export class TextLine {
  readonly obj: GameObjects.Text;
  private readonly style: TextStyleKey;
  private readonly scale: number;
  private x: number;
  private y: number;
  private text = '';

  constructor(scene: Scene, x: number, y: number, depth: number = DEPTHS.hud, world = false, style: TextStyleKey = 'body', scale = 1) {
    this.style = style;
    this.scale = scale;
    this.x = x;
    this.y = y;
    this.obj = scene.add
      .text(x, this.boxTop(y), '', phaserStyle(style, textureScale(), scale))
      .setOrigin(0)
      .setScrollFactor(world ? 1 : 0)
      .setDepth(depth);
  }

  /** Width of the current text, view px. */
  get width(): number {
    return this.text === '' ? 0 : this.obj.width;
  }

  /** Height of a line in this style, view px. */
  get lineHeight(): number {
    return TEXT_STYLES[this.style].lineHeight * this.scale;
  }

  setVisible(visible: boolean): this {
    this.obj.setVisible(visible);
    return this;
  }

  setAlpha(alpha: number): this {
    this.obj.setAlpha(alpha);
    return this;
  }

  moveTo(x: number, y: number): this {
    if (x === this.x && y === this.y) return this;
    this.x = x;
    this.y = y;
    this.obj.setPosition(x, this.boxTop(y));
    return this;
  }

  set(text: string): this {
    const shown = TEXT_STYLES[this.style].upper ? text.toUpperCase() : text;
    if (shown === this.text) return this;
    this.text = shown;
    this.obj.setText(shown);
    return this;
  }

  destroy(): void {
    this.obj.destroy();
  }

  private boxTop(y: number): number {
    return y - Math.round(TEXT_STYLES[this.style].size * this.scale * CAP_DROP);
  }
}
