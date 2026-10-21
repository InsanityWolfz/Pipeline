import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { INVENTORY_GRID } from '../data/hudPanels';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import type { ShownSlot } from './inventoryRows';
import { TextLine } from './textLine';
import { addVector, showFrame } from './vector/textures';

// The grid panel's drawing pieces (047, split out in 052 for the stash's grid): one
// cell (its frame, icon, count and warning mark) and a scroll bar.

/** One drawn cell: its frame, icon, count and warning mark. */
export interface CellView {
  frame: GameObjects.Image;
  icon: GameObjects.Image;
  count: TextLine;
  warn: GameObjects.Image;
}

export function makeCell(scene: Scene): CellView {
  return {
    frame: addVector(scene, 0, 0, SPRITES.hudAmmoCell).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 1),
    icon: addVector(scene, 0, 0, SPRITES.iconArrow).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 2),
    count: new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, 'count'),
    warn: addVector(scene, 0, 0, SPRITES.hudWarn).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 3),
  };
}

/** Draws a cell at `box` (hidden unless `shown`), holding `s` if given: its icon, count (rust while any is at risk) and mark. */
export function drawCell(c: CellView | undefined, s: ShownSlot | undefined, box: ScreenBox, shown: boolean): void {
  if (!c) return;
  const C = INVENTORY_GRID.cell;
  c.frame.setVisible(shown).setPosition(box.x, box.y);
  const full = shown && s !== undefined;
  c.icon.setVisible(full);
  c.count.setVisible(full);
  c.warn.setVisible(full && (s?.atRisk ?? 0) > 0);
  if (!full || !s) return;
  showFrame(c.icon, s.icon).setOrigin(0).setPosition(box.x + C.icon.x, box.y + C.icon.y);
  c.count.set(String(s.count)).moveTo(box.x + C.count.x, box.y + C.count.y);
  c.count.setFill(s.atRisk > 0 ? INVENTORY_GRID.colors.risk : undefined);
  c.warn.setPosition(box.x + C.warn.x, box.y + C.warn.y);
}

/** A scroll bar on `track`: a thumb the shown rows' share of `rows` long, at the first shown row `at`. */
export function drawScrollBar(g: GameObjects.Graphics, track: ScreenBox, rows: number, shownRows: number, at: number): void {
  const S = INVENTORY_GRID.scroll;
  const thumb = Math.max(S.minThumb, Math.round((track.h * Math.min(rows, shownRows)) / rows));
  const y = rows > shownRows ? Math.round(((track.h - thumb) * at) / (rows - shownRows)) : 0;
  g.fillStyle(colorOf(S.track), S.trackAlpha).fillRect(track.x, track.y, track.w, track.h);
  g.fillStyle(colorOf(S.thumb), 1).fillRect(track.x, track.y + y, track.w, thumb);
}
