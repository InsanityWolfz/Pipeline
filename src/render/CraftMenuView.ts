import type { GameObjects, Scene } from 'phaser';
import { ammoDef } from '../data/ammo';
import { DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_MENU_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { CRAFT_GROUPS, recipeDef } from '../data/recipes';
import { canCraft } from '../sim/crafting';
import type { LinkState } from '../sim/link';
import { knownRecipe } from '../sim/tutorial';
import { count, type Inventory } from '../sim/inventory';
import { craftMenuLines, craftPanelAt } from './craftMenuLayout';
import { flashRow, RowHover } from './menuFeedback';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

interface Row {
  recipeId: string;
  frame: GameObjects.Image;
  /** Everything drawn on the row, greyed together when it can't be afforded. */
  parts: GameObjects.Image[];
  /** One "have/need" per input, in recipe order. */
  inputs: { itemId: string; need: number; text: TextLine }[];
  made: TextLine;
  owned: TextLine;
  outputId: string;
}

// The crafting menu: every recipe grouped by ammo, each row showing its inputs
// (held/needed), what it makes and how many of that are held. Clicking an
// affordable row crafts it once. Reads sim state; crafting goes through `onCraft`.
export class CraftMenuView {
  private readonly objects: (GameObjects.Image & GameObjects.Components.Visible)[] = [];
  private readonly lines: TextLine[] = [];
  private readonly rows: Row[] = [];
  private readonly hover: RowHover;
  private open = false;
  private inventory: Inventory = {};
  private link: Pick<LinkState, 'attuned'> = { attuned: false };
  /** Each group's header icon, by ammo id: hidden while none of its recipes is known (012). */
  private readonly headers = new Map<string, GameObjects.Image>();
  /** The title card's tablet. */
  private readonly card: GameObjects.Graphics;

  constructor(scene: Scene, onCraft: (recipeId: string) => void) {
    const L = CRAFT_MENU_LAYOUT;
    this.hover = new RowHover(scene);
    const add = (x: number, y: number, frame: string, depth: number = DEPTHS.menu): GameObjects.Image => {
      const image = addVector(scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
      this.objects.push(image);
      return image;
    };
    const text = (x: number, y: number): TextLine => {
      const line = new TextLine(scene, x, y, DEPTHS.menu + 2, false, 'count');
      this.lines.push(line);
      return line;
    };
    const panel = craftPanelAt();
    add(panel.x, panel.y, SPRITES.craftPanel);
    // The title card: a carved tablet over the panel naming the menu.
    const T = L.title;
    const cardX = Math.round(panel.x + (L.width - T.w) / 2);
    const cardY = panel.y - T.gap - T.h;
    this.card = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu);
    drawTablet(this.card, cardX, cardY, T.w, T.h);
    const title = new TextLine(scene, 0, cardY + T.titleY, DEPTHS.menu + 2, false, 'title').set(T.text);
    title.moveTo(Math.round(panel.x + L.width / 2 - title.width / 2), cardY + T.titleY);
    this.lines.push(title);

    for (const line of craftMenuLines()) {
      if (line.kind === 'header') {
        const icon = add(line.x + L.headerIcon.x, line.y + L.headerIcon.y, itemDef(ammoDef(line.id).itemId).icon, DEPTHS.menu + 1);
        this.headers.set(line.id, icon);
        continue;
      }
      const recipe = recipeDef(line.id);
      const frame = add(line.x, line.y, SPRITES.craftRow, DEPTHS.menu + 1);
      const iconY = line.y + Math.round((L.rowHeight - L.iconSize) / 2);
      const parts: GameObjects.Image[] = [];
      const inputs = Object.entries(recipe.inputs).map(([itemId, need], i) => {
        const x = line.x + L.input.x + i * L.input.step;
        parts.push(add(x, iconY, itemDef(itemId).icon, DEPTHS.menu + 2));
        return { itemId, need, text: text(x + L.input.textX, line.y + L.input.textY) };
      });
      parts.push(add(line.x + L.arrow.x, line.y + L.arrow.y, SPRITES.craftArrow, DEPTHS.menu + 2));
      const outX = line.x + L.output.x;
      parts.push(add(outX, iconY, itemDef(recipe.output.itemId).icon, DEPTHS.menu + 2));
      const made = text(outX + L.output.textX, line.y + L.output.madeY);
      made.set(`+${recipe.output.count}`);
      const row: Row = {
        recipeId: recipe.id,
        frame,
        parts,
        inputs,
        made,
        owned: text(outX + L.output.textX, line.y + L.output.ownedY),
        outputId: recipe.output.itemId,
      };
      frame.on('pointerdown', () => {
        if (!this.open || !canCraft({ inventory: this.inventory, link: this.link }, row.recipeId)) return;
        flashRow(scene, frame.x, frame.y);
        onCraft(row.recipeId);
      });
      const index = this.rows.length;
      frame.on('pointerover', () => this.hover.set(index, canCraft({ inventory: this.inventory, link: this.link }, row.recipeId)));
      frame.on('pointerout', () => this.hover.leave(index));
      this.rows.push(row);
    }
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** While open, a press on the panel or its title card is the menu's, never a shot (020: the world keeps running). */
  overUi(x: number, y: number): boolean {
    if (!this.open) return false;
    const L = CRAFT_MENU_LAYOUT;
    const panel = craftPanelAt();
    const top = panel.y - L.title.gap - L.title.h;
    return x >= panel.x && x < panel.x + L.width && y >= top && y < panel.y + L.height;
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of this.objects) o.setVisible(open);
    this.card.setVisible(open);
    for (const l of this.lines) l.setVisible(open);
    for (const r of this.rows) {
      if (open) r.frame.setInteractive();
      else r.frame.disableInteractive();
    }
    if (!open) this.hover.set(-1);
    // Hide unknown recipes straight away, not a frame later.
    else this.update(this.inventory, this.link);
  }

  /** Refreshes counts and greying while open; recipes not yet known (012) stay hidden. */
  update(inventory: Inventory, link: Pick<LinkState, 'attuned'>): void {
    this.inventory = inventory;
    this.link = link;
    if (!this.open) return;
    for (const group of CRAFT_GROUPS) this.headers.get(group.ammoId)?.setVisible(group.recipes.some((id) => knownRecipe({ link }, id)));
    for (const [i, r] of this.rows.entries()) {
      const known = knownRecipe({ link }, r.recipeId);
      for (const o of [r.frame, ...r.parts]) o.setVisible(known);
      for (const t of [...r.inputs.map((i) => i.text), r.made, r.owned]) t.setVisible(known);
      if (!known) continue;
      const affordable = canCraft({ inventory, link }, r.recipeId);
      const alpha = affordable ? 1 : CRAFT_MENU_LAYOUT.greyAlpha;
      for (const input of r.inputs) {
        input.text.set(`${count(inventory, input.itemId)}/${input.need}`);
        input.text.setAlpha(alpha);
      }
      r.owned.set(String(count(inventory, r.outputId)));
      r.made.setAlpha(alpha);
      r.owned.setAlpha(alpha);
      for (const p of r.parts) p.setAlpha(alpha);
      r.frame.setAlpha(alpha);
      r.frame.setFrame(this.hover.frame(i, affordable));
    }
  }
}
