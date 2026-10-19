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

/** What decides which recipes show and which can be made: the inventory, the attunement and the revealing items found. */
type Known = { inventory: Inventory; link: Pick<LinkState, 'attuned'>; found: readonly string[] };
import { craftMenuLines, craftPanelAt } from './craftMenuLayout';
import { flashRow, RowHover, type RowFrames } from './menuFeedback';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

const RECIPE_ROW_FRAMES: RowFrames = { plain: SPRITES.craftRecipeRow, hover: SPRITES.craftRecipeRowHover, press: SPRITES.craftRecipeRowPress };

interface Row {
  recipeId: string;
  frame: GameObjects.Image;
  /** The icons and arrow drawn on the row, greyed together when it can't be afforded. */
  parts: GameObjects.Image[];
  /** One per input, in recipe order: its "have/need" beside the icon and its name under it. */
  inputs: { itemId: string; need: number; text: TextLine; name: TextLine }[];
  made: TextLine;
  owned: TextLine;
  outputId: string;
  outputName: TextLine;
}

/** A line of text as drawn, view px: (x, y) is the top of its capitals, `h` its line height. */
export interface TextBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The crafting menu as drawn (026), for `ui().craftMenu`: each recipe row with its item names and counts, and the group headers. */
export interface CraftMenuState {
  open: boolean;
  rows: {
    recipeId: string;
    shown: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
    /** Every item name on the row, inputs first then the output, and whether it shows as missing. */
    labels: (TextBox & { itemId: string; missing: boolean })[];
    /** The counts beside the icons: each input's have/need (missing when short), then the output's made and owned. */
    counts: (TextBox & { missing: boolean })[];
  }[];
  headers: (TextBox & { ammoId: string; shown: boolean })[];
}

const box = (line: TextLine): TextBox => ({ text: line.obj.text, ...line.at, w: line.width, h: line.lineHeight });

// The crafting menu: every recipe grouped by ammo, each header naming its ammo, each row
// showing its inputs (held/needed) and what it makes and how many of that are held, with
// every item's name under its icon (026). Clicking an affordable row crafts it once.
// Reads sim state; crafting goes through `onCraft`.
export class CraftMenuView {
  private readonly objects: (GameObjects.Image & GameObjects.Components.Visible)[] = [];
  private readonly lines: TextLine[] = [];
  private readonly rows: Row[] = [];
  private readonly hover: RowHover;
  private open = false;
  /** What the menu reads (038: `found` shows the landmine chain once ley-iron is carried). */
  private known: Known = { inventory: {}, link: { attuned: false }, found: [] };
  /** Each group's header icon and name, by ammo id: hidden while none of its recipes is known (012). */
  private readonly headers = new Map<string, { icon: GameObjects.Image; name: TextLine }>();
  /** The title card's tablet. */
  private readonly card: GameObjects.Graphics;

  constructor(scene: Scene, onCraft: (recipeId: string) => void) {
    const L = CRAFT_MENU_LAYOUT;
    this.hover = new RowHover(scene, RECIPE_ROW_FRAMES);
    const add = (x: number, y: number, frame: string, depth: number = DEPTHS.menu): GameObjects.Image => {
      const image = addVector(scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
      this.objects.push(image);
      return image;
    };
    const text = (x: number, y: number, style: 'count' | 'label' | 'display' = 'count'): TextLine => {
      const line = new TextLine(scene, x, y, DEPTHS.menu + 2, false, style);
      this.lines.push(line);
      return line;
    };
    // An item's name under its icon at x: centred under it, or from its left edge when wider.
    const name = (itemId: string, iconX: number, rowY: number): TextLine => {
      const line = text(iconX, rowY + L.labelY, 'label').set(itemDef(itemId).name);
      return line.moveTo(iconX + Math.max(0, Math.round((L.iconSize - line.width) / 2)), rowY + L.labelY);
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
        const item = itemDef(ammoDef(line.id).itemId);
        const icon = add(line.x + L.headerIcon.x, line.y + L.headerIcon.y, item.icon, DEPTHS.menu + 1);
        this.headers.set(line.id, { icon, name: text(line.x + L.headerName.x, line.y + L.headerName.y, 'display').set(item.name) });
        continue;
      }
      const recipe = recipeDef(line.id);
      const frame = add(line.x, line.y, SPRITES.craftRecipeRow, DEPTHS.menu + 1);
      const iconY = line.y + L.iconY;
      const parts: GameObjects.Image[] = [];
      const inputs = Object.entries(recipe.inputs).map(([itemId, need], i) => {
        const x = line.x + L.input.x + i * L.input.step;
        parts.push(add(x, iconY, itemDef(itemId).icon, DEPTHS.menu + 2));
        return { itemId, need, text: text(x + L.input.textX, line.y + L.input.textY), name: name(itemId, x, line.y) };
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
        outputName: name(recipe.output.itemId, outX, line.y),
      };
      frame.on('pointerdown', () => {
        if (!this.open || !canCraft(this.known, row.recipeId)) return;
        flashRow(scene, frame.x, frame.y, RECIPE_ROW_FRAMES.press);
        onCraft(row.recipeId);
      });
      const index = this.rows.length;
      frame.on('pointerover', () => this.hover.set(index, canCraft(this.known, row.recipeId)));
      frame.on('pointerout', () => this.hover.leave(index));
      this.rows.push(row);
    }
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** What the menu shows, for the test hook (026). */
  get state(): CraftMenuState {
    const L = CRAFT_MENU_LAYOUT;
    return {
      open: this.open,
      rows: this.rows.map((r) => ({
        recipeId: r.recipeId,
        shown: this.open && r.frame.visible,
        x: r.frame.x,
        y: r.frame.y,
        w: L.rowWidth,
        h: L.rowHeight,
        labels: [
          ...r.inputs.map((i) => ({ ...box(i.name), itemId: i.itemId, missing: i.name.color === L.missing })),
          { ...box(r.outputName), itemId: r.outputId, missing: false },
        ],
        counts: [
          ...r.inputs.map((i) => ({ ...box(i.text), missing: i.text.color === L.missing })),
          { ...box(r.made), missing: false },
          { ...box(r.owned), missing: false },
        ],
      })),
      headers: [...this.headers.entries()].map(([ammoId, h]) => ({ ...box(h.name), ammoId, shown: this.open && h.icon.visible })),
    };
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
    else this.update(this.known);
  }

  /** Refreshes counts, greying and missing inputs while open; recipes not yet known (012) stay hidden. */
  update(sim: Known): void {
    this.known = sim;
    const { inventory } = sim;
    if (!this.open) return;
    const L = CRAFT_MENU_LAYOUT;
    for (const group of CRAFT_GROUPS) {
      const header = this.headers.get(group.ammoId);
      const known = group.recipes.some((id) => knownRecipe(sim, id));
      header?.icon.setVisible(known);
      header?.name.setVisible(known);
    }
    for (const [i, r] of this.rows.entries()) {
      const known = knownRecipe(sim, r.recipeId);
      for (const o of [r.frame, ...r.parts]) o.setVisible(known);
      for (const t of [...r.inputs.flatMap((i) => [i.text, i.name]), r.made, r.owned, r.outputName]) t.setVisible(known);
      if (!known) continue;
      const affordable = canCraft(sim, r.recipeId);
      const alpha = affordable ? 1 : L.greyAlpha;
      const textAlpha = affordable ? 1 : L.greyTextAlpha;
      for (const input of r.inputs) {
        const have = count(inventory, input.itemId);
        input.text.set(`${have}/${input.need}`);
        // Short of an input: its name and count in the missing colour (026).
        const fill = have < input.need ? L.missing : undefined;
        for (const t of [input.text, input.name]) t.setFill(fill).setAlpha(textAlpha);
      }
      r.owned.set(String(count(inventory, r.outputId)));
      for (const t of [r.made, r.owned, r.outputName]) t.setAlpha(textAlpha);
      for (const p of r.parts) p.setAlpha(alpha);
      r.frame.setAlpha(alpha);
      r.frame.setFrame(this.hover.frame(i, affordable));
    }
  }
}
