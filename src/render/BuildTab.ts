import type { GameObjects, Scene } from 'phaser';
import { SPRITES } from '../data/assets';
import { ammoDef } from '../data/ammo';
import { itemDef } from '../data/items';
import { BUILD_TAB, CHIP, type ChipId } from '../data/legibility';
import type { SimState } from '../sim/state';
import { buildTabGroups, buildTabLayout, type BuildTabGroup, type BuildTabLayout, type BuildTabRow } from './buildTabLayout';
import { colorOf } from './color';
import { ChipLabels, drawChip, flowChips } from './KeywordChip';
import { TextLine } from './textLine';
import { inBox, type Box } from './tipPlace';
import type { PlacedChip, TipHit } from './tipTypes';
import { addVector } from './vector/textures';

/** The Build tab as drawn, for `ui().buildTab`. */
export interface BuildTabState {
  rows: { round: string; chips: ChipId[]; damage: string; perSecond: string; sources: number; box: Box; chipBoxes: Box[] }[];
}

interface RowView {
  icon: GameObjects.Image;
  name: TextLine;
  damage: TextLine;
  rate: TextLine;
  sources: TextLine;
}

/** What changes the rows: the talents, the worn gear and what the player knows. */
const rowsKey = (s: SimState): string => [s.talents.join(), Object.values(s.equipped).join(), s.gear.length, s.crafted.join(), s.carried.join(), Object.keys(s.machineMade).join()].join('|');

const named = (round: string): string => itemDef(ammoDef(round).itemId).name;
const iconOf = (round: string): string => itemDef(ammoDef(round).itemId).icon;

// The T panel's Build tab (040): every round the player knows, under a header per family,
// each row its icon, name, shape and element chips, final damage, shots/s and "N sources".
// Hovering a row shows that round's breakdown beside the panel, without Shift; its chips
// open their glossary entries. Rows light under the cursor (020).
export class BuildTab {
  private readonly g: GameObjects.Graphics;
  private readonly headers: TextLine[] = [];
  private readonly rows: RowView[] = [];
  private readonly labels: ChipLabels;
  private key = '';
  private groups: BuildTabGroup[] = [];
  private layout: BuildTabLayout = { headers: [], rows: [], columns: 1, columnW: 0 };
  private chips: PlacedChip[] = [];
  private shown = false;
  private hovered: string | null = null;
  private panel: Box = { x: 0, y: 0, w: 0, h: 0 };

  constructor(scene: Scene, depth: number) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.labels = new ChipLabels(scene, depth + 2);
    const text = (style: 'body' | 'display' = 'body') => new TextLine(scene, 0, 0, depth + 2, false, style).setVisible(false);
    // Room for every family's header and every round there is.
    for (let i = 0; i < 4; i++) this.headers.push(text('display').setFill(BUILD_TAB.header.color));
    for (let i = 0; i < 14; i++) {
      const icon = addVector(scene, 0, 0, SPRITES.hudShield).setOrigin(0).setScrollFactor(0).setDepth(depth + 1).setVisible(false);
      icon.setScale(icon.scaleX * BUILD_TAB.iconScale);
      this.rows.push({ icon, name: text(), damage: text(), rate: text(), sources: text() });
    }
  }

  /** The row under a view point lights (020). */
  pointAt(x: number, y: number): void {
    this.hovered = this.shown ? (this.layout.rows.find((r) => inBox(r.box, x, y))?.round ?? null) : null;
  }

  /** A row under a view point: its round's breakdown beside the panel, without Shift (040). */
  tipAt(x: number, y: number): TipHit | null {
    const r = this.shown ? this.layout.rows.find((row) => inBox(row.box, x, y)) : undefined;
    // Beside the panel, level with the row (slid to stay inside the view).
    const beside = r ? { x: this.panel.x, y: r.box.y, w: this.panel.w, h: r.box.h } : null;
    return r && beside ? { source: { kind: 'round', id: r.round }, at: r.box, anchor: { box: beside, prefer: ['right', 'left'] }, breakdown: true } : null;
  }

  /** The keyword of a row's chip under a view point. */
  chipAt(x: number, y: number): ChipId | null {
    return this.shown ? (this.chips.find((c) => inBox(c.box, x, y))?.id ?? null) : null;
  }

  /** Shows it in the panel's box (or hides it), the rows rebuilt only when what changes them does. */
  update(sim: SimState, panel: Box | null): void {
    this.shown = panel !== null;
    this.g.clear().setVisible(this.shown);
    if (!panel) {
      this.hide();
      return;
    }
    this.panel = panel;
    const key = rowsKey(sim);
    if (key !== this.key) {
      this.key = key;
      this.groups = buildTabGroups(sim, iconOf, named);
      this.layout = buildTabLayout(panel, this.groups);
    }
    this.draw();
  }

  private hide(): void {
    for (const h of this.headers) h.setVisible(false);
    for (const r of this.rows) for (const o of [r.icon, r.name, r.damage, r.rate, r.sources]) o.setVisible(false);
    this.labels.hide();
    this.chips = [];
  }

  private draw(): void {
    const B = BUILD_TAB;
    const L = this.layout;
    this.headers.forEach((h, i) => {
      const at = L.headers[i];
      h.setVisible(at !== undefined);
      if (at) h.set(at.label).moveTo(at.x + B.header.x, at.y + B.header.y);
    });
    const byRound = new Map(this.groups.flatMap((g) => g.rows.map((r) => [r.round, r] as const)));
    this.chips = [];
    this.rows.forEach((v, i) => {
      const at = L.rows[i];
      const row = at ? byRound.get(at.round) : undefined;
      for (const o of [v.icon, v.name, v.damage, v.rate, v.sources]) o.setVisible(row !== undefined);
      if (at && row) this.drawRow(v, row, at.box);
    });
    for (const c of this.chips) drawChip(this.g, c.box, c.group);
    this.labels.show(this.chips);
  }

  private drawRow(v: RowView, row: BuildTabRow, b: Box): void {
    const B = BUILD_TAB;
    if (this.hovered === row.round) this.g.fillStyle(colorOf(B.hover.color), B.hover.alpha).fillRect(b.x, b.y, b.w, b.h);
    v.icon.setFrame(row.icon).setPosition(b.x, b.y + 1);
    v.name.set(row.name).moveTo(b.x + B.name.x, b.y + B.name.y);
    const flow = flowChips(row.chips, (l) => this.labels.width(l), { x: b.x + B.chips.x, y: b.y + B.chips.y, firstX: b.x + B.chips.x, right: Infinity, rowStep: CHIP.h });
    this.chips.push(...flow.placed);
    const right = (line: TextLine, text: string, edge: number) => line.set(text).moveTo(Math.round(b.x + edge - line.width), b.y + B.name.y);
    right(v.damage, row.damage, B.damageRight);
    right(v.rate, row.perSecond, B.rateRight);
    right(v.sources, row.sourcesText, b.w - B.sourcesRight);
  }

  get state(): BuildTabState {
    if (!this.shown) return { rows: [] };
    const byRound = new Map(this.groups.flatMap((g) => g.rows.map((r) => [r.round, r] as const)));
    return {
      rows: this.layout.rows.flatMap(({ round, box }) => {
        const r = byRound.get(round);
        return r ? [{ round, chips: r.chips.map((c) => c.id), damage: r.damage, perSecond: r.perSecond, sources: r.sources, box, chipBoxes: this.chips.filter((c) => inBox(box, c.box.x, c.box.y)).map((c) => c.box) }] : [];
      }),
    };
  }
}
