import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { HOVER_NAME, MINIMAP } from '../data/hudLayout';
import { OVERWORLD } from '../data/overworld';
import { pieceRect } from '../sim/pieces';
import type { SimState } from '../sim/state';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { HoverReadout, intakeLines, pieceLines } from './HoverReadout';
import { entranceCap } from '../sim/research';
import { nameAt } from './hoverNames';

// What the cursor is over in the world (015): its name, and over a machine or the
// intake (019, 024), the readout of what it holds (006) under the name.
export class HoverView {
  private readonly readout: HoverReadout;
  private readonly back: GameObjects.Graphics;
  private readonly name: TextLine;
  /** Where materials come from, under the name (018). */
  private readonly description: TextLine;
  /** The name and description on show, for the test hook. */
  shown: string | null = null;
  shownDescription: string | null = null;

  constructor(scene: Scene) {
    this.readout = new HoverReadout(scene);
    this.back = scene.add.graphics().setDepth(DEPTHS.hoverName);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hoverName + 1, true, 'display');
    this.description = new TextLine(scene, 0, 0, DEPTHS.hoverName + 1, true);
  }

  /**
   * `point` is the world point under the cursor, or null when it's over UI;
   * `topOf` gives a drawn foundry piece's sprite top; `view` (the camera's top left) keeps panels on screen.
   */
  update(sim: SimState, shown: string, point: { x: number; y: number } | null, topOf: (id: number) => number | undefined, view: { x: number; y: number }): void {
    const viewTop = view.y;
    const hit = point ? nameAt(sim, shown, point.x, point.y) : null;
    this.shown = hit?.name ?? null;
    this.shownDescription = hit?.description ?? null;
    const piece = hit?.pieceId !== undefined ? sim.foundry.pieces.find((p) => p.id === hit.pieceId) : undefined;
    let top = hit ? hit.y - hit.rise : 0;
    /** Where the name goes when there's no room above: under the readout, or under the thing. */
    let below = hit ? hit.y : 0;
    const lines = piece ? pieceLines(piece) : hit?.intake ? intakeLines(sim.link.entrances, entranceCap(sim)) : [];
    if (piece) {
      const r = pieceRect(piece);
      const spriteTop = topOf(piece.id) ?? r.y;
      const panel = this.readout.show(lines, r.x, spriteTop, viewTop);
      top = lines.length > 0 ? panel.top : spriteTop;
      below = lines.length > 0 ? panel.bottom : hit?.y ?? 0;
    } else if (hit?.intake) {
      // The intake (019, 024): each entrance's count over its mouth, kept on screen.
      const panel = this.readout.show(lines, hit.x, hit.y, viewTop);
      top = panel.top;
      below = panel.bottom;
    } else this.readout.show([], 0, 0);
    this.back.clear();
    this.name.setVisible(hit !== null);
    this.description.setVisible(hit?.description !== undefined);
    if (!hit) return;
    this.name.set(hit.name);
    const { pad, descriptionGap } = HOVER_NAME;
    const extra = hit.description !== undefined ? descriptionGap + this.description.lineHeight : 0;
    if (hit.description !== undefined) this.description.set(hit.description);
    const w = Math.max(this.name.width, hit.description !== undefined ? this.description.width : 0);
    const h = this.name.lineHeight + extra;
    const above = top - HOVER_NAME.gap - this.name.lineHeight - extra;
    // Near the top of the view there's no room above, so the name drops below instead of covering the readout.
    let y = Math.round(above >= viewTop + pad ? above : below + HOVER_NAME.gap + pad);
    // Kept inside the view's sides (018: a long description by the view's edge), and clear of the minimap outside.
    let cx = Math.min(Math.max(hit.x, view.x + pad + w / 2), view.x + VIEW_WIDTH - pad - w / 2);
    const map = shown === OVERWORLD.id ? minimapRect(view) : null;
    const overlaps = (bx: number, by: number) => map !== null && bx - w / 2 - pad < map.x1 && bx + w / 2 + pad > map.x0 && by - pad < map.y1 && by + h + pad > map.y0;
    if (overlaps(cx, y)) y = Math.round(below + HOVER_NAME.gap + pad);
    if (map && overlaps(cx, y)) cx = map.x0 - pad - w / 2;
    this.name.moveTo(Math.round(cx - this.name.width / 2), y);
    if (hit.description !== undefined) this.description.moveTo(Math.round(cx - this.description.width / 2), y + this.name.lineHeight + descriptionGap);
    const left = Math.round(cx - w / 2);
    drawTablet(this.back, left - pad, y - pad, w + 2 * pad, h + 2 * pad, HOVER_NAME.alpha);
  }
}

/** The minimap's frame (017) in world px, for a camera whose top left is `view`. */
function minimapRect(view: { x: number; y: number }): { x0: number; y0: number; x1: number; y1: number } {
  const w = OVERWORLD.width * MINIMAP.scale + 2 * MINIMAP.frame.width;
  const h = OVERWORLD.height * MINIMAP.scale + 2 * MINIMAP.frame.width;
  const x1 = view.x + VIEW_WIDTH - MINIMAP.margin + MINIMAP.frame.width;
  const y0 = view.y + MINIMAP.margin - MINIMAP.frame.width;
  return { x0: x1 - w, y0, x1, y1: y0 + h };
}
