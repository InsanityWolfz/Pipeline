import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { HOVER_NAME, READOUT_LAYOUT } from '../data/hudLayout';
import { pieceRect } from '../sim/pieces';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';
import { HoverReadout, pieceLines } from './HoverReadout';
import { nameAt } from './hoverNames';

// What the cursor is over in the world (015): its name, and over a machine, the
// tube socket or a stager, the readout of what it holds (006) under the name.
export class HoverView {
  private readonly readout: HoverReadout;
  private readonly back: GameObjects.Graphics;
  private readonly name: GlyphLine;
  /** The name on show, for the test hook. */
  shown: string | null = null;

  constructor(scene: Scene) {
    this.readout = new HoverReadout(scene);
    const depth = DEPTHS.worldUi + 12;
    this.back = scene.add.graphics().setDepth(depth);
    this.name = new GlyphLine(scene, 0, 0, depth + 1, true);
  }

  /**
   * `point` is the world point under the cursor, or null when it's over UI;
   * `topOf` gives a drawn foundry piece's sprite top; `viewTop` keeps panels on screen.
   */
  update(sim: SimState, shown: string, point: { x: number; y: number } | null, topOf: (id: number) => number | undefined, viewTop: number): void {
    const hit = point ? nameAt(sim, shown, point.x, point.y) : null;
    this.shown = hit?.name ?? null;
    const piece = hit?.pieceId !== undefined ? sim.foundry.pieces.find((p) => p.id === hit.pieceId) : undefined;
    let top = hit ? hit.y - hit.rise : 0;
    const lines = piece ? pieceLines(piece, sim.link.reservoir) : [];
    if (piece) {
      const r = pieceRect(piece);
      const spriteTop = topOf(piece.id) ?? r.y;
      this.readout.show(lines, r.x, spriteTop, viewTop);
      top = lines.length > 0 ? this.readoutTop(lines.length, spriteTop, viewTop) : spriteTop;
    } else this.readout.show([], 0, 0);
    this.back.clear();
    this.name.setVisible(hit !== null);
    if (!hit) return;
    this.name.set(hit.name.toUpperCase());
    const w = this.name.width;
    const left = Math.round(hit.x - w / 2);
    const { pad, glyphH } = HOVER_NAME;
    const y = Math.round(Math.max(top - HOVER_NAME.gap - glyphH, viewTop + pad));
    this.name.moveTo(left, y);
    // The last glyph's advance leaves a column of space, so the backing stops one short.
    this.back.fillStyle(colorOf(HOVER_NAME.back), HOVER_NAME.alpha).fillRect(left - pad, y - pad, w + 2 * pad - 1, glyphH + 2 * pad);
  }

  /** Where the readout's panel top lands for `n` lines over a sprite top (as HoverReadout places it). */
  private readoutTop(n: number, bottom: number, viewTop: number): number {
    const L = READOUT_LAYOUT;
    const h = n * L.lineHeight + 2 * L.pad;
    return Math.round(Math.max(bottom - L.gap - h, viewTop + L.pad));
  }
}
