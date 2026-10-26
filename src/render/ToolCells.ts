import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { BLUEPRINT_SPRITES, TOOLS_LAYOUT } from '../data/blueprintAssets';
import { BLUEPRINT_TEXT } from '../data/blueprints';
import { BUILD_BAR_LAYOUT } from '../data/hudLayout';
import { inRect, type ScreenRect } from './foundryLayout';
import { toolCells, toolsBox, toolsLabelBox, type ToolId } from './blueprintLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';
import { keyLabel } from './keyHint';
import { settings } from './flow/settingsStore';

/** The Tools group as drawn (063), for `ui().blueprints.tools`, view px. */
export interface ToolCellsShown {
  shown: boolean;
  cells: (ScreenRect & { tool: ToolId; locked: boolean; active: boolean })[];
  /** The hover line over the cell under the cursor, while it shows. */
  tip: string | null;
}

const EMBLEMS: Readonly<Record<ToolId, string>> = { area: BLUEPRINT_SPRITES.areaEmblem, list: BLUEPRINT_SPRITES.listEmblem };

// The build bar's Tools group (063): the Area tool and the Blueprints list as two bar cells under a "Tools" label at the
// bar's right end, raised a row. The tool in use is ringed like the bar's selected piece; Blueprints is greyed until
// the Blueprint table is restored. Hovering a cell names it (or says to restore the table) in a line over it.
export class ToolCells {
  private readonly cells: { tool: ToolId; images: GameObjects.Image[] }[];
  private readonly ring: GameObjects.Image;
  private readonly label: TextLine;
  private readonly tip: TextLine;
  shown: ToolCellsShown = { shown: false, cells: [], tip: null };

  constructor(scene: Scene) {
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image => o.setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(false);
    const L = BUILD_BAR_LAYOUT;
    this.cells = toolCells().map((c) => ({
      tool: c.tool,
      images: [fixed(addVector(scene, c.x, c.y, SPRITES.hudAmmoCell), DEPTHS.hud), fixed(addVector(scene, c.x + L.icon.x, c.y + L.icon.y, EMBLEMS[c.tool]), DEPTHS.hud + 1)],
    }));
    this.ring = fixed(addVector(scene, 0, 0, SPRITES.hudAmmoSelect), DEPTHS.hud + 2);
    const box = toolsLabelBox();
    this.label = new TextLine(scene, 0, box.y, DEPTHS.hud + 1, false, 'display').set(BLUEPRINT_TEXT.tools).setVisible(false);
    this.label.moveTo(Math.round(box.x + (box.w - this.label.width) / 2), box.y);
    this.tip = new TextLine(scene, 0, 0, DEPTHS.hud + 3, false, 'label').setVisible(false);
  }

  /** Over the group (its label too), while it shows. */
  overUi(x: number, y: number): boolean {
    return this.shown.shown && inRect(toolsBox(), x, y);
  }

  /** The tool whose cell is under a point, while shown. */
  toolAt(x: number, y: number): ToolId | null {
    if (!this.shown.shown) return null;
    return toolCells().find((c) => inRect(c, x, y))?.tool ?? null;
  }

  /** `active`: the tool in use (the Area tool, or the list while open); `listLocked` before the table; `pointer` view px. */
  update(building: boolean, active: ToolId | null, listLocked: boolean, pointer: { x: number; y: number } | null): void {
    const locked = (t: ToolId): boolean => t === 'list' && listLocked;
    for (const c of this.cells) for (const o of c.images) o.setVisible(building).setAlpha(locked(c.tool) ? TOOLS_LAYOUT.lockedAlpha : 1);
    this.label.setVisible(building);
    const cells = toolCells();
    const on = building && active !== null ? cells.find((c) => c.tool === active) : undefined;
    this.ring.setVisible(on !== undefined);
    if (on) this.ring.setPosition(on.x, on.y);
    const hovered = building && pointer ? cells.find((c) => inRect(c, pointer.x, pointer.y)) : undefined;
    const text = hovered ? (locked(hovered.tool) ? BLUEPRINT_TEXT.locked : hovered.tool === 'area' ? BLUEPRINT_TEXT.areaTool(keyLabel(settings().bindings.area)) : BLUEPRINT_TEXT.listTool(keyLabel(settings().bindings.blueprints))) : null;
    this.tip.setVisible(text !== null);
    if (hovered && text) {
      this.tip.set(text);
      // Right-aligned to the cell, so it never runs off the view's right edge.
      this.tip.moveTo(Math.round(Math.min(hovered.x + (hovered.w - this.tip.width) / 2, hovered.x + hovered.w - this.tip.width)), toolsLabelBox().y - TOOLS_LAYOUT.tipGap - this.tip.lineHeight);
    }
    this.shown = { shown: building, cells: building ? cells.map((c) => ({ ...c, locked: locked(c.tool), active: c.tool === active })) : [], tip: text };
  }
}
