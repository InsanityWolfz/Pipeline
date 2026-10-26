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
import { guidedSubLine } from '../sim/guided';
import { GUIDED_NAMES, GUIDED_TEXT } from '../data/guidedBuilds';
import { pieceDef } from '../data/pieces';
import { FOUNDRY_ROOM } from '../data/rooms';
import { FOUNDRY_MAP } from '../data/foundryMap';
import { MINIMAP } from '../data/minimap';
import { OVERWORLD } from '../data/overworld';
import { pieceIcon } from './foundryLayout';
import { foundryMapBox } from './foundryMap';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector, showFrame, textureScale } from './vector/textures';

/** A goal's sub-line as drawn (051, B.3), for `ui().objective`: its raw (058: or the guided step's piece), its words, ticked or not, and its box (view px). */
export interface SubStepShown {
  itemId: string;
  pieceId?: string;
  text: string;
  done: boolean;
  x: number;
  y: number;
  w: number;
}

/** A sub-line to draw: its icon frame, words, and whether it's ticked. */
interface SubLine {
  icon: string;
  text: string;
  done: boolean;
  itemId: string;
  pieceId?: string;
}

/** The current goal's sub-lines: a craft goal's raws (051, B.3), or a guided step's next piece (058.2). */
function subLines(sim: SimState, index: number | null): SubLine[] {
  const guided = guidedSubLine(sim);
  if (guided) {
    const name = GUIDED_NAMES[guided.pieceId] ?? pieceDef(guided.pieceId).name.toLowerCase();
    const text = guided.kind === 'remove' ? GUIDED_TEXT.removeLine(name) : GUIDED_TEXT.place(name, guided.built, guided.of);
    return [{ icon: pieceIcon(guided.pieceId), text, done: false, itemId: '', pieceId: guided.pieceId }];
  }
  return subStepLines(sim, index).map((s) => ({ icon: itemDef(s.itemId).icon, text: SUB_STEP_TEXT(itemDef(s.itemId).name), done: s.done, itemId: s.itemId }));
}

/** The line's top: under the minimap, or (058, Shaun) right under the foundry's smaller minimap inside it. */
function lineTop(sim: SimState): number {
  if (sim.roomId !== FOUNDRY_ROOM || sim.sandbox) return TUTORIAL_LAYOUT.objectiveTop;
  const b = foundryMapBox();
  return b.y + b.h + FOUNDRY_MAP.frame.width + TUTORIAL_LAYOUT.objectiveFoundryGap;
}

/**
 * fix-playtest-ui (Shaun: "cap it as large as the mini-map, and if you need to word wrap it, just word wrap it"): the
 * widest the band gets, view px: the corner map's width with its frame (the foundry's in the foundry, else the
 * overworld's), so the band, right-aligned under it, never reaches past its left edge.
 */
export function objectiveCapWidth(sim: SimState): number {
  if (sim.roomId === FOUNDRY_ROOM && !sim.sandbox) return foundryMapBox().w + 2 * FOUNDRY_MAP.frame.width;
  return OVERWORLD.width * MINIMAP.scale + 2 * MINIMAP.frame.width;
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
  /** The line's top now (058: higher in the foundry). */
  private top: number = TUTORIAL_LAYOUT.objectiveTop;
  /** The sub-lines as drawn, for the test hook. */
  subSteps: SubStepShown[] = [];
  /** fix-playtest-ui: how many lines the goal's text wraps onto, and the band's widest (the corner map's width). */
  lines = 0;
  capWidth = 0;
  /** Build mode is on: the band lets presses through to the grid under it (fix-playtest-ui). */
  private building = false;

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
    this.building = sim.building;
    // 044.5: the sandbox has no objective line.
    const line = objectiveLine(sim);
    const text = sim.sandbox ? '' : line.text;
    const subs = sim.sandbox ? [] : subLines(sim, line.index);
    const top = lineTop(sim);
    const cap = objectiveCapWidth(sim);
    const key = `${text}|${top}|${cap}|${subs.map((s) => `${s.text}:${s.done}`).join(',')}`;
    if (key === this.shownKey) return;
    this.top = top;
    this.shownKey = key;
    this.capWidth = cap;
    const finished = this.shown !== undefined && text !== this.shown;
    this.shown = text;
    // The text wraps to fit the band inside the cap: less its padding and the tick's place left of it.
    const { objectivePanel: P, tickGap } = TUTORIAL_LAYOUT;
    this.line.obj.setWordWrapWidth(Math.floor(cap - 2 * P.padX - tickGap - this.tick.displayWidth), true).setAlign('right');
    this.line.set(text);
    this.lines = text === '' ? 0 : this.line.obj.getWrappedText().length;
    const x = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight - this.line.width;
    this.line.moveTo(x, top);
    this.drawPanel(x - TUTORIAL_LAYOUT.tickGap - this.tick.displayWidth, text, subs);
    if (!finished) return;
    // The new goal fades in beside the tick for the one just done.
    this.line.setAlpha(0);
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: TUTORIAL_LAYOUT.objectiveFadeMs, onUpdate: (t) => this.line.setAlpha(t.getValue() ?? 1) });
    this.tick.setPosition(x - TUTORIAL_LAYOUT.tickGap, top - TUTORIAL_LAYOUT.tickRise).setAlpha(1);
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

  /** Over the band, outside build mode (fix-playtest-ui: in build mode a press there reaches the grid under it). */
  overUi(x: number, y: number): boolean {
    const b = this.band;
    return !this.building && b !== null && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  }

  /** The goal's text's height, view px: a line, and each wrapped line under it a measured line's height apart. */
  private textHeight(): number {
    const n = Math.max(1, this.lines);
    return this.line.lineHeight + (n - 1) * (this.line.obj.height / n);
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
  private drawPanel(x: number, text: string, subs: readonly SubLine[]): void {
    const { objectivePanel: P, subStep: S } = TUTORIAL_LAYOUT;
    const objectiveTop = this.top;
    const right = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight;
    const icon = ITEM_ICON_SIZE * S.iconScale;
    const words = subs.map((s) => s.text);
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
    const textH = this.textHeight();
    const top = objectiveTop + textH + S.gap;
    subs.forEach((s, i) => {
      const r = this.row(i);
      const rowX = left + S.indent;
      const y = top + i * S.step;
      const mid = y + this.line.lineHeight / 2 - 1;
      r.tick.setPosition(rowX, mid).setAlpha(s.done ? 1 : 0);
      showFrame(r.icon, s.icon).setScale(S.iconScale / textureScale()).setPosition(rowX + S.tickW + S.iconGap + icon / 2, mid);
      r.text.moveTo(rowX + S.tickW + S.iconGap + icon + S.iconGap, y);
      r.text.setAlpha(s.done ? S.doneAlpha : 1);
      this.subSteps.push({ itemId: s.itemId, ...(s.pieceId ? { pieceId: s.pieceId } : {}), text: words[i] ?? '', done: s.done, x: rowX, y, w: widths[i] ?? 0 });
    });
    const h = textH + (subs.length > 0 ? S.gap + subs.length * S.step - (S.step - this.line.lineHeight) : 0);
    this.band = { x: left - P.padX, y: objectiveTop - P.padY, w: right - left + 2 * P.padX, h: h + 2 * P.padY };
    drawTablet(this.panel, this.band.x, this.band.y, this.band.w, this.band.h, P.alpha);
  }
}
