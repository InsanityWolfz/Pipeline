import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { AMMO } from '../data/ammo';
import { HUD_LAYOUT } from '../data/hudLayout';
import { count, type Inventory } from '../sim/inventory';
import type { HotbarState } from '../sim/hotbar';
import { hotbarBox, hotbarCells, type ScreenBox } from './bottomHud';
import { TextLine } from './textLine';
import { inBox } from './tipPlace';
import type { TipHit } from './tipTypes';
import { addVector, showFrame } from './vector/textures';
import { carriedSlotLook } from './carriedSlot';

interface Cell {
  x: number;
  icon: GameObjects.Image;
  count: TextLine;
}

/** The carried bar as drawn (047), for `ui().hud`: each slot's kind and count, whether it's empty, and (070) whether its round shows greyed. */
export interface CarriedBarShown {
  slots: { itemId: string | null; count: number; empty: boolean; greyed: boolean }[];
}

// The carried bar (047, note 11): five slots along the bottom (keys 1–5), each with its key
// number, its kind's icon and how many are carried, the selected one highlighted; right
// click uses the selected item. A slot whose items ran out keeps its kind (047.3) and (070) its
// icon, greyed, with "0". Hidden before the tube and while building (the build bar takes its place).
export class HotbarView {
  private readonly cells: Cell[];
  private readonly highlight: GameObjects.Image;
  /** Every image and number the row draws, for showing and hiding it whole. */
  private readonly parts: { setVisible(visible: boolean): unknown }[] = [];
  private shown = true;
  /** The highlighted cell's index (0 for key 1). */
  private selectedIndex = 0;
  private slots: (string | null)[] = [];
  private drawn: CarriedBarShown = { slots: [] };
  /** The row's screen rect, so clicks on it never fire (015). */
  readonly box: ScreenBox = hotbarBox();

  constructor(scene: Scene) {
    const L = HUD_LAYOUT.cell;
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(DEPTHS.hud);
      return o;
    };
    this.cells = hotbarCells().map(({ x, y }, i) => {
      this.parts.push(fixed(addVector(scene, x, y, SPRITES.hudAmmoCell).setOrigin(0)));
      const icon = fixed(addVector(scene, x + L.icon.x, y + L.icon.y, SPRITES.iconArrow).setOrigin(0));
      const key = new TextLine(scene, x + L.key.x, y + L.key.y, DEPTHS.hud, false, 'count');
      key.set(String(i + 1));
      const cellCount = new TextLine(scene, x + L.count.x, y + L.count.y, DEPTHS.hud, false, 'count');
      this.parts.push(key);
      return { x, icon, count: cellCount };
    });
    this.highlight = fixed(addVector(scene, this.box.x, this.box.y, SPRITES.hudAmmoSelect).setOrigin(0));
    this.highlight.setDepth(DEPTHS.hud + 1);
    this.parts.push(this.highlight);
  }

  get selected(): number {
    return this.selectedIndex;
  }

  get visible(): boolean {
    return this.shown;
  }

  /** What each slot shows, for the test hook. */
  get state(): CarriedBarShown {
    return { slots: this.drawn.slots.map((s) => ({ ...s })) };
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    for (const p of this.parts) p.setVisible(visible);
    this.draw();
  }

  /** The slot under a view point (047: a stack dropped there goes on it), or null. */
  slotAt(x: number, y: number): number | null {
    return this.shown ? (hotbarCells().find((c) => inBox(c, x, y))?.slot ?? null) : null;
  }

  /** The slot's round under a view point (040: its summary above the row); an empty slot has none. */
  tipAt(x: number, y: number): TipHit | null {
    const cell = this.shown ? hotbarCells().find((c) => inBox(c, x, y)) : undefined;
    const itemId = cell ? this.slots[cell.slot] : null;
    return cell && itemId && AMMO[itemId] ? { source: { kind: 'round', id: itemId }, at: cell, anchor: { box: cell, prefer: ['above'] } } : null;
  }

  update(hotbar: HotbarState, inventory: Inventory): void {
    this.slots = [...hotbar.slots];
    this.drawn = {
      slots: hotbar.slots.map((itemId) => {
        const n = itemId ? count(inventory, itemId) : 0;
        return { itemId, count: n, empty: itemId === null || n === 0, greyed: carriedSlotLook(itemId, n).greyed };
      }),
    };
    const cell = this.cells[hotbar.selected];
    if (cell) this.highlight.setX(cell.x);
    this.selectedIndex = hotbar.selected;
    this.draw();
  }

  private draw(): void {
    for (const [i, c] of this.cells.entries()) {
      const slot = this.drawn.slots[i];
      // A slot with no kind shows nothing but its key; one whose rounds ran out (047.3) its icon greyed, with "0" (070).
      const look = carriedSlotLook(slot?.itemId ?? null, slot?.count ?? 0);
      const show = this.shown && look.icon !== null;
      c.icon.setVisible(show);
      c.count.setVisible(show);
      if (!show || look.icon === null) continue;
      showFrame(c.icon, look.icon).setOrigin(0).setAlpha(look.alpha);
      c.count.set(look.count ?? '').setAlpha(look.alpha);
    }
  }
}
