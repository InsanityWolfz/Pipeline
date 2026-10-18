import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, GLYPH_HEIGHT, HUD_DIGITS } from '../data/assets';
import { BUILD_TIP } from '../data/hudLayout';
import { pieceDef } from '../data/pieces';
import { colorOf } from './color';
import { wrapText } from './foundryLayout';
import { GlyphLine } from './glyphLine';

// The build bar's hover panel (015): the piece's name, then its description,
// over the bar cell under the cursor. Fixed to the screen.
export class BuildTip {
  private readonly back: GameObjects.Graphics;
  private readonly lines: GlyphLine[];
  /** The piece whose tip is on show, for the test hook. */
  shown: string | null = null;

  constructor(scene: Scene) {
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.buildTip);
    this.lines = Array.from({ length: BUILD_TIP.maxLines + 1 }, () => new GlyphLine(scene, 0, 0, DEPTHS.buildTip + 1));
  }

  /** Shows a piece's tip with its bottom-centre above the cell at (x, top), clamped to the screen width; null hides it. */
  show(pieceId: string | null, x: number, top: number, screenWidth: number): void {
    this.back.clear();
    this.shown = pieceId;
    if (!pieceId) {
      for (const l of this.lines) l.setVisible(false);
      return;
    }
    const def = pieceDef(pieceId);
    const text = [def.name.toUpperCase(), ...wrapText(def.description.toUpperCase(), BUILD_TIP.wrap).slice(0, BUILD_TIP.maxLines)];
    const { pad, lineHeight, gap } = BUILD_TIP;
    const w = Math.max(...text.map((t) => t.length)) * HUD_DIGITS.advance - 1 + 2 * pad;
    const h = text.length * lineHeight - (lineHeight - GLYPH_HEIGHT) + 2 * pad;
    const left = Math.round(Math.min(Math.max(x - w / 2, pad), screenWidth - w - pad));
    const y = Math.round(top - gap - h);
    this.back.fillStyle(colorOf(BUILD_TIP.edge)).fillRect(left - 1, y - 1, w + 2, h + 2);
    this.back.fillStyle(colorOf(BUILD_TIP.back), BUILD_TIP.alpha).fillRect(left, y, w, h);
    for (const [i, l] of this.lines.entries()) {
      const t = text[i];
      l.setVisible(t !== undefined);
      if (t === undefined) continue;
      l.set(t);
      l.moveTo(left + pad, y + pad + i * lineHeight);
    }
  }
}
