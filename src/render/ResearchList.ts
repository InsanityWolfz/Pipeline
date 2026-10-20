import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { MAX_COST_ITEMS } from '../data/research';
import { RESEARCH_LIST } from '../data/researchAssets';
import type { SimState } from '../sim/state';
import { researchListLayout } from './researchLayout';
import { researchRows, type ResearchListRow } from './researchRows';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The research list as drawn (033), for `ui().researchList`: open, and each group's rows (name, state, cost texts, where). */
export interface ResearchListState {
  open: boolean;
  groups: { id: string; label: string; rows: { id: string; name: string; state: string; cost: string[]; where: string }[] }[];
}

/** A row's state line: its state, or what it needs restored first while its cost is carried. */
const stateText = (r: ResearchListRow): string => (r.needs ? RESEARCH_LIST.needs(r.needs) : RESEARCH_LIST.states[r.state]);

interface RowView {
  name: TextLine;
  state: TextLine;
  icons: GameObjects.Image[];
  counts: TextLine[];
  where: TextLine;
}


// The research list (033, J): every node of the foundry by group (Intake, Walls,
// Sealed wing), each row its name ("Lost schematic" while hidden), its state, its
// cost for revealed nodes (missing counts in rust-light) and where its diagram is.
// Read-only: restoring happens at the diagram. It doesn't pause the world and takes
// no clicks (the world's, as the minimap). Esc or J closes it.
export class ResearchList {
  private open = false;
  private readonly frame: { setVisible(visible: boolean): unknown }[] = [];
  private readonly rows = new Map<string, RowView>();
  private groups: ReturnType<typeof researchRows> = [];

  constructor(scene: Scene) {
    const L = RESEARCH_LIST;
    const at = researchListLayout();
    const text = (x: number, y: number, style: 'body' | 'display' | 'title' | 'count' = 'body') => new TextLine(scene, x, y, DEPTHS.menu + 2, false, style);
    const tablet = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu);
    drawTablet(tablet, at.panel.x, at.panel.y, at.panel.w, at.panel.h);
    const card = addVector(scene, at.title.x, at.title.y, SPRITES.inventoryTitle).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu);
    const title = text(0, at.title.y + L.title.titleY, 'title').set(L.title.text);
    title.moveTo(Math.round(at.title.x + (L.title.w - title.width) / 2), at.title.y + L.title.titleY);
    const footer = text(at.footer.x, at.footer.y).set(L.footer.text).setFill(L.colors.dim).setAlpha(L.dimAlpha);
    this.frame.push(tablet, card, title, footer);
    const groups = researchRows({ research: {}, inventory: {} });
    for (const [gi, g] of groups.entries()) {
      const place = at.groups[gi];
      if (!place) continue;
      this.frame.push(text(place.x, place.y + L.headerY, 'display').set(g.label));
      g.rows.forEach((r, k) => {
        const y = (place.rows[k] ?? 0) + L.textY;
        const x = place.x;
        this.rows.set(r.id, {
          name: text(x + L.col.name, y),
          state: text(x + L.col.state, y),
          icons: Array.from({ length: MAX_COST_ITEMS }, (_, i) => addVector(scene, x + L.col.cost + i * L.costStep, y - L.textY + 1, SPRITES.itemWood).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 1)),
          counts: Array.from({ length: MAX_COST_ITEMS }, (_, i) => text(x + L.col.cost + i * L.costStep + L.costTextX, y, 'count')),
          where: text(x + L.col.where, y).setFill(L.colors.dim).setAlpha(L.dimAlpha),
        });
      });
    }
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  get shown(): ResearchListState {
    return {
      open: this.open,
      groups: this.groups.map((g) => ({
        id: g.id,
        label: g.label,
        rows: g.rows.map((r) => ({ id: r.id, name: r.name, state: stateText(r), cost: r.cost.map((c) => `${c.have}/${c.need}`), where: r.where })),
      })),
    };
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of this.frame) o.setVisible(open);
    if (!open) for (const v of this.rows.values()) this.hide(v);
  }

  /** Reads the nodes every frame (so the hook can report them); draws them while open. */
  update(sim: Pick<SimState, 'research' | 'inventory'>): void {
    this.groups = researchRows(sim);
    if (!this.open) return;
    for (const g of this.groups) for (const r of g.rows) this.drawRow(r);
  }

  private hide(v: RowView): void {
    for (const o of [v.name, v.state, v.where, ...v.counts]) o.setVisible(false);
    for (const i of v.icons) i.setVisible(false);
  }

  private drawRow(r: ResearchListRow): void {
    const v = this.rows.get(r.id);
    if (!v) return;
    const L = RESEARCH_LIST;
    const hidden = r.state === 'hidden';
    v.name.set(r.name).setFill(hidden ? L.colors.dim : undefined).setAlpha(hidden ? L.dimAlpha : 1).setVisible(true);
    v.state.set(stateText(r)).setFill(L.colors[r.state]).setVisible(true);
    v.where.set(r.where).setVisible(true);
    v.icons.forEach((icon, i) => {
      const c = r.cost[i];
      icon.setVisible(c !== undefined);
      v.counts[i]?.setVisible(c !== undefined);
      if (!c) return;
      icon.setFrame(c.icon);
      v.counts[i]?.set(`${c.have}/${c.need}`).setFill(c.have < c.need ? L.colors.missing : undefined);
    });
  }
}
