import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { HUD_LAYOUT } from '../data/hudLayout';
import { ammoDef } from '../data/ammo';
import { itemDef } from '../data/items';
import { count, type Inventory } from '../sim/inventory';
import type { TubeState } from '../sim/tube';
import { hotbarBox, hotbarCells, type ScreenBox } from './bottomHud';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

interface Cell {
  ammoId: string;
  x: number;
  count: TextLine;
}

// The hotbar row (025): the three ammo the tube switches between (keys 1, 2 and 3),
// centred along the bottom, each with its key number, icon and carried count, the
// selected one highlighted. Hidden before the tube and while building (the build bar
// takes its place).
export class HotbarView {
  private readonly cells: Cell[];
  private readonly highlight: GameObjects.Image;
  /** Every image and number the row draws, for showing and hiding it whole. */
  private readonly parts: { setVisible(visible: boolean): unknown }[] = [];
  private shown = true;
  /** The highlighted cell's index (0 for key 1). */
  private selectedIndex = 0;
  /** The row's screen rect, so clicks on it never fire (015). */
  readonly box: ScreenBox = hotbarBox();

  constructor(scene: Scene) {
    const L = HUD_LAYOUT.cell;
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(DEPTHS.hud);
      return o;
    };
    this.cells = hotbarCells().map(({ ammoId, x, y }, i) => {
      this.parts.push(fixed(addVector(scene, x, y, SPRITES.hudAmmoCell).setOrigin(0)));
      const icon = itemDef(ammoDef(ammoId).itemId).icon;
      this.parts.push(fixed(addVector(scene, x + L.icon.x, y + L.icon.y, icon).setOrigin(0)));
      const key = new TextLine(scene, x + L.key.x, y + L.key.y, DEPTHS.hud, false, 'count');
      key.set(String(i + 1));
      const cellCount = new TextLine(scene, x + L.count.x, y + L.count.y, DEPTHS.hud, false, 'count');
      this.parts.push(key, cellCount);
      return { ammoId, x, count: cellCount };
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

  setVisible(visible: boolean): void {
    this.shown = visible;
    for (const p of this.parts) p.setVisible(visible);
  }

  update(tube: TubeState, inventory: Inventory): void {
    for (const [i, c] of this.cells.entries()) {
      c.count.set(String(count(inventory, ammoDef(c.ammoId).itemId)));
      if (c.ammoId !== tube.ammoId) continue;
      this.highlight.setX(c.x);
      this.selectedIndex = i;
    }
  }
}
