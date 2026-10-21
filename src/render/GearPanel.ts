import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { UNIDENTIFIED_ARMOR, GEAR_SLOTS, type GearPiece, type GearSlot } from '../data/gear';
import { GEAR_PANEL, SLOT_NAMES } from '../data/gearAssets';
import { playerStats } from '../sim/stats';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { gearPanelLayout, inBox, type Box, type GearPanelLayout } from './gearPanelLayout';
import { pieceIcon, pieceLines, rarityLook, slotIcon, totalsLines } from './gearText';
import { MENU_HOVER_EVENT } from './menuFeedback';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import { addVector } from './vector/textures';

/** What a click on the panel asks for: identify, wear (or take off) a piece, or nothing past the panel's own tab. */
export type GearClick = { kind: 'identify' } | { kind: 'equip'; id: number } | { kind: 'panel' };

/** The panel as drawn, for `ui().gear.panel`: its parts' boxes (view px) and words. */
export interface GearPanelState {
  open: boolean;
  tab: GearSlot;
  identify: (Box & { text: string }) | null;
  cells: { slot: GearSlot; worn: number | null; name: string; box: Box }[];
  tabs: { slot: GearSlot; text: string; box: Box }[];
  rows: { id: number; worn: boolean; color: string; texts: string[]; box: Box }[];
  /** 050: the first row shown and the furthest the list scrolls. */
  scroll: { first: number; last: number };
  totals: string[];
}

interface CellView { frame: GameObjects.Image; icon: GameObjects.Image; slot: TextLine; armor: TextLine; name: TextLine }
interface RowView { frame: GameObjects.Image; icon: GameObjects.Image; name: TextLine; detail: TextLine; affixes: TextLine; rule: TextLine }

const P = GEAR_PANEL;

/** Shortens a line with an ellipsis until it fits `w` px. */
function fit(line: TextLine, text: string, w: number): TextLine {
  line.set(text);
  for (let n = text.length - 1; line.width > w && n > 1; n--) line.set(`${text.slice(0, n).trimEnd()}…`);
  return line;
}

// The identification bench's menu (036): the Identify button, a cell per slot with
// the piece worn there, a tab per slot listing its pieces (each in its rarity's colour
// and frame, with its weight, armor, affixes and a relic's rule), scrolling on the
// wheel when they don't fit (050: no pages), and the totals. A click on a row wears the piece (or takes the worn one
// off); a cell or tab opens that slot's tab. It stays open, so pieces can be swapped.
export class GearPanel {
  private readonly scene: Scene;
  private readonly g: GameObjects.Graphics;
  private readonly title: TextLine;
  private readonly button: TextLine;
  private readonly cells: CellView[];
  private readonly tabs: TextLine[];
  private readonly rows: RowView[] = [];
  private readonly empty: TextLine;
  private readonly totals: TextLine[];
  private layout: GearPanelLayout = gearPanelLayout([], 0);
  private pieces: GearPiece[] = [];
  private hover = '';
  private flash: { box: Box; ms: number } | null = null;
  private shown: GearPanelState | null = null;
  isOpen = false;
  tab: GearSlot = 'body';
  private first = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    const d = DEPTHS.menu;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(d - 1);
    const text = (style: 'display' | 'body' | 'label' | 'count'): TextLine => new TextLine(scene, 0, 0, d + 2, false, style);
    const image = (frame: string, depth = d + 1): GameObjects.Image => addVector(scene, 0, 0, frame).setOrigin(0.5).setScrollFactor(0).setDepth(depth);
    this.title = text('display').set(P.title.text);
    this.button = text('body');
    this.cells = GEAR_SLOTS.map((slot) => ({ frame: image(rarityLook({ rarity: 'common' }).frame), icon: image(slotIcon(slot), d + 2), slot: text('label').set(SLOT_NAMES[slot]), armor: text('label'), name: text('label') }));
    this.tabs = GEAR_SLOTS.map(() => text('body'));
    for (let i = 0; i < Math.ceil(P.list.h / P.list.rowH); i++) {
      this.rows.push({ frame: image(rarityLook({ rarity: 'common' }).frame), icon: image(slotIcon('helm'), d + 2), name: text('display'), detail: text('body'), affixes: text('body'), rule: text('label').setFill(P.colors.rule) });
    }
    this.empty = text('body').setFill(P.colors.dim);
    this.totals = [text('body'), text('body')];
    this.setVisible(false);
  }

  open(): void {
    this.isOpen = true;
    this.tab = 'body';
    this.first = 0;
  }

  /** 050 (A.13): the wheel scrolls the open tab's list a row a step (kept in range when next drawn). */
  scroll(steps: number): void {
    if (this.isOpen) this.first = Math.max(0, this.first + steps);
  }

  close(): void {
    this.isOpen = false;
    this.shown = null;
    this.setVisible(false);
  }

  overUi(x: number, y: number): boolean {
    return this.isOpen && inBox(this.layout.panel, x, y);
  }

  /** What the cursor is over, as a key ('row:3', 'tab:helm', 'cell:body', 'identify'), or ''. */
  private targetAt(x: number, y: number): { key: string; box: Box } | null {
    const L = this.layout;
    const carried = this.shown?.identify ?? null;
    if (carried && inBox(L.identify, x, y)) return { key: 'identify', box: L.identify };
    for (const r of L.rows) if (inBox(r.box, x, y)) return { key: `row:${r.id}`, box: r.box };
    for (const t of L.tabs) if (inBox(t.box, x, y)) return { key: `tab:${t.slot}`, box: t.box };
    for (const c of L.cells) if (inBox(c.box, x, y)) return { key: `cell:${c.slot}`, box: c.box };
    return null;
  }

  /** A piece under a view point (040): a row's, or the one worn in a slot's cell; its summary beside it. */
  tipAt(x: number, y: number): TipHit | null {
    if (!this.isOpen) return null;
    const hit = this.targetAt(x, y);
    const [kind, arg] = hit?.key.split(':') ?? [];
    const id = kind === 'row' ? Number(arg) : kind === 'cell' ? this.shown?.cells.find((c) => c.slot === arg)?.worn : undefined;
    if (!hit || id === undefined || id === null) return null;
    // 050 (A.6): it goes the moment the cursor leaves the piece's square, even onto the tip. A row's tip goes beside the
    // panel, clear of the list's scroll bar.
    const P = this.layout.panel;
    const beside = kind === 'row' ? { ...hit.box, w: P.x + P.w - hit.box.x } : hit.box;
    return { source: { kind: 'gear', id: String(id) }, at: hit.box, anchor: { box: beside, prefer: ['right', 'left', 'below'] }, leaveAtOnce: true };
  }

  /** The cursor is at a screen point: what it's over lights, with the hover sound on a new target. */
  pointAt(x: number, y: number): void {
    const key = this.isOpen ? (this.targetAt(x, y)?.key ?? '') : '';
    if (key === this.hover) return;
    if (key !== '') this.scene.events.emit(MENU_HOVER_EVENT);
    this.hover = key;
  }

  /** A click at a screen point: a tab or cell opens its slot, a row or the button is sent on. Null off the panel. */
  click(x: number, y: number): GearClick | null {
    if (!this.isOpen || !inBox(this.layout.panel, x, y)) return null;
    const hit = this.targetAt(x, y);
    if (!hit) return { kind: 'panel' };
    this.flash = { box: hit.box, ms: P.flashMs };
    const [kind, arg] = hit.key.split(':');
    if (kind === 'identify') return { kind: 'identify' };
    if (kind === 'row') return { kind: 'equip', id: Number(arg) };
    if ((kind === 'tab' || kind === 'cell') && arg) {
      this.tab = arg as GearSlot;
      this.first = 0;
    }
    return { kind: 'panel' };
  }

  /** Redraws from the sim. The press flash runs on the tween clock. */
  update(sim: SimState): void {
    if (!this.isOpen) return;
    const deltaMs = this.scene.game.loop.delta * this.scene.tweens.timeScale;
    this.pieces = sim.gear.filter((p) => p.slot === this.tab);
    this.layout = gearPanelLayout(this.pieces.map((p) => ({ id: p.id, relic: p.relic !== null })), this.first);
    this.first = this.layout.scroll.first;
    if (this.flash) this.flash = this.flash.ms - deltaMs > 0 ? { ...this.flash, ms: this.flash.ms - deltaMs } : null;
    this.draw(sim);
  }

  private setVisible(on: boolean): void {
    this.g.setVisible(on);
    for (const t of [this.title, this.button, this.empty, ...this.tabs, ...this.totals]) t.setVisible(on);
    for (const c of this.cells) for (const o of [c.frame, c.icon, c.slot, c.armor, c.name]) o.setVisible(on);
    for (const r of this.rows) for (const o of [r.frame, r.icon, r.name, r.detail, r.affixes, r.rule]) o.setVisible(on);
  }

  private fill(b: Box, c: { color: string; alpha: number }): void {
    this.g.fillStyle(colorOf(c.color), c.alpha).fillRect(b.x, b.y, b.w, b.h);
  }

  private draw(sim: SimState): void {
    const L = this.layout;
    const C = P.colors;
    const W = P.words;
    this.setVisible(true);
    this.g.clear();
    drawTablet(this.g, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    this.title.moveTo(L.title.x, L.title.y);
    // The Identify button, while unidentified gear is carried.
    const carried = sim.inventory[UNIDENTIFIED_ARMOR] ?? 0;
    this.button.setVisible(carried > 0);
    let identify: GearPanelState['identify'] = null;
    if (carried > 0) {
      const b = L.identify;
      this.fill(b, C.button);
      this.g.lineStyle(1, colorOf(C.buttonEdge.color), C.buttonEdge.alpha).strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (this.hover === 'identify') this.fill(b, C.hover);
      this.button.set(P.identify.text(carried));
      this.button.moveTo(Math.round(b.x + (b.w - this.button.width) / 2), b.y + P.identify.textY);
      identify = { ...b, text: this.button.obj.text };
    }
    // A cell per slot: the worn piece's frame and icon, the slot, its armor and name; "empty" when nothing's worn.
    const cells = L.cells.map(({ slot, box }, i) => {
      const v = this.cells[i];
      const worn = sim.gear.find((p) => p.id === sim.equipped[slot]) ?? null;
      this.fill(box, slot === this.tab ? C.tabOn : C.well);
      if (this.hover === `cell:${slot}`) this.fill(box, C.hover);
      const cx = box.x + P.cells.icon.x;
      const cy = box.y + P.cells.icon.y;
      const name = worn ? worn.name : W.emptyCell;
      if (v) {
        v.frame.setPosition(cx, cy).setFrame(rarityLook(worn ?? { rarity: 'common' }).frame).setAlpha(worn ? 1 : P.emptyAlpha.frame);
        v.icon.setPosition(cx, cy).setFrame(worn ? pieceIcon(worn) : slotIcon(slot)).setAlpha(worn ? 1 : P.emptyAlpha.icon);
        v.slot.moveTo(box.x + P.cells.slot.x, box.y + P.cells.slot.y);
        v.armor.set(worn ? `${W.armor} ${worn.baseArmor}` : '').moveTo(box.x + P.cells.armor.x, box.y + P.cells.armor.y);
        fit(v.name, name, box.w - P.cells.name.x - 2).moveTo(box.x + P.cells.name.x, box.y + P.cells.name.y).setFill(worn ? rarityLook(worn).color : C.dim);
      }
      return { slot, worn: worn?.id ?? null, name, box };
    });
    // A tab per slot: its name and how many pieces it holds.
    const tabs = L.tabs.map(({ slot, box }, i) => {
      const t = this.tabs[i];
      const text = `${SLOT_NAMES[slot]} ${sim.gear.filter((p) => p.slot === slot).length}`;
      this.fill(box, slot === this.tab ? C.tabOn : C.tab);
      if (this.hover === `tab:${slot}`) this.fill(box, C.hover);
      t?.set(text).moveTo(Math.round(box.x + (box.w - t.width) / 2), box.y + P.tabs.textY);
      return { slot, text, box };
    });
    // The open tab's rows on this page.
    const rows = this.rows.map((v, i) => {
      const at = L.rows[i];
      const piece = at ? this.pieces.find((p) => p.id === at.id) : undefined;
      for (const o of [v.frame, v.icon, v.name, v.detail, v.affixes, v.rule]) o.setVisible(piece !== undefined);
      if (!at || !piece) return null;
      const b = at.box;
      const worn = sim.equipped[piece.slot] === piece.id;
      const look = rarityLook(piece);
      const lines = pieceLines(piece, worn);
      this.fill(b, C.well);
      if (this.hover === `row:${piece.id}`) this.fill(b, C.hover);
      if (worn) this.g.fillStyle(colorOf(C.worn.color), C.worn.alpha).fillRect(b.x, b.y, P.list.wornEdge, b.h);
      const ix = b.x + P.list.icon.x;
      const iy = b.y + P.list.icon.y;
      v.frame.setPosition(ix, iy).setFrame(look.frame);
      v.icon.setPosition(ix, iy).setFrame(pieceIcon(piece));
      const tx = b.x + P.list.text.x;
      v.name.set(lines.name).setFill(look.color).moveTo(tx, b.y + P.list.text.line1);
      v.detail.set(lines.detail).setFill(worn ? C.wornText : undefined).moveTo(b.x + b.w - P.list.rightPad - v.detail.width, b.y + P.list.text.line1);
      fit(v.affixes, lines.affixes, b.w - P.list.text.x - P.list.rightPad).moveTo(tx, b.y + P.list.text.line2);
      fit(v.rule, lines.rule ?? '', b.w - P.list.text.x - P.list.rightPad).setVisible(lines.rule !== null).moveTo(tx, b.y + P.list.text.line3);
      return { id: piece.id, worn, color: look.color, texts: [lines.name, lines.detail, lines.affixes, ...(lines.rule ? [lines.rule] : [])], box: b };
    });
    this.empty.setVisible(this.pieces.length === 0).set(W.empty(SLOT_NAMES[this.tab])).moveTo(L.empty.x, L.empty.y);
    // 050: the scroll bar, while the list scrolls.
    if (L.scroll.last > 0) {
      this.fill(L.track, C.track);
      this.fill(L.thumb, C.thumb);
    }
    const totals = totalsLines(playerStats(sim));
    totals.forEach((t, i) => this.totals[i]?.set(t).moveTo(L.totals[i]?.x ?? 0, L.totals[i]?.y ?? 0));
    if (this.flash) this.fill(this.flash.box, { color: C.flash.color, alpha: C.flash.alpha * (this.flash.ms / P.flashMs) });
    this.shown = { open: true, tab: this.tab, identify, cells, tabs, rows: rows.flatMap((r) => (r ? [r] : [])), scroll: L.scroll, totals };
  }

  /** What it shows, for the test hook. */
  get state(): GearPanelState | null {
    return this.isOpen ? this.shown : null;
  }
}
