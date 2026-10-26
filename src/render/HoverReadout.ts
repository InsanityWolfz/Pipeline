import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { INTAKE_EMPTY_ICON } from '../data/foundryAssets';
import { READOUT_LAYOUT } from '../data/hudLayout';
import { RECIPES } from '../data/recipes';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';
import type { Line } from './readoutLines';

/** The most lines a readout needs: the largest recipe's inputs, plus the output. */
const MAX_LINES = Math.max(...Object.values(RECIPES).map((r) => Object.keys(r.inputs).length)) + 1;

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
   * Returns the panel's top and bottom, so a name can sit clear of it.
   */
  show(lines: readonly Line[], x: number, bottom: number, minTop = -Infinity): { top: number; bottom: number } {
    const L = READOUT_LAYOUT;
    this.back.clear();
    const h = lines.length * L.lineHeight + 2 * L.pad;
    const left = Math.round(x - L.width / 2);
    const top = Math.round(Math.max(bottom - L.gap - h, minTop + L.pad));
    if (lines.length > 0) {
      drawTablet(this.back, left, top, L.width, h);
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
      text.set(line[1]);
    }
    return { top, bottom: top + h };
  }
}
