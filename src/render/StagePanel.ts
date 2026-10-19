import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_MENU_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { recipeDef } from '../data/recipes';
import { STAGES } from '../data/stages';
import { count, type Inventory } from '../sim/inventory';
import type { TextBox } from './CraftMenuView';
import { inRect } from './foundryLayout';
import { flashRow, RowHover, type RowFrames } from './menuFeedback';
import { STAGE_PANEL, stagePanelLayout } from './stagePanelLayout';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

const ROW_FRAMES: RowFrames = { plain: SPRITES.craftRecipeRow, hover: SPRITES.craftRecipeRowHover, press: SPRITES.craftRecipeRowPress };

interface Row {
  stageId: string;
  frame: GameObjects.Image;
  parts: GameObjects.Image[];
  inputs: { itemId: string; need: number; text: TextLine; name: TextLine }[];
  stageName: TextLine;
  made: TextLine;
  owned: TextLine;
  outputName: TextLine;
}

/** The Stages panel as drawn (029), for `ui().benchStages`: each row's stage, box, whether it's dimmed, and its words. */
export interface StagePanelState {
  shown: boolean;
  header: TextBox | null;
  rows: { stageId: string; x: number; y: number; w: number; h: number; dimmed: boolean; texts: string[] }[];
}

const box = (line: TextLine): TextBox => ({ text: line.obj.text, ...line.at, w: line.width, h: line.lineHeight });

// The identification bench's Stages panel (029), in the crafting menu's style (026):
// one row per stage, its inputs (held/needed, with names) → the tagged rounds it
// gives (+4, held, name), and the stage's name in the row's free slot. Shown beside
// the bench's own rows once the shrine is claimed; a row is dimmed while its inputs
// aren't carried. Clicking an affordable row hand-applies the stage (through SiteMenus).
export class StagePanel {
  private readonly scene: Scene;
  private readonly tablet: GameObjects.Graphics;
  private readonly header: TextLine;
  private readonly rows: Row[] = [];
  private readonly hover: RowHover;
  private benchRows = -1;
  private shown = false;
  private inventory: Inventory = {};

  constructor(scene: Scene) {
    this.scene = scene;
    this.hover = new RowHover(scene, ROW_FRAMES);
    this.tablet = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
    this.header = new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, 'display').set(STAGE_PANEL.title);
    const add = (frame: string, depth: number): GameObjects.Image => addVector(scene, 0, 0, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
    const text = (style: 'count' | 'label'): TextLine => new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, style);
    for (const st of Object.values(STAGES)) {
      const recipe = recipeDef(st.id);
      const inputs = Object.entries(recipe.inputs).map(([itemId, need]) => ({ itemId, need, text: text('count'), name: text('label').set(itemDef(itemId).name) }));
      this.rows.push({
        stageId: st.id,
        frame: add(SPRITES.craftRecipeRow, DEPTHS.menu + 1),
        parts: [...inputs.map((i) => add(itemDef(i.itemId).icon, DEPTHS.menu + 2)), add(SPRITES.craftArrow, DEPTHS.menu + 2), add(itemDef(recipe.output.itemId).icon, DEPTHS.menu + 2)],
        inputs,
        stageName: text('label').set(st.name),
        made: text('count').set(`+${recipe.output.count}`),
        owned: text('count'),
        outputName: text('label').set(itemDef(recipe.output.itemId).name),
      });
    }
    this.setShown(false);
  }

  /** Whether the panel shows. */
  get isShown(): boolean {
    return this.shown;
  }

  /** What it shows, for the test hook. */
  get state(): StagePanelState {
    const layout = stagePanelLayout(Math.max(0, this.benchRows));
    return {
      shown: this.shown,
      header: this.shown ? box(this.header) : null,
      rows: this.shown
        ? this.rows.map((r, i) => ({
            ...(layout.rows[i] ?? { x: 0, y: 0, w: 0, h: 0 }),
            stageId: r.stageId,
            dimmed: !this.affordable(r.stageId),
            texts: [...r.inputs.flatMap((i) => [i.text.obj.text, i.name.obj.text]), r.stageName.obj.text, r.made.obj.text, r.owned.obj.text, r.outputName.obj.text],
          }))
        : [],
    };
  }

  private affordable(stageId: string): boolean {
    return Object.entries(recipeDef(stageId).inputs).every(([itemId, n]) => count(this.inventory, itemId) >= n);
  }

  /** The stage row under a screen point, if shown and affordable. */
  stageAt(x: number, y: number): string | null {
    if (!this.shown) return null;
    const r = stagePanelLayout(this.benchRows).rows.find((row) => inRect(row, x, y));
    return r && this.affordable(r.stageId) ? r.stageId : null;
  }

  /** True if a screen point is on the panel. */
  overUi(x: number, y: number): boolean {
    return this.shown && inRect(stagePanelLayout(this.benchRows).panel, x, y);
  }

  /** The cursor is at a screen point: its row lights, if it can be used. */
  pointAt(x: number, y: number): void {
    const i = this.shown ? stagePanelLayout(this.benchRows).rows.findIndex((r) => inRect(r, x, y)) : -1;
    this.hover.set(i, i >= 0 && this.affordable(this.rows[i]?.stageId ?? ''));
  }

  /** Flashes the row under a screen point as it's pressed. */
  flashAt(x: number, y: number): void {
    const r = this.shown ? stagePanelLayout(this.benchRows).rows.find((row) => inRect(row, x, y)) : undefined;
    if (r) flashRow(this.scene, r.x, r.y, ROW_FRAMES.press);
  }

  /** Shows the panel beside `benchRows` rows of the bench's (or hides it, for null), with the counts from `inventory`. */
  show(benchRows: number | null, inventory: Inventory): void {
    this.inventory = inventory;
    if (benchRows === null) {
      this.setShown(false);
      return;
    }
    if (!this.shown || benchRows !== this.benchRows) this.place(benchRows);
    this.setShown(true);
    this.refresh();
  }

  private setShown(shown: boolean): void {
    this.shown = shown;
    this.tablet.setVisible(shown);
    this.header.setVisible(shown);
    for (const r of this.rows) {
      for (const o of [r.frame, ...r.parts]) o.setVisible(shown);
      for (const t of [...r.inputs.flatMap((i) => [i.text, i.name]), r.stageName, r.made, r.owned, r.outputName]) t.setVisible(shown);
    }
    if (!shown) {
      this.hover.set(-1);
      this.benchRows = -1;
    }
  }

  /** Lays the panel out beside `benchRows` bench rows, as the crafting menu lays out a row (026). */
  private place(benchRows: number): void {
    const L = CRAFT_MENU_LAYOUT;
    this.benchRows = benchRows;
    const layout = stagePanelLayout(benchRows);
    const { panel } = layout;
    this.tablet.clear();
    drawTablet(this.tablet, panel.x, panel.y, panel.w, panel.h);
    this.header.moveTo(layout.header.x + L.headerIcon.x, layout.header.y + L.headerName.y);
    // An item's name under its icon at x: centred under it, or from its left edge when wider.
    const under = (line: TextLine, iconX: number, rowY: number): void => {
      line.moveTo(iconX + Math.max(0, Math.round((L.iconSize - line.width) / 2)), rowY + L.labelY);
    };
    for (const [i, r] of this.rows.entries()) {
      const at = layout.rows[i];
      if (!at) continue;
      r.frame.setPosition(at.x, at.y);
      const iconY = at.y + L.iconY;
      r.inputs.forEach((input, k) => {
        const x = at.x + L.input.x + k * L.input.step;
        r.parts[k]?.setPosition(x, iconY);
        input.text.moveTo(x + L.input.textX, at.y + L.input.textY);
        under(input.name, x, at.y);
      });
      // The stage's name in the free third slot, level with the counts.
      r.stageName.moveTo(at.x + L.input.x + r.inputs.length * L.input.step, at.y + L.input.textY);
      const outX = at.x + L.output.x;
      r.parts[r.inputs.length]?.setPosition(at.x + L.arrow.x, at.y + L.arrow.y);
      r.parts[r.inputs.length + 1]?.setPosition(outX, iconY);
      r.made.moveTo(outX + L.output.textX, at.y + L.output.madeY);
      r.owned.moveTo(outX + L.output.textX, at.y + L.output.ownedY);
      under(r.outputName, outX, at.y);
    }
  }

  /** Counts, dimming and the missing colour, from the inventory. */
  private refresh(): void {
    const L = CRAFT_MENU_LAYOUT;
    for (const [i, r] of this.rows.entries()) {
      const ok = this.affordable(r.stageId);
      const textAlpha = ok ? 1 : L.greyTextAlpha;
      for (const input of r.inputs) {
        const have = count(this.inventory, input.itemId);
        input.text.set(`${have}/${input.need}`);
        const fill = have < input.need ? L.missing : undefined;
        for (const t of [input.text, input.name]) t.setFill(fill).setAlpha(textAlpha);
      }
      r.owned.set(String(count(this.inventory, recipeDef(r.stageId).output.itemId)));
      for (const t of [r.stageName, r.made, r.owned, r.outputName]) t.setAlpha(textAlpha);
      for (const p of r.parts) p.setAlpha(ok ? 1 : L.greyAlpha);
      r.frame.setAlpha(ok ? 1 : L.greyAlpha);
      r.frame.setFrame(this.hover.frame(i, ok));
    }
  }
}
