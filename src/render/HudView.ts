import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, HUD_HEALTH_LAYOUT, HUD_MATERIALS_LAYOUT, SPRITES } from '../data/assets';
import { ITEMS } from '../data/items';
import { MAX_HEALTH } from '../data/player';
import type { Inventory } from '../sim/inventory';
import { count } from '../sim/inventory';
import type { ArmorPiece } from '../sim/armor';
import type { PlayerState } from '../sim/player';
import type { TubeState } from '../sim/tube';
import type { HudActive } from '../sim/volley';
import type { ScreenBox } from './bottomHud';
import { HotbarView } from './HotbarView';
import { TubeSlotView, type TubeSlotState } from './TubeSlotView';
import { HUD_ARMOR_LAYOUT } from '../data/hudLayout';
import { colorOf } from './color';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** One material row: its icon and count, shown only while the player holds some. */
interface MaterialRow {
  itemId: string;
  icon: GameObjects.Image;
  count: TextLine;
}

/** The bottom HUD as drawn (025), for `ui().hud`: the hotbar row's rect and whether it shows, and the tube slot. */
export interface BottomHudState {
  /** `selected` is the highlighted cell's index (0 for key 1). */
  hotbar: ScreenBox & { shown: boolean; selected: number };
  tubeSlot: TubeSlotState;
}

// The HUD: along the bottom (025), the hotbar row centred with the tube slot above
// it showing what the next press fires; the health bar and the raw materials and
// parts held, top-left. Fixed to the screen; reads sim state only.
export class HudView {
  private readonly healthFill: GameObjects.Graphics;
  private readonly health: GameObjects.Image;
  private readonly materials: MaterialRow[];
  private readonly hotbar: HotbarView;
  private readonly tubeSlot: TubeSlotView;
  private readonly armorIcon: GameObjects.Image;
  private readonly armorCount: TextLine;

  /** A screen point on any part of the HUD: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    const inBox = (b: { x: number; y: number; w: number; h: number }): boolean => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
    const imageBox = (o: GameObjects.Image) => ({ x: o.x, y: o.y, w: o.displayWidth, h: o.displayHeight });
    const rows = this.materials.filter((m) => m.icon.visible).map((m) => ({ ...imageBox(m.icon), w: HUD_MATERIALS_LAYOUT.rowWidth }));
    const parts = [this.tubeSlot.box, imageBox(this.health), ...rows];
    if (this.hotbar.visible) parts.push(this.hotbar.box);
    if (this.armorIcon.visible) parts.push(imageBox(this.armorIcon));
    return parts.some(inBox);
  }

  constructor(scene: Scene) {
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(DEPTHS.hud);
      return o;
    };
    this.hotbar = new HotbarView(scene);
    this.tubeSlot = new TubeSlotView(scene);

    const hp = HUD_HEALTH_LAYOUT;
    this.health = fixed(addVector(scene, hp.x, hp.y, SPRITES.hudHealth).setOrigin(0));
    this.healthFill = fixed(scene.add.graphics({ x: hp.x + hp.fill.x, y: hp.y + hp.fill.y }));
    const ar = HUD_ARMOR_LAYOUT;
    this.armorIcon = fixed(addVector(scene, ar.x, ar.y, SPRITES.iconArmorLight).setOrigin(0)).setVisible(false);
    this.armorCount = new TextLine(scene, ar.x + ar.count.x, ar.y + ar.count.y, DEPTHS.hud, false, 'count');

    // Raw materials and parts, in ITEMS order; ammo shows in the hotbar instead. Rows are placed each frame.
    this.materials = Object.values(ITEMS)
      .filter((it) => it.kind !== 'ammo')
      .map((it) => ({
        itemId: it.id,
        icon: fixed(addVector(scene, 0, 0, it.icon).setOrigin(0)),
        count: new TextLine(scene, 0, 0, DEPTHS.hud, false, 'count'),
      }));
  }

  /** What the bottom HUD shows, for the test hook. */
  get bottom(): BottomHudState {
    return { hotbar: { ...this.hotbar.box, shown: this.hotbar.visible, selected: this.hotbar.selected }, tubeSlot: this.tubeSlot.state };
  }

  /**
   * `active` is the sim's `hudActive`: what the next press fires. No tube yet (012): no
   * hotbar row, and the tube slot shows the fist. Building: the build bar takes the row's place.
   */
  update(tube: TubeState, inventory: Inventory, player: PlayerState, active: HudActive, worn: ArmorPiece | undefined, hasTube: boolean, building: boolean): void {
    this.hotbar.setVisible(hasTube && !building);
    this.hotbar.update(tube, inventory);
    this.tubeSlot.update(active);
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
  }
}
