import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { READOUT_LAYOUT } from '../data/hudLayout';
import { SOCKET_EMPTY_ICON } from '../data/foundryAssets';
import { itemDef } from '../data/items';
import { machineDef } from '../data/pieces';
import { recipeDef, RECIPES } from '../data/recipes';
import { RESERVOIR_CAP } from '../data/tube';
import { count } from '../sim/inventory';
import type { ReservoirState } from '../sim/link';
import type { MachineState } from '../sim/pieces';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

/** The most lines a readout needs: the largest recipe's inputs, plus the output. */
const MAX_LINES = Math.max(...Object.values(RECIPES).map((r) => Object.keys(r.inputs).length)) + 1;

/** One readout line: an atlas frame for its icon, and the text beside it. */
type Line = [frame: string, text: string];

/** A machine's lines: each input with how many are buffered, then the output waiting to go out. */
export function machineLines(m: MachineState): Line[] {
  const recipe = recipeDef(machineDef(m.pieceId).recipeId);
  return [
    ...Object.keys(recipe.inputs).map((id): Line => [itemDef(id).icon, String(count(m.buffer, id))]),
    [itemDef(recipe.output.itemId).icon, String(m.output)],
  ];
}

/** A tube socket's line: the reservoir's ammo (or the socket's icon when empty) and count out of the cap. */
export function socketLines(r: ReservoirState): Line[] {
  const icon = r.itemId ? itemDef(r.itemId).icon : SOCKET_EMPTY_ICON;
  return [[icon, `${r.count}/${RESERVOIR_CAP}`]];
}

// Over the machine or tube socket under the cursor, a small panel of icon and count lines.
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
    this.show([], 0, 0);
  }

  /**
   * Shows `lines` with the panel's bottom-centre at (x, bottom); no lines hides it.
   * It never rises above `minTop` (the top of the camera's view), so it stays on screen.
   */
  show(lines: readonly Line[], x: number, bottom: number, minTop = -Infinity): void {
    const L = READOUT_LAYOUT;
    this.back.clear();
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
      icon.setFrame(line[0]).setPosition(left + L.pad, y);
      text.moveTo(left + L.pad + L.count.x, y + L.count.y);
      text.set(line[1]);
    }
  }
}
