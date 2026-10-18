import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, HUD_HEALTH_LAYOUT, HUD_MATERIALS_LAYOUT, HUD_SLOT_LAYOUT, SPRITES } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { itemDef, ITEMS } from '../data/items';
import { MAX_HEALTH } from '../data/player';
import { STARTING_AMMO } from '../data/tube';
import type { Inventory } from '../sim/inventory';
import { count } from '../sim/inventory';
import type { ArmorPiece } from '../sim/armor';
import type { LinkState } from '../sim/link';
import type { PlayerState } from '../sim/player';
import { slotCount, slotItem, type TubeState } from '../sim/tube';
import { AmmoStripView } from './AmmoStripView';
import { HUD_ARMOR_LAYOUT } from '../data/hudLayout';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

/** One material row: its icon and count, shown only while the player holds some. */
interface MaterialRow {
  itemId: string;
  icon: GameObjects.Image;
  count: GlyphLine;
}

// The hotbar: slot 1 with its selected ammo's icon and count (carried rounds,
// else the reservoir's, with a ley glow while it fires from the foundry), and the
// ammo strip beside it; the health bar and the raw materials and parts held,
// top-left. Fixed to the screen; reads sim state only.
export class HudView {
  private readonly slot: GameObjects.Image;
  private readonly icon: GameObjects.Image;
  private readonly glow: GameObjects.Image;
  private readonly count: GlyphLine;
  private readonly crosshair: GameObjects.Image;
  private readonly scene: Scene;
  private readonly healthFill: GameObjects.Graphics;
  private readonly materials: MaterialRow[];
  private readonly strip: AmmoStripView;
  private readonly armorIcon: GameObjects.Image;
  private readonly armorCount: GlyphLine;

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
    const { icon, count: at } = HUD_SLOT_LAYOUT;
    const startIcon = itemDef(slotItem({ ammoId: STARTING_AMMO })).icon;
    this.icon = fixed(scene.add.image(left + icon.x, top + icon.y, ATLAS_KEY, startIcon).setOrigin(0));
    this.glow = fixed(scene.add.image(left, top, ATLAS_KEY, SPRITES.hudSlotGlow).setOrigin(0)).setVisible(false);
    this.count = new GlyphLine(scene, left + at.x, top + at.y);
    this.strip = new AmmoStripView(scene, left + this.slot.width, top + this.slot.height);

    const hp = HUD_HEALTH_LAYOUT;
    fixed(scene.add.image(hp.x, hp.y, ATLAS_KEY, SPRITES.hudHealth).setOrigin(0));
    this.healthFill = fixed(scene.add.graphics({ x: hp.x + hp.fill.x, y: hp.y + hp.fill.y }));
    const ar = HUD_ARMOR_LAYOUT;
    this.armorIcon = fixed(scene.add.image(ar.x, ar.y, ATLAS_KEY, SPRITES.iconArmorLight).setOrigin(0)).setVisible(false);
    this.armorCount = new GlyphLine(scene, ar.x + ar.count.x, ar.y + ar.count.y);

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

  update(tube: TubeState, inventory: Inventory, player: PlayerState, link: LinkState, worn: ArmorPiece | undefined, hasTube: boolean): void {
    // No tube yet (012): no hotbar.
    for (const o of [this.slot, this.icon]) o.setVisible(hasTube);
    this.count.setVisible(hasTube);
    this.strip.setVisible(hasTube);
    this.armorIcon.setVisible(worn !== undefined);
    if (worn) this.armorIcon.setFrame(worn.weight === 'heavy' ? SPRITES.iconArmorHeavy : SPRITES.iconArmorLight);
    this.armorCount.set(worn ? String(worn.armor) : '');
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
    const shown = slotCount({ tube, inventory, link });
    this.count.set(String(shown.count));
    this.glow.setVisible(hasTube && shown.fromReservoir);
    this.strip.update(tube, inventory);

    if (tube.dryFire > 0) this.slot.setTint(colorOf(HUD_SLOT_LAYOUT.dryFireTint));
    else this.slot.clearTint();

    const pointer = this.scene.input.activePointer;
    this.crosshair.setPosition(Math.round(pointer.x), Math.round(pointer.y));
  }
}
