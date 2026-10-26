import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { INTAKE_EMPTY_ICON } from '../data/foundryAssets';
import { READOUT_LAYOUT } from '../data/hudLayout';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';
import { READOUT_MAX_LINES as MAX_LINES, type Line } from './readoutLines';

// Over the machine or intake under the cursor, a small panel of icon and text lines.
export class HoverReadout {
  private readonly back: GameObjects.Graphics;
  private readonly icons: GameObjects.Image[] = [];
  private readonly counts: TextLine[] = [];

  constructor(scene: Scene) {
    const depth = DEPTHS.worldUi + 10;
    this.back = scene.add.graphics().setDepth(depth);
    for (let i = 0; i < MAX_LINES; i++) {
      this.icons.push(addVector(scene, 0, 0, INTAKE_EMPTY_ICON).setOrigin(0).setDepth(depth + 1));
      this.counts.push(new TextLine(scene, 0, 0, depth + 1, true));
    }
    this.show([], 0, 0);
  }

  /**
   * Shows `lines` with the panel's bottom-centre at (x, bottom); no lines hides it.
   * It never rises above `minTop` (the top of the camera's view), so it stays on screen.
   * Returns the panel's top and bottom, so a name can sit clear of it (069: and its left and width, so it never covers it).
   */
  show(lines: readonly Line[], x: number, bottom: number, minTop = -Infinity): { top: number; bottom: number; left: number; width: number } {
    const L = READOUT_LAYOUT;
    this.back.clear();
    // 069: the texts first, so the panel is as wide as its widest line (the intake's rates), never narrower than before.
    lines.forEach((line, i) => this.counts[i]?.set(line[1]));
    const textW = Math.max(0, ...lines.map((_l, i) => this.counts[i]?.width ?? 0));
    const width = Math.max(L.width, Math.ceil(L.count.x + textW + 2 * L.pad));
    const h = lines.length * L.lineHeight + 2 * L.pad;
    const left = Math.round(x - width / 2);
    const top = Math.round(Math.max(bottom - L.gap - h, minTop + L.pad));
    if (lines.length > 0) {
      drawTablet(this.back, left, top, width, h);
    }
    for (let i = 0; i < MAX_LINES; i++) {
      const line = lines[i];
      const icon = this.icons[i];
      const text = this.counts[i];
      if (!icon || !text) continue;
      icon.setVisible(line !== undefined);
      text.setVisible(line !== undefined);
      if (!line) continue;
      const y = top + L.pad + i * L.lineHeight;
      icon.setFrame(line[0]).setPosition(left + L.pad, y);
      text.moveTo(left + L.pad + L.count.x, y + L.count.y);
    }
    return { top, bottom: top + h, left, width };
  }
}
