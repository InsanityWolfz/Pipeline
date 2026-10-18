import type { GameObjects } from 'phaser';
import { TABLET } from '../data/hudLayout';
import { colorOf } from './color';

/**
 * Draws a carved stone tablet with brass corners on `g` (020): the look of the
 * HUD's vector tablets, for panels whose size changes (menus, readouts, the
 * objective line, names). `alpha` scales the whole panel.
 */
export function drawTablet(g: GameObjects.Graphics, x: number, y: number, w: number, h: number, alpha = 1): void {
  const T = TABLET;
  g.fillStyle(colorOf(T.edge), alpha).fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(colorOf(T.fill), T.fillAlpha * alpha).fillRect(x, y, w, h);
  g.fillStyle(colorOf(T.bevel), alpha).fillRect(x + 1, y, w - 2, 1);
  g.fillStyle(colorOf(T.base), alpha).fillRect(x + 1, y + h - 1, w - 2, 1);
  const arm = Math.min(T.corner, Math.floor(Math.min(w, h) / 3));
  g.fillStyle(colorOf(T.brass), alpha);
  for (const [cx, cy, dx, dy] of [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ] as const) {
    // An L of brass in each corner, its arms along the edges.
    g.fillRect(dx > 0 ? cx : cx - arm, dy > 0 ? cy : cy - 1, arm, 1);
    g.fillRect(dx > 0 ? cx : cx - 1, dy > 0 ? cy : cy - arm, 1, arm);
  }
}
