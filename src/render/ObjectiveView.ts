import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { ITEM_ICON_SIZE } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { SUB_STEP_TEXT } from '../data/objectives';
import { objectiveLine } from '../sim/objectives';
import type { SimState } from '../sim/state';
import { subStepLines } from '../sim/subSteps';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector, showFrame, textureScale } from './vector/textures';

/** A goal's sub-line as drawn (051, B.3), for `ui().objective`: its raw, its words, ticked or not, and its box (view px). */
export interface SubStepShown {
  itemId: string;
  text: string;
  done: boolean;
  x: number;
  y: number;
  w: number;
}

interface SubRow {
  tick: GameObjects.Image;
  icon: GameObjects.Image;
  text: TextLine;
}

// The objective line (012): the first unfinished goal, on the right of the screen
// below the minimap (019), or the frontier goal once all are done (028), so it is
// never blank. Finishing one flashes a ley tick beside the line before it moves on.
// 051 (B.3): a craft goal's sub-lines sit indented under it, each with its raw's icon, ticked once gathered.
export class ObjectiveView {
  private readonly scene: Scene;
  private readonly line: TextLine;
  private readonly tick: GameObjects.Image;
  private readonly panel: GameObjects.Graphics;
  private readonly rows: SubRow[] = [];
  /** The line's text and sub-lines, or undefined before the first draw. */
  private shown: string | undefined = undefined;
  private shownKey = '';
  /** The sub-lines as drawn, for the test hook. */
  subSteps: SubStepShown[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.line = new TextLine(scene, 0, TUTORIAL_LAYOUT.objectiveTop, DEPTHS.hud, false, 'display');
    const L = TUTORIAL_LAYOUT;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud - 1);
    this.tick = addVector(scene, 0, L.objectiveTop - L.tickRise, TUTORIAL_SPRITES.tick)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud)
      .setAlpha(0);
  }

  /** The current goal's text, for the test hook. */
  get text(): string {
    return this.shown ?? '';
  }

  update(sim: SimState): void {
    // 044.5: the sandbox has no objective line.
    const line = objectiveLine(sim);
    const text = sim.sandbox ? '' : line.text;
    const subs = sim.sandbox ? [] : subStepLines(sim, line.index);
    const key = `${text}|${subs.map((s) => `${s.itemId}:${s.done}`).join(',')}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    const finished = this.shown !== undefined && text !== this.shown;
    this.shown = text;
    this.line.set(text);
    const x = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight - this.line.width;
    this.line.moveTo(x, TUTORIAL_LAYOUT.objectiveTop);
    this.drawPanel(x - TUTORIAL_LAYOUT.tickGap - this.tick.displayWidth, text, subs);
    if (!finished) return;
    // The new goal fades in beside the tick for the one just done.
    this.line.setAlpha(0);
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: TUTORIAL_LAYOUT.objectiveFadeMs, onUpdate: (t) => this.line.setAlpha(t.getValue() ?? 1) });
    this.tick.setX(x - TUTORIAL_LAYOUT.tickGap).setAlpha(1);
    this.scene.tweens.add({ targets: this.tick, alpha: 0, delay: TUTORIAL_LAYOUT.tickMs / 2, duration: TUTORIAL_LAYOUT.tickMs / 2 });
  }

  /** How strongly the finished goal's tick shows beside the line (0 once it has faded), for the test hook. */
  get tickAlpha(): number {
    return this.tick.alpha;
  }

  /** The band's screen rect while it shows, so a press on it never fires (015). */
  private band: { x: number; y: number; w: number; h: number } | null = null;

  /** The band while it shows (the waypoint arrow never hides under it), view px. */
  get box(): { x: number; y: number; w: number; h: number } | null {
    return this.band;
  }

  overUi(x: number, y: number): boolean {
    const b = this.band;
    return b !== null && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  }

  /** One row of objects per sub-line, made as needed. */
  private row(i: number): SubRow {
    while (this.rows.length <= i) {
      const fixed = <T extends GameObjects.Image>(o: T): T => o.setScrollFactor(0).setDepth(DEPTHS.hud);
      this.rows.push({
        tick: fixed(addVector(this.scene, 0, 0, TUTORIAL_SPRITES.tick).setOrigin(0, 0.5)),
        icon: fixed(addVector(this.scene, 0, 0, itemDef('stone').icon)),
        text: new TextLine(this.scene, 0, 0, DEPTHS.hud, false, 'body'),
      });
    }
    const row = this.rows[i];
    if (!row) throw new Error(`no sub-line ${i}`);
    return row;
  }

  /**
   * A dark band behind the text and the tick's place left of it, so both read over doors, barriers and busy floors;
   * it grows down over the sub-lines, which sit indented from its left.
   */
  private drawPanel(x: number, text: string, subs: readonly { itemId: string; done: boolean }[]): void {
    const { objectivePanel: P, objectiveTop, subStep: S } = TUTORIAL_LAYOUT;
    const right = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight;
    const icon = ITEM_ICON_SIZE * S.iconScale;
    const words = subs.map((s) => SUB_STEP_TEXT(itemDef(s.itemId).name));
    const widths = words.map((w, i) => S.tickW + S.iconGap + icon + S.iconGap + this.row(i).text.set(w).width);
    const left = Math.min(x, ...widths.map((w) => right - w - S.indent));
    this.rows.forEach((r, i) => {
      const show = text !== '' && i < subs.length;
      for (const o of [r.tick, r.icon, r.text]) o.setVisible(show);
    });
    this.subSteps = [];
    this.panel.clear();
    this.band = null;
    if (!text) return;
    const top = objectiveTop + this.line.lineHeight + S.gap;
    subs.forEach((s, i) => {
      const r = this.row(i);
      const rowX = left + S.indent;
      const y = top + i * S.step;
      const mid = y + this.line.lineHeight / 2 - 1;
      r.tick.setPosition(rowX, mid).setAlpha(s.done ? 1 : 0);
      showFrame(r.icon, itemDef(s.itemId).icon).setScale(S.iconScale / textureScale()).setPosition(rowX + S.tickW + S.iconGap + icon / 2, mid);
      r.text.moveTo(rowX + S.tickW + S.iconGap + icon + S.iconGap, y);
      r.text.setAlpha(s.done ? S.doneAlpha : 1);
      this.subSteps.push({ itemId: s.itemId, text: words[i] ?? '', done: s.done, x: rowX, y, w: widths[i] ?? 0 });
    });
    const h = this.line.lineHeight + (subs.length > 0 ? S.gap + subs.length * S.step - (S.step - this.line.lineHeight) : 0);
    this.band = { x: left - P.padX, y: objectiveTop - P.padY, w: right - left + 2 * P.padX, h: h + 2 * P.padY };
    drawTablet(this.panel, this.band.x, this.band.y, this.band.w, this.band.h, P.alpha);
  }
}
