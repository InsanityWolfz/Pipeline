import { Display, type GameObjects, type Scene } from 'phaser';
import { ATLAS_KEY, digitFrame, HUD_DIGITS, HUD_SLOT_LAYOUT, SPRITES } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { ITEMS } from '../data/items';
import { paletteHex } from '../data/palette';
import { LOAD_TICKS, TUBE_CAPACITY } from '../data/tube';
import type { Inventory } from '../sim/inventory';
import { count } from '../sim/inventory';
import { slotItem, type TubeState } from '../sim/tube';

/** Above everything in the world. */
const HUD_DEPTH = 1_000_000;

const colorOf = (id: string): number => Display.Color.HexStringToColor(paletteHex(id)).color;

/** A line of HUD font glyphs that only rebuilds when its text changes. */
class GlyphLine {
  private readonly scene: Scene;
  private readonly x: number;
  private readonly y: number;
  private text = '';
  private glyphs: GameObjects.Image[] = [];

  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  set(text: string): void {
    if (text === this.text) return;
    this.text = text;
    for (const g of this.glyphs) g.destroy();
    this.glyphs = [...text].map((ch, i) =>
      this.scene.add
        .image(this.x + i * HUD_DIGITS.advance, this.y, ATLAS_KEY, digitFrame(ch))
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH),
    );
  }
}

// The hotbar: slot 1 with its ammo icon, loaded/capacity, the carried count and
// a load bar. Fixed to the screen; reads sim state only.
export class HudView {
  private readonly slot: GameObjects.Image;
  private readonly loaded: GlyphLine;
  private readonly carried: GlyphLine;
  private readonly loadBar: GameObjects.Graphics;
  private readonly crosshair: GameObjects.Image;
  private readonly itemId: string;
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    const item = ITEMS[slotItem()];
    if (!item) throw new Error(`Unknown slot item '${slotItem()}'`);
    this.itemId = item.id;

    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(HUD_DEPTH);
      return o;
    };
    this.slot = fixed(scene.add.image(0, 0, ATLAS_KEY, SPRITES.hudSlot).setOrigin(0));
    const left = Math.round((VIEW_WIDTH - this.slot.width) / 2);
    const top = VIEW_HEIGHT - this.slot.height - HUD_SLOT_LAYOUT.margin;
    this.slot.setPosition(left, top);
    const { icon, loaded, carried } = HUD_SLOT_LAYOUT;
    fixed(scene.add.image(left + icon.x, top + icon.y, ATLAS_KEY, item.icon).setOrigin(0));
    this.loaded = new GlyphLine(scene, left + loaded.x, top + loaded.y);
    this.carried = new GlyphLine(scene, left + carried.x, top + carried.y);
    this.loadBar = fixed(scene.add.graphics({ x: left, y: top }));

    scene.input.setDefaultCursor('none');
    this.crosshair = fixed(scene.add.image(0, 0, ATLAS_KEY, SPRITES.crosshair));
  }

  update(tube: TubeState, inventory: Inventory): void {
    this.loaded.set(`${tube.loaded}/${TUBE_CAPACITY}`);
    this.carried.set(String(count(inventory, this.itemId)));

    const bar = HUD_SLOT_LAYOUT.loadBar;
    this.loadBar.clear();
    if (tube.loading) {
      this.loadBar.fillStyle(colorOf(HUD_SLOT_LAYOUT.loadBarColor));
      this.loadBar.fillRect(bar.x, bar.y, Math.round((bar.w * tube.loadProgress) / LOAD_TICKS), bar.h);
    }

    if (tube.dryFire > 0) this.slot.setTint(colorOf(HUD_SLOT_LAYOUT.dryFireTint));
    else this.slot.clearTint();

    const pointer = this.scene.input.activePointer;
    this.crosshair.setPosition(Math.round(pointer.x), Math.round(pointer.y));
  }
}
