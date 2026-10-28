import type { GameObjects, Input, Scene } from 'phaser';
import { ammoDef } from '../data/ammo';
import { DEPTHS, SPRITES } from '../data/assets';
import { CRAFT_TABS, craftRecipeDef } from '../data/craftTabs';
import { CRAFT_MENU_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { canCraft, craftHeld, craftKnown, type CraftStores } from '../sim/crafting';
import { colorOf } from './color';
import { craftPanelAt, craftTabBoxes, craftTabRows, rowNameXs } from './craftMenuLayout';
import { flashRow, RowHover, type RowFrames } from './menuFeedback';
import { drawGlow, drawTablet } from './tablet';
import { MenuMotion } from './MenuMotion';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

const RECIPE_ROW_FRAMES: RowFrames = { plain: SPRITES.craftRecipeRow, hover: SPRITES.craftRecipeRowHover, press: SPRITES.craftRecipeRowPress };

interface Row {
  recipeId: string;
  /** Which tab it's on (047): a part two families use has a row on each. */
  tab: number;
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

interface Tab {
  ammoId: string;
  icon: GameObjects.Image;
  name: TextLine;
}

/** A line of text as drawn, view px: (x, y) is the top of its capitals, `h` its line height. */
export interface TextBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The crafting menu as drawn (026, 047), for `ui().craftMenu`: its tabs, the open one, and each tab's rows with their item names and counts. */
export interface CraftMenuState {
  open: boolean;
  /** The open tab's family (its base ammo id). */
  tab: string;
  tabs: { ammoId: string; label: string; shown: boolean; x: number; y: number; w: number; h: number }[];
  rows: {
    recipeId: string;
    /** The tab it's on, by family. */
    tab: string;
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
}

const box = (line: TextLine): TextBox => ({ text: line.obj.text, ...line.at, w: line.width, h: line.lineHeight });

// The crafting menu (026; 047): a tab per ammo family down the left (Arrows, Bombs, Ley, Landmines), the open tab's
// recipes to the right, its whole chain (parts included) then its tagged rounds. Each row shows its inputs
// (held/needed) and what it makes and how many of that are held, every item's name under its icon. Clicking an
// affordable row crafts it once (070: Shift-click, as many as it can); clicking a tab opens it. Reads sim state; crafting goes through `onCraft`.
export class CraftMenuView {
  private readonly objects: (GameObjects.Image & GameObjects.Components.Visible)[] = [];
  private readonly lines: TextLine[] = [];
  private readonly rows: Row[] = [];
  private readonly tabs: Tab[] = [];
  private readonly hover: RowHover;
  private open = false;
  private tab = 0;
  private known: CraftStores = { inventory: {}, link: { entrances: [] }, found: [], claims: [] };
  /** The title card's tablet, and the tabs' tablets. */
  private readonly card: GameObjects.Graphics;
  private readonly tabBacks: GameObjects.Graphics;
  /** 081: the open's fade and rise, and the tab fade over the rows. */
  private readonly motion: MenuMotion;

  constructor(scene: Scene, onCraft: (recipeId: string, max: boolean) => void) {
    const L = CRAFT_MENU_LAYOUT;
    this.hover = new RowHover(scene, RECIPE_ROW_FRAMES);
    // Its rows take clicks through Phaser's hit areas, so it fades in without the rise (081.3).
    this.motion = new MenuMotion(scene, 'craft', DEPTHS.menu, false);
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
    // An item's name under its icon; placed once the row's names are all set (rowNameXs: 026's place, clear of each other).
    const name = (itemId: string, iconX: number, rowY: number): TextLine => text(iconX, rowY + L.labelY, 'label').set(itemDef(itemId).name);
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
    this.tabBacks = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu + 1);

    for (const t of craftTabBoxes()) {
      const icon = add(t.x + L.tab.icon.x, t.y + L.tab.icon.y, itemDef(ammoDef(t.ammoId).itemId).icon, DEPTHS.menu + 2);
      this.tabs.push({ ammoId: t.ammoId, icon, name: text(t.x + L.tab.name.x, t.y + L.tab.name.y, 'label').set(t.label) });
    }

    for (const [tab] of CRAFT_TABS.entries()) {
      for (const line of craftTabRows(tab)) {
        const recipe = craftRecipeDef(line.id);
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
        this.motion.adopt([frame, ...parts, ...inputs.flatMap((i) => [i.text, i.name]), made], this.motion.tabLayer(DEPTHS.menu + 1));
        const row: Row = {
          recipeId: line.id,
          tab,
          frame,
          parts,
          inputs,
          made,
          owned: text(outX + L.output.textX, line.y + L.output.ownedY),
          outputId: recipe.output.itemId,
          outputName: name(recipe.output.itemId, outX, line.y),
        };
        const names = [...inputs.map((input, i) => ({ line: input.name, iconX: L.input.x + i * L.input.step })), { line: row.outputName, iconX: L.output.x }];
        this.motion.adopt([row.owned, row.outputName], this.motion.tabLayer(DEPTHS.menu + 1));
        rowNameXs(names.map((n) => ({ iconX: n.iconX, w: n.line.width }))).forEach((x, i) => names[i]?.line.moveTo(line.x + x, line.y + L.labelY));
        frame.on('pointerdown', (pointer: Input.Pointer) => {
          if (!this.open || this.tab !== row.tab || !canCraft(this.known, row.recipeId)) return;
          flashRow(scene, frame.x, frame.y, RECIPE_ROW_FRAMES.press);
          // 070: Shift-click crafts as many as the inventory affords.
          onCraft(row.recipeId, pointer.event.shiftKey);
        });
        const index = this.rows.length;
        frame.on('pointerover', () => this.hover.set(index, canCraft(this.known, row.recipeId)));
        frame.on('pointerout', () => this.hover.leave(index));
        this.rows.push(row);
      }
    }
    // The panel, the title card and the tabs (the rows are in the tab layer already).
    this.motion.adopt([...this.objects.filter((o) => !o.parentContainer), this.card, this.tabBacks, ...this.lines.filter((l) => !l.obj.parentContainer)]);
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** What the menu shows, for the test hook (026, 047). */
  get state(): CraftMenuState {
    const L = CRAFT_MENU_LAYOUT;
    return {
      open: this.open,
      tab: CRAFT_TABS[this.tab]?.ammoId ?? '',
      tabs: craftTabBoxes().map((t, i) => ({ ammoId: t.ammoId, label: t.label, shown: this.open && (this.tabs[i]?.icon.visible ?? false), x: t.x, y: t.y, w: t.w, h: t.h })),
      rows: this.rows.map((r) => ({
        recipeId: r.recipeId,
        tab: CRAFT_TABS[r.tab]?.ammoId ?? '',
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

  /** A click on a shown tab opens it (047). Returns whether it hit one. */
  click(x: number, y: number): boolean {
    if (!this.open) return false;
    const i = craftTabBoxes().findIndex((t, k) => (this.tabs[k]?.icon.visible ?? false) && x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
    if (i < 0) return false;
    this.showTab(i);
    return true;
  }

  /** Opens a tab by index (the test hook and clicks). */
  showTab(i: number): void {
    if (i < 0 || i >= CRAFT_TABS.length) return;
    if (this.open && i !== this.tab) this.motion.switchTab();
    this.tab = i;
    this.hover.set(-1);
    this.hover.close();
    this.update(this.known);
  }

  setOpen(open: boolean): void {
    // 081: opening fades it in and up (input live from the first frame); closing is instant.
    if (open && !this.open) this.motion.show();
    if (!open) this.motion.hide();
    this.open = open;
    for (const o of this.objects) o.setVisible(open);
    this.card.setVisible(open);
    this.tabBacks.setVisible(open);
    for (const l of this.lines) l.setVisible(open);
    if (!open) this.hover.close();
    // Hide unknown recipes straight away, not a frame later.
    this.update(this.known);
  }

  /** Refreshes the tabs, counts, greying and missing inputs while open; recipes not yet known (012) stay hidden, and a tab until its ammo is known (038: Landmines after ley-iron). */
  update(sim: CraftStores): void {
    this.known = sim;
    if (!this.open) {
      for (const r of this.rows) r.frame.disableInteractive();
      return;
    }
    const L = CRAFT_MENU_LAYOUT;
    const tabKnown = CRAFT_TABS.map((t) => craftKnown(sim, t.ammoId));
    // The open tab is always one the player can see: the first known, if the open one isn't.
    if (!tabKnown[this.tab]) this.tab = Math.max(0, tabKnown.indexOf(true));
    this.tabBacks.clear();
    for (const [i, t] of craftTabBoxes().entries()) {
      const view = this.tabs[i];
      const shown = tabKnown[i] ?? false;
      view?.icon.setVisible(shown);
      view?.name.setVisible(shown).setAlpha(i === this.tab ? 1 : L.tabClosedAlpha);
      if (!shown) continue;
      drawTablet(this.tabBacks, t.x, t.y, t.w, t.h, i === this.tab ? 1 : L.tabClosedAlpha);
      if (i !== this.tab) continue;
      // The open tab's brass stripe, with a soft gold glow (081).
      const sx = t.x + t.w - L.tabStripe.w;
      const sy = t.y + L.tabStripe.inset;
      drawGlow(this.tabBacks, sx, sy, L.tabStripe.w, t.h - 2 * L.tabStripe.inset);
      this.tabBacks.fillStyle(colorOf(L.tabOpen), 1).fillRect(sx, sy, L.tabStripe.w, t.h - 2 * L.tabStripe.inset);
    }
    for (const [i, r] of this.rows.entries()) {
      const shown = r.tab === this.tab && craftKnown(sim, r.recipeId);
      for (const o of [r.frame, ...r.parts]) o.setVisible(shown);
      for (const t of [...r.inputs.flatMap((i) => [i.text, i.name]), r.made, r.owned, r.outputName]) t.setVisible(shown);
      if (shown) r.frame.setInteractive();
      else r.frame.disableInteractive();
      if (!shown) continue;
      const affordable = canCraft(sim, r.recipeId);
      const alpha = affordable ? 1 : L.greyAlpha;
      const textAlpha = affordable ? 1 : L.greyTextAlpha;
      for (const input of r.inputs) {
        const have = craftHeld(sim, r.recipeId, input.itemId);
        input.text.set(`${have}/${input.need}`);
        // Short of an input: its name and count in the missing colour (026).
        const fill = have < input.need ? L.missing : undefined;
        for (const t of [input.text, input.name]) t.setFill(fill).setAlpha(textAlpha);
      }
      r.owned.set(String(craftHeld(sim, r.recipeId, r.outputId)));
      for (const t of [r.made, r.owned, r.outputName]) t.setAlpha(textAlpha);
      for (const p of r.parts) p.setAlpha(alpha);
      r.frame.setAlpha(alpha);
      this.hover.paint(i, r.frame, affordable);
    }
  }
}
