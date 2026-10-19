import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_MENU_LAYOUT } from '../data/hudLayout';
import { MAX_COST_ITEMS } from '../data/research';
import { RESEARCH_ICONS, RESTORE_PANEL } from '../data/researchAssets';
import type { SimState } from '../sim/state';
import { inRect, type ScreenRect } from './foundryLayout';
import { flashRow, RowHover } from './menuFeedback';
import { restorePanelLayout } from './researchLayout';
import { restorePanelModel, type RestorePanelModel } from './researchRows';

/** What a panel shows for its key, read from the sim each frame (033's restore panel; 034's altar offering reuses it). */
export type PanelModelOf = (sim: SimState, key: string) => RestorePanelModel;
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The restore panel as drawn (033), for `ui().restorePanel`: its node, words, cost and Restore row. */
export interface RestorePanelState {
  node: string;
  name: string;
  effect: string;
  cost: { itemId: string; text: string; missing: boolean }[];
  action: string;
  enabled: boolean;
  /** The Restore row's box, view px, to click. */
  restore: ScreenRect;
}


// The restore panel (033): E within reach of a diagram opens it, in the crafting
// menu's style (026): the node's name and its one-line effect, its cost as icons with
// "have/need" (missing ones in rust-light), and the Restore row, disabled without the
// cost; for a node whose requires aren't restored it names the one that comes first.
// Clicking Restore, or E again, asks the sim to restore (through SiteMenus). The world keeps running.
export class RestorePanel {
  private readonly scene: Scene;
  private readonly tablet: GameObjects.Graphics;
  private readonly name: TextLine;
  private readonly effect: TextLine;
  private readonly costRow: GameObjects.Image;
  private readonly icons: GameObjects.Image[];
  private readonly counts: TextLine[];
  private readonly row: GameObjects.Image;
  private readonly rowIcon: GameObjects.Image;
  private readonly rowText: TextLine;
  private readonly hover: RowHover;
  private model: RestorePanelModel | null = null;
  private readonly modelOf: PanelModelOf;
  /** The node whose panel is open (or 034's altar), or null. */
  nodeId: string | null = null;

  constructor(scene: Scene, modelOf: PanelModelOf = restorePanelModel) {
    this.scene = scene;
    this.modelOf = modelOf;
    const L = restorePanelLayout();
    const P = RESTORE_PANEL;
    const image = (x: number, y: number, frame: string, depth: number) => addVector(scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.hover = new RowHover(scene);
    this.tablet = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
    drawTablet(this.tablet, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    this.name = new TextLine(scene, L.name.x, L.name.y, DEPTHS.menu + 2, false, 'display');
    this.effect = new TextLine(scene, L.effect.x, L.effect.y, DEPTHS.menu + 2, false, 'body');
    this.costRow = image(L.cost.x, L.cost.y, SPRITES.craftRecipeRow, DEPTHS.menu);
    this.icons = Array.from({ length: MAX_COST_ITEMS }, (_, k) => image(L.cost.x + P.input.x + k * P.input.step, L.cost.y + P.input.iconY, SPRITES.itemWood, DEPTHS.menu + 1));
    this.counts = Array.from({ length: MAX_COST_ITEMS }, (_, k) => new TextLine(scene, L.cost.x + P.input.x + k * P.input.step + P.input.textX, L.cost.y + P.input.textY, DEPTHS.menu + 2, false, 'count'));
    this.row = image(L.restore.x, L.restore.y, SPRITES.craftRow, DEPTHS.menu);
    this.rowIcon = image(L.restore.x + P.restore.iconX, L.restore.y + P.restore.iconY, RESEARCH_ICONS.schematic, DEPTHS.menu + 1);
    this.rowText = new TextLine(scene, L.restore.x + P.restore.textX, L.restore.y + P.restore.textY, DEPTHS.menu + 2);
    this.setShown(false);
  }

  get isOpen(): boolean {
    return this.nodeId !== null;
  }

  get state(): RestorePanelState | null {
    const m = this.model;
    if (!m || !this.isOpen) return null;
    return {
      node: m.node,
      name: m.name,
      effect: m.effect,
      cost: m.cost.map((c) => ({ itemId: c.itemId, text: `${c.have}/${c.need}`, missing: c.have < c.need })),
      action: m.action,
      enabled: m.enabled,
      restore: restorePanelLayout().restore,
    };
  }

  open(nodeId: string): void {
    this.nodeId = nodeId;
  }

  close(): void {
    this.nodeId = null;
    this.model = null;
    this.setShown(false);
  }

  overUi(x: number, y: number): boolean {
    return this.isOpen && inRect(restorePanelLayout().panel, x, y);
  }

  /** The node to restore if a click at (x, y) is on an enabled Restore row, else null. */
  restoreAt(x: number, y: number): string | null {
    const m = this.model;
    return m?.enabled && this.isOpen && inRect(restorePanelLayout().restore, x, y) ? m.node : null;
  }

  /** The node E restores now: the open panel's, if its Restore works. */
  get confirm(): string | null {
    return this.isOpen && this.model?.enabled ? this.model.node : null;
  }

  pointAt(x: number, y: number): void {
    const on = this.isOpen && inRect(restorePanelLayout().restore, x, y);
    this.hover.set(on ? 0 : -1, this.model?.enabled ?? false);
  }

  flash(): void {
    const r = restorePanelLayout().restore;
    flashRow(this.scene, r.x, r.y);
  }

  /** Rebuilds the words and counts from the sim while open. */
  update(sim: SimState): void {
    if (!this.nodeId) return;
    const m = this.modelOf(sim, this.nodeId);
    this.model = m;
    const L = CRAFT_MENU_LAYOUT;
    this.setShown(true);
    this.name.set(m.name);
    this.effect.set(m.effect);
    this.icons.forEach((icon, k) => {
      const c = m.cost[k];
      icon.setVisible(c !== undefined);
      this.counts[k]?.setVisible(c !== undefined);
      if (!c) return;
      icon.setFrame(c.icon).setAlpha(c.have >= c.need ? 1 : L.greyAlpha);
      this.counts[k]?.set(`${c.have}/${c.need}`).setFill(c.have < c.need ? L.missing : undefined);
    });
    this.rowText.set(m.action).setAlpha(m.enabled ? 1 : L.greyTextAlpha);
    for (const o of [this.row, this.rowIcon]) o.setAlpha(m.enabled ? 1 : L.greyAlpha);
    this.row.setFrame(this.hover.frame(0, m.enabled));
  }

  private setShown(on: boolean): void {
    for (const o of [this.tablet, this.costRow, this.row, this.rowIcon, ...this.icons]) o.setVisible(on);
    for (const t of [this.name, this.effect, this.rowText, ...this.counts]) t.setVisible(on);
    if (!on) this.hover.set(-1);
  }
}
