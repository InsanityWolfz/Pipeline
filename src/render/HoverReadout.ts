import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { READOUT_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { machineDef } from '../data/pieces';
import { recipeDef, RECIPES } from '../data/recipes';
import { count } from '../sim/inventory';
import type { MachineState } from '../sim/pieces';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

/** The most lines a readout needs: the largest recipe's inputs, plus the output. */
const MAX_LINES = Math.max(...Object.values(RECIPES).map((r) => Object.keys(r.inputs).length)) + 1;

// Over the machine under the cursor: one line per input with how many are
// buffered, then the output with how many are waiting to go out.
export class HoverReadout {
  private readonly back: GameObjects.Graphics;
  private readonly icons: GameObjects.Image[] = [];
  private readonly counts: GlyphLine[] = [];

  constructor(scene: Scene) {
    const depth = DEPTHS.worldUi + 10;
    this.back = scene.add.graphics().setDepth(depth);
    for (let i = 0; i < MAX_LINES; i++) {
      this.icons.push(scene.add.image(0, 0, ATLAS_KEY).setOrigin(0).setDepth(depth + 1));
      this.counts.push(new GlyphLine(scene, 0, 0, depth + 1, true));
    }
    this.show(null, 0, 0);
  }

  /**
   * Shows the readout for `m` with its bottom-centre at (x, bottom), or hides it.
   * It never rises above `minTop` (the top of the camera's view), so it stays on screen.
   */
  show(m: MachineState | null, x: number, bottom: number, minTop = -Infinity): void {
    const L = READOUT_LAYOUT;
    this.back.clear();
    const recipe = m ? recipeDef(machineDef(m.pieceId).recipeId) : null;
    const lines: [string, number][] = m && recipe
      ? [...Object.keys(recipe.inputs).map((id): [string, number] => [id, count(m.buffer, id)]), [recipe.output.itemId, m.output]]
      : [];
    const h = lines.length * L.lineHeight + 2 * L.pad;
    const left = Math.round(x - L.width / 2);
    const top = Math.round(Math.max(bottom - L.gap - h, minTop + L.pad));
    if (lines.length > 0) {
      this.back.fillStyle(colorOf(L.border)).fillRect(left - 1, top - 1, L.width + 2, h + 2);
      this.back.fillStyle(colorOf(L.back)).fillRect(left, top, L.width, h);
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
      icon.setFrame(itemDef(line[0]).icon).setPosition(left + L.pad, y);
      text.moveTo(left + L.pad + L.count.x, y + L.count.y);
      text.set(String(line[1]));
    }
  }
}
