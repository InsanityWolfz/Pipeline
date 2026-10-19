import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { INVENTORY_PANEL, reservedRows, sparesText } from '../data/hudPanels';
import { itemDef } from '../data/items';
import { playerStats } from '../sim/stats';
import { inventoryGroups, SPARE_ROW, WORN_ROW, type Held, type InventoryGroupRows, type InventoryRow } from './inventoryRows';
import { inventoryLayout, type InventoryLayout } from './inventoryLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** One row's pieces: icon, name, count, the risk mark ("N safe ·", warning, "N at risk") and "home N". */
interface RowView {
  icon: GameObjects.Image;
  name: TextLine;
  count: TextLine;
  safe: TextLine;
  warn: GameObjects.Image;
  risk: TextLine;
  home: TextLine;
}

interface GroupView {
  id: string;
  x: number;
  rowsY: number;
  nothing: TextLine;
  rows: RowView[];
}

/** The inventory panel as drawn (031), for `ui().inventory`. */
export interface InventoryShown {
  open: boolean;
  groups: InventoryGroupRows[];
}

// The inventory panel (031, I or Tab): the haul in Raw, Parts, Ammo, Gear and Cores,
// each row marking what a death would take against what's safe, and what's home in the
// stash. Read-only; it doesn't pause the world. A vector tablet centred under its title card.
export class InventoryPanel {
  private open = false;
  private groups: InventoryGroupRows[] = [];
  private readonly views: GroupView[];
  /** Everything shown and hidden with the panel (rows also hide one by one). */
  private readonly frame: { setVisible(visible: boolean): unknown }[] = [];
  private readonly layout: InventoryLayout = inventoryLayout();

  constructor(scene: Scene) {
    const P = INVENTORY_PANEL;
    const L = this.layout;
    const image = (x: number, y: number, key: string, depth: number) => addVector(scene, x, y, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
    const text = (x: number, y: number, style: 'body' | 'display' | 'title' = 'body') => new TextLine(scene, x, y, DEPTHS.menu + 2, false, style);
    this.frame.push(image(L.panel.x, L.panel.y, SPRITES.inventoryPanel, DEPTHS.menu), image(L.title.x, L.title.y, SPRITES.inventoryTitle, DEPTHS.menu));
    const title = text(0, L.title.y + P.title.titleY, 'title').set(P.title.text);
    title.moveTo(Math.round(L.title.x + (P.title.w - title.width) / 2), L.title.y + P.title.titleY);
    const footer = text(L.footer.x, L.footer.y).set(P.footer.text).setFill(P.colors.dim).setAlpha(P.dimAlpha);
    this.frame.push(title, footer);
    this.views = L.groups.map((g) => {
      this.frame.push(text(g.x, g.y + P.headerY, 'display').set(g.label));
      const nothing = text(g.x + P.nothing.x, g.rowsY + P.nothing.y).set(P.nothing.text).setFill(P.colors.dim).setAlpha(P.dimAlpha);
      const rows = Array.from({ length: reservedRows(g.id) }, () => ({
        icon: image(g.x, 0, SPRITES.hudShield, DEPTHS.menu + 1),
        name: text(0, 0),
        count: text(0, 0),
        safe: text(0, 0).setFill(P.colors.safe),
        warn: image(0, 0, SPRITES.hudWarn, DEPTHS.menu + 1),
        risk: text(0, 0).setFill(P.colors.risk),
        home: text(0, 0).setFill(P.colors.dim).setAlpha(P.dimAlpha),
      }));
      return { id: g.id, x: g.x, rowsY: g.rowsY, nothing, rows };
    });
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  get shown(): InventoryShown {
    return { open: this.open, groups: this.groups.map((g) => ({ id: g.id, rows: g.rows.map((r) => ({ ...r })) })) };
  }

  /** While open, a press on the panel or its title card is the panel's, never a shot (015). */
  overUi(x: number, y: number): boolean {
    if (!this.open) return false;
    const { panel, title } = this.layout;
    return x >= panel.x && x < panel.x + panel.w && y >= title.y && y < panel.y + panel.h;
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of this.frame) o.setVisible(open);
    this.draw(null);
  }

  /** Reads the haul every frame (so the hook can report it); draws it while open. */
  update(sim: Held): void {
    this.groups = inventoryGroups(sim);
    this.draw(sim);
  }

  private draw(sim: Held | null): void {
    for (const view of this.views) {
      const rows = this.open && sim ? (this.groups.find((g) => g.id === view.id)?.rows ?? []) : [];
      view.nothing.setVisible(this.open && rows.length === 0);
      view.rows.forEach((r, i) => this.drawRow(r, rows[i], view.x, view.rowsY + i * INVENTORY_PANEL.rowHeight, sim));
    }
  }

  private drawRow(v: RowView, row: InventoryRow | undefined, x: number, y: number, sim: Held | null): void {
    const P = INVENTORY_PANEL;
    const R = P.row;
    const T = P.text;
    const parts = [v.icon, v.name, v.count, v.safe, v.warn, v.risk, v.home];
    for (const p of parts) p.setVisible(false);
    if (!row || !sim) return;
    const show = (...shown: { setVisible(visible: boolean): unknown }[]) => shown.forEach((p) => p.setVisible(true));
    v.icon.setPosition(x, y);
    v.name.moveTo(x + R.name.x, y + R.name.y);
    v.safe.moveTo(x + R.mark.x, y + R.mark.y);
    if (row.itemId === WORN_ROW) {
      // The worn pieces (036: one a slot): how many, and the total armor, always safe.
      v.icon.setFrame(SPRITES.hudShield);
      v.name.set(`${row.count} ${T.worn}`).setFill();
      v.safe.set(`${T.armor} ${playerStats(sim).armor}`);
      show(v.icon, v.name, v.safe);
      return;
    }
    if (row.itemId === SPARE_ROW) {
      v.icon.setFrame(SPRITES.hudShield);
      v.name.set(sparesText(row.count)).setFill(P.colors.safe);
      show(v.icon, v.name);
      return;
    }
    const item = row.label ?? itemDef(row.itemId);
    v.icon.setFrame(item.icon);
    v.name.set(item.name).setFill();
    v.count.set(String(row.count)).moveTo(x + R.count.x, y + R.count.y);
    show(v.icon, v.name, v.count);
    const safe = row.count - row.atRisk;
    if (row.atRisk === 0) {
      v.safe.set(T.safe);
      show(v.safe);
    } else {
      // "10 safe · ", the warning mark, "3 at risk".
      let at = x + R.mark.x;
      if (safe > 0) {
        v.safe.set(`${safe} ${T.safe}${T.sep}`);
        at += v.safe.width + R.warn.gap;
        show(v.safe);
      }
      v.warn.setPosition(at, y + R.warn.y);
      v.risk.set(`${row.atRisk} ${T.atRisk}`).moveTo(at + v.warn.displayWidth + R.warn.gap, y + R.mark.y);
      show(v.warn, v.risk);
    }
    if (row.home > 0) {
      v.home.set(`${T.home} ${row.home}`);
      v.home.moveTo(x + P.columnWidth - v.home.width, y + R.home.y);
      show(v.home);
    }
  }
}
