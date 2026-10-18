import type { GameObjects, Scene } from 'phaser';
import { ammoDef } from '../data/ammo';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_MENU_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { CRAFT_GROUPS, recipeDef } from '../data/recipes';
import { canCraft } from '../sim/crafting';
import type { LinkState } from '../sim/link';
import { knownRecipe } from '../sim/tutorial';
import { count, type Inventory } from '../sim/inventory';
import { craftMenuLines, craftPanelAt } from './craftMenuLayout';
import { GlyphLine } from './glyphLine';

interface Row {
  recipeId: string;
  frame: GameObjects.Image;
  /** Everything drawn on the row, greyed together when it can't be afforded. */
  parts: GameObjects.Image[];
  /** One "have/need" per input, in recipe order. */
  inputs: { itemId: string; need: number; text: GlyphLine }[];
  made: GlyphLine;
  owned: GlyphLine;
  outputId: string;
}

// The crafting menu: every recipe grouped by ammo, each row showing its inputs
// (held/needed), what it makes and how many of that are held. Clicking an
// affordable row crafts it once. Reads sim state; crafting goes through `onCraft`.
export class CraftMenuView {
  private readonly objects: (GameObjects.Image & GameObjects.Components.Visible)[] = [];
  private readonly lines: GlyphLine[] = [];
  private readonly rows: Row[] = [];
  private hovered: Row | undefined;
  private open = false;
  private inventory: Inventory = {};
  private link: Pick<LinkState, 'attuned'> = { attuned: false };
  /** Each group's header icon, by ammo id: hidden while none of its recipes is known (012). */
  private readonly headers = new Map<string, GameObjects.Image>();

  constructor(scene: Scene, onCraft: (recipeId: string) => void) {
    const L = CRAFT_MENU_LAYOUT;
    const add = (x: number, y: number, frame: string, depth: number = DEPTHS.menu): GameObjects.Image => {
      const image = scene.add.image(x, y, ATLAS_KEY, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
      this.objects.push(image);
      return image;
    };
    const text = (x: number, y: number): GlyphLine => {
      const line = new GlyphLine(scene, x, y, DEPTHS.menu + 2);
      this.lines.push(line);
      return line;
    };
    const panel = craftPanelAt();
    add(panel.x, panel.y, SPRITES.craftPanel);

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
        if (this.open && canCraft({ inventory: this.inventory, link: this.link }, row.recipeId)) onCraft(row.recipeId);
      });
      frame.on('pointerover', () => (this.hovered = row));
      frame.on('pointerout', () => {
        if (this.hovered === row) this.hovered = undefined;
      });
      this.rows.push(row);
    }
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of this.objects) o.setVisible(open);
    for (const l of this.lines) l.setVisible(open);
    for (const r of this.rows) {
      if (open) r.frame.setInteractive();
      else r.frame.disableInteractive();
    }
    if (!open) this.hovered = undefined;
    // Hide unknown recipes straight away, not a frame later.
    else this.update(this.inventory, this.link);
  }

  /** Refreshes counts and greying while open; recipes not yet known (012) stay hidden. */
  update(inventory: Inventory, link: Pick<LinkState, 'attuned'>): void {
    this.inventory = inventory;
    this.link = link;
    if (!this.open) return;
    for (const group of CRAFT_GROUPS) this.headers.get(group.ammoId)?.setVisible(group.recipes.some((id) => knownRecipe({ link }, id)));
    for (const r of this.rows) {
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
      r.frame.setFrame(affordable && this.hovered === r ? SPRITES.craftRowHover : SPRITES.craftRow);
    }
  }
}
