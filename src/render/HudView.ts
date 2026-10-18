import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, HUD_HEALTH_LAYOUT, HUD_MATERIALS_LAYOUT, HUD_SLOT_LAYOUT, SPRITES } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { itemDef, ITEMS } from '../data/items';
import { MAX_HEALTH } from '../data/player';
import { LOAD_TICKS, STARTING_AMMO, TUBE_CAPACITY } from '../data/tube';
import type { Inventory } from '../sim/inventory';
import { count } from '../sim/inventory';
import type { PlayerState } from '../sim/player';
import { slotItem, type TubeState } from '../sim/tube';
import { AmmoStripView } from './AmmoStripView';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

/** One material row: its icon and count, shown only while the player holds some. */
interface MaterialRow {
  itemId: string;
  icon: GameObjects.Image;
  count: GlyphLine;
}

// The hotbar: slot 1 with its selected ammo's icon, loaded/capacity, the carried
// count and a load bar, and the ammo strip beside it; the health bar and the
// raw materials and parts held, top-left. Fixed to the screen; reads sim state only.
export class HudView {
  private readonly slot: GameObjects.Image;
  private readonly icon: GameObjects.Image;
  private readonly loaded: GlyphLine;
  private readonly carried: GlyphLine;
  private readonly loadBar: GameObjects.Graphics;
  private readonly crosshair: GameObjects.Image;
  private readonly scene: Scene;
  private readonly healthFill: GameObjects.Graphics;
  private readonly materials: MaterialRow[];
  private readonly strip: AmmoStripView;

  constructor(scene: Scene) {
    this.scene = scene;
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(DEPTHS.hud);
      return o;
    };
    this.slot = fixed(scene.add.image(0, 0, ATLAS_KEY, SPRITES.hudSlot).setOrigin(0));
    const left = Math.round((VIEW_WIDTH - this.slot.width) / 2);
    const top = VIEW_HEIGHT - this.slot.height - HUD_SLOT_LAYOUT.margin;
    this.slot.setPosition(left, top);
    const { icon, loaded, carried } = HUD_SLOT_LAYOUT;
    const startIcon = itemDef(slotItem({ ammoId: STARTING_AMMO })).icon;
    this.icon = fixed(scene.add.image(left + icon.x, top + icon.y, ATLAS_KEY, startIcon).setOrigin(0));
    this.loaded = new GlyphLine(scene, left + loaded.x, top + loaded.y);
    this.carried = new GlyphLine(scene, left + carried.x, top + carried.y);
    this.loadBar = fixed(scene.add.graphics({ x: left, y: top }));
    this.strip = new AmmoStripView(scene, left + this.slot.width, top + this.slot.height);

    const hp = HUD_HEALTH_LAYOUT;
    fixed(scene.add.image(hp.x, hp.y, ATLAS_KEY, SPRITES.hudHealth).setOrigin(0));
    this.healthFill = fixed(scene.add.graphics({ x: hp.x + hp.fill.x, y: hp.y + hp.fill.y }));

    // Raw materials and parts, in ITEMS order; ammo shows in the hotbar instead. Rows are placed each frame.
    this.materials = Object.values(ITEMS)
      .filter((it) => it.kind !== 'ammo')
      .map((it) => ({
        itemId: it.id,
        icon: fixed(scene.add.image(0, 0, ATLAS_KEY, it.icon).setOrigin(0)),
        count: new GlyphLine(scene, 0, 0),
      }));

    scene.input.setDefaultCursor('none');
    // Over the crafting menu too, where it's the pointer for clicking rows.
    this.crosshair = fixed(scene.add.image(0, 0, ATLAS_KEY, SPRITES.crosshair)).setDepth(DEPTHS.menu + 1);
  }

  update(tube: TubeState, inventory: Inventory, player: PlayerState): void {
    const fill = HUD_HEALTH_LAYOUT.fill;
    this.healthFill.clear();
    this.healthFill.fillStyle(colorOf(HUD_HEALTH_LAYOUT.fillColor));
    this.healthFill.fillRect(0, 0, Math.round((fill.w * player.health) / MAX_HEALTH), fill.h);

    const m = HUD_MATERIALS_LAYOUT;
    let row = 0;
    for (const r of this.materials) {
      const n = count(inventory, r.itemId);
      const shown = n > 0;
      r.icon.setVisible(shown);
      r.count.setVisible(shown);
      if (!shown) continue;
      const y = m.y + row * m.rowStep;
      r.icon.setPosition(m.x, y);
      r.count.moveTo(m.x + m.count.x, y + m.count.y);
      r.count.set(String(n));
      row += 1;
    }

    const item = slotItem(tube);
    this.icon.setFrame(itemDef(item).icon);
    this.loaded.set(`${tube.loaded}/${TUBE_CAPACITY}`);
    this.carried.set(String(count(inventory, item)));
    this.strip.update(tube, inventory);

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
