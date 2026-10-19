import type { GameObjects, Scene } from 'phaser';
import { SPRITES } from '../data/assets';
import { ammoDef } from '../data/ammo';
import { itemDef } from '../data/items';
import { BUILD_TAB, CHIP, type ChipId } from '../data/legibility';
import type { SimState } from '../sim/state';
import { buildTabGroups, buildTabLayout, rowFields, type BuildTabGroup, type BuildTabLayout, type BuildTabRow, type RowFields } from './buildTabLayout';
import { BASE_FAMILY } from '../data/roundKeywords';
import { roundsByFamily } from '../sim/knownRounds';
import { colorOf } from './color';
import { loadoutKey } from './loadoutKey';
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
    for (let i = 0; i < Object.keys(BASE_FAMILY).length; i++) this.headers.push(text('display').setFill(BUILD_TAB.header.color));
    for (let i = 0; i < roundsByFamily().length; i++) {
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
    const key = loadoutKey(sim);
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
    const fields = rowFields(L.columnW);
    this.rows.forEach((v, i) => {
      const at = L.rows[i];
      const row = at ? byRound.get(at.round) : undefined;
      for (const o of [v.icon, v.name, v.damage, v.rate, v.sources]) o.setVisible(row !== undefined);
      if (at && row) this.drawRow(v, row, at.box, fields);
    });
    for (const c of this.chips) drawChip(this.g, c.box, c.group);
    this.labels.show(this.chips);
  }

  /** One row in its column: the fields where rowFields puts them for the column's width. */
  private drawRow(v: RowView, row: BuildTabRow, b: Box, f: RowFields): void {
    const B = BUILD_TAB;
    if (this.hovered === row.round) this.g.fillStyle(colorOf(B.hover.color), B.hover.alpha).fillRect(b.x, b.y, b.w, b.h);
    v.icon.setFrame(row.icon).setPosition(b.x, b.y + 1);
    fitText(v.name, row.name, f.name.w).moveTo(b.x + f.name.x, b.y + B.name.y);
    if (f.chipsX !== null) {
      const x = b.x + f.chipsX;
      this.chips.push(...flowChips(row.chips, (l) => this.labels.width(l), { x, y: b.y + B.chipsY, firstX: x, right: Infinity, rowStep: CHIP.h }).placed);
    }
    const right = (line: TextLine, text: string, edge: number) => line.set(text).moveTo(Math.round(b.x + edge - line.width), b.y + B.name.y);
    right(v.damage, row.damage, f.damageRight);
    right(v.rate, row.perSecond, f.rateRight);
    right(v.sources, f.compact ? String(row.sources) : row.sourcesText, f.sourcesRight);
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

/** Shortens a line with an ellipsis until it fits `w` px. */
function fitText(line: TextLine, text: string, w: number): TextLine {
  line.set(text);
  for (let n = text.length - 1; line.width > w && n > 1; n--) line.set(`${text.slice(0, n).trimEnd()}…`);
  return line;
}
