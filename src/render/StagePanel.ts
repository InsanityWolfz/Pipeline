import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_MENU_LAYOUT, STAGE_PANEL } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { stageLineText } from '../data/rulesText';
import { stageDef, STAGE_ROWS, type StageRow } from '../data/stages';
import { stageAffordable, stageHeld, type StageStores } from '../sim/stages';
import type { TextBox } from './CraftMenuView';
import { inRect } from './foundryLayout';
import { flashRow, RowHover, type RowFrames } from './menuFeedback';
import { stagePanelLayout } from './stagePanelLayout';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import { addVector } from './vector/textures';

const ROW_FRAMES: RowFrames = { plain: SPRITES.craftRecipeRow, hover: SPRITES.craftRecipeRowHover, press: SPRITES.craftRecipeRowPress };

interface Row {
  row: StageRow;
  /** Its stage's generated line (039): "Cold: added to any round". */
  line: string;
  frame: GameObjects.Image;
  parts: GameObjects.Image[];
  inputs: { itemId: string; need: number; text: TextLine; name: TextLine }[];
  stageName: TextLine;
  made: TextLine;
  owned: TextLine;
  outputName: TextLine;
}

/** The Stages panel as drawn (029), for `ui().benchStages`: each row's id, box, whether it's dimmed, its words and its stage's generated line; the line showing under the rows. */
export interface StagePanelState {
  shown: boolean;
  header: TextBox | null;
  rows: { stageId: string; x: number; y: number; w: number; h: number; dimmed: boolean; texts: string[]; line: string }[];
  line: string;
}

const box = (line: TextLine): TextBox => ({ text: line.obj.text, ...line.at, w: line.width, h: line.lineHeight });

// The identification bench's Stages panel (029), in the crafting menu's style (026):
// one row per stage and family (039.12), its inputs (held/needed, with names) → the tagged
// rounds it gives (+4, held, name), and the stage's name in the row's free slot; under the
// rows, the hovered row's stage line, generated (039). Shown beside the bench's gear panel
// (036) once the shrine is claimed, a family's row once its ammo can be made; a row is
// dimmed while its inputs aren't held (carried or in the intake's entrances). Clicking an
// affordable row hand-applies it.
export class StagePanel {
  private readonly scene: Scene;
  private readonly tablet: GameObjects.Graphics;
  private readonly header: TextLine;
  private readonly hoverLine: TextLine;
  private readonly rows: Row[] = [];
  private readonly hover: RowHover;
  private benchWidth = -1;
  private known: string[] = [];
  private hovered = -1;
  private shown = false;
  private stores: StageStores = { inventory: {}, link: { entrances: [] } };

  constructor(scene: Scene) {
    this.scene = scene;
    this.hover = new RowHover(scene, ROW_FRAMES);
    this.tablet = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
    this.header = new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, 'display').set(STAGE_PANEL.title);
    this.hoverLine = new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, 'body');
    const add = (frame: string, depth: number): GameObjects.Image => addVector(scene, 0, 0, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
    const text = (style: 'count' | 'label'): TextLine => new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, style);
    for (const row of STAGE_ROWS) {
      const { recipe } = row;
      const st = stageDef(row.stage);
      const inputs = Object.entries(recipe.inputs).map(([itemId, need]) => ({ itemId, need, text: text('count'), name: text('label').set(itemDef(itemId).name) }));
      this.rows.push({
        row,
        line: stageLineText(st),
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

  /** The rows on show, in layout order. */
  private get visible(): Row[] {
    return this.rows.filter((r) => this.known.includes(r.row.id));
  }

  private layout() {
    return stagePanelLayout(Math.max(0, this.benchWidth), this.visible.map((r) => r.row.id));
  }

  /** What it shows, for the test hook. */
  get state(): StagePanelState {
    const layout = this.layout();
    return {
      shown: this.shown,
      header: this.shown ? box(this.header) : null,
      rows: this.shown
        ? this.visible.map((r, i) => ({
            ...(layout.rows[i] ?? { x: 0, y: 0, w: 0, h: 0 }),
            stageId: r.row.id,
            dimmed: !stageAffordable(this.stores, r.row.id),
            texts: [...r.inputs.flatMap((i) => [i.text.obj.text, i.name.obj.text]), r.stageName.obj.text, r.made.obj.text, r.owned.obj.text, r.outputName.obj.text],
            line: r.line,
          }))
        : [],
      line: this.shown ? this.hoverLine.obj.text : '',
    };
  }

  /** The row under a screen point, if shown and affordable: its id, the bench command's. */
  stageAt(x: number, y: number): string | null {
    if (!this.shown) return null;
    const r = this.layout().rows.find((row) => inRect(row, x, y));
    return r && stageAffordable(this.stores, r.stageId) ? r.stageId : null;
  }

  /** A row's stage under a view point (040: its summary beside the row). */
  tipAt(x: number, y: number): TipHit | null {
    if (!this.shown) return null;
    const layout = this.layout();
    const i = layout.rows.findIndex((r) => inRect(r, x, y));
    const at = layout.rows[i];
    const row = this.visible[i];
    if (!at || !row) return null;
    const box = { x: at.x, y: at.y, w: at.w, h: at.h };
    return { source: { kind: 'stage', id: row.row.stage }, at: box, anchor: { box, prefer: ['right', 'left', 'below'] } };
  }

  /** True if a screen point is on the panel. */
  overUi(x: number, y: number): boolean {
    return this.shown && inRect(this.layout().panel, x, y);
  }

  /** The cursor is at a screen point: its row lights, if it can be used, and its stage's line shows under the rows. */
  pointAt(x: number, y: number): void {
    const i = this.shown ? this.layout().rows.findIndex((r) => inRect(r, x, y)) : -1;
    this.hovered = i;
    this.hover.set(i, i >= 0 && stageAffordable(this.stores, this.visible[i]?.row.id ?? ''));
    this.hoverLine.set(this.visible[i]?.line ?? '');
  }

  /** Flashes the row under a screen point as it's pressed. */
  flashAt(x: number, y: number): void {
    const r = this.shown ? this.layout().rows.find((row) => inRect(row, x, y)) : undefined;
    if (r) flashRow(this.scene, r.x, r.y, ROW_FRAMES.press);
  }

  /**
   * Shows the panel beside the bench's gear panel, `benchWidth` px wide (036), or hides it for null, with the counts the sim
   * reads as held from `stores` (stageHeld: carried and in the intake's entrances) and the rows `known` (039.12: the row ids the player can see).
   */
  show(benchWidth: number | null, stores: StageStores, known: readonly string[] = STAGE_ROWS.map((r) => r.id)): void {
    this.stores = stores;
    if (benchWidth === null) {
      this.setShown(false);
      return;
    }
    const changed = known.length !== this.known.length || known.some((id, i) => this.known[i] !== id);
    this.known = [...known];
    if (!this.shown || benchWidth !== this.benchWidth || changed) this.place(benchWidth);
    this.setShown(true);
    this.refresh();
  }

  private setShown(shown: boolean): void {
    this.shown = shown;
    this.tablet.setVisible(shown);
    this.header.setVisible(shown);
    this.hoverLine.setVisible(shown);
    for (const r of this.rows) {
      const on = shown && this.known.includes(r.row.id);
      for (const o of [r.frame, ...r.parts]) o.setVisible(on);
      for (const t of [...r.inputs.flatMap((i) => [i.text, i.name]), r.stageName, r.made, r.owned, r.outputName]) t.setVisible(on);
    }
    if (!shown) {
      this.hover.set(-1);
      this.hovered = -1;
      this.hoverLine.set('');
      this.benchWidth = -1;
    }
  }

  /** Lays the panel out beside a bench panel `benchWidth` px wide, as the crafting menu lays out a row (026). */
  private place(benchWidth: number): void {
    const L = CRAFT_MENU_LAYOUT;
    this.benchWidth = benchWidth;
    const layout = this.layout();
    const { panel } = layout;
    this.tablet.clear();
    drawTablet(this.tablet, panel.x, panel.y, panel.w, panel.h);
    this.header.moveTo(layout.header.x + L.headerIcon.x, layout.header.y + L.headerName.y);
    this.hoverLine.moveTo(layout.line.x, layout.line.y);
    // An item's name under its icon at x: centred under it, or from its left edge when wider.
    const under = (line: TextLine, iconX: number, rowY: number): void => {
      line.moveTo(iconX + Math.max(0, Math.round((L.iconSize - line.width) / 2)), rowY + L.labelY);
    };
    for (const [i, r] of this.visible.entries()) {
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

  /** Counts, dimming and the missing colour, from what the sim reads as held. */
  private refresh(): void {
    const L = CRAFT_MENU_LAYOUT;
    for (const [i, r] of this.visible.entries()) {
      const ok = stageAffordable(this.stores, r.row.id);
      const textAlpha = ok ? 1 : L.greyTextAlpha;
      for (const input of r.inputs) {
        const have = stageHeld(this.stores, input.itemId);
        input.text.set(`${have}/${input.need}`);
        const fill = have < input.need ? L.missing : undefined;
        for (const t of [input.text, input.name]) t.setFill(fill).setAlpha(textAlpha);
      }
      r.owned.set(String(stageHeld(this.stores, r.row.recipe.output.itemId)));
      for (const t of [r.stageName, r.made, r.owned, r.outputName]) t.setAlpha(textAlpha);
      for (const p of r.parts) p.setAlpha(ok ? 1 : L.greyAlpha);
      r.frame.setAlpha(ok ? 1 : L.greyAlpha);
      r.frame.setFrame(this.hover.frame(i, ok));
    }
    if (this.hovered < 0) this.hoverLine.set('');
  }
}
