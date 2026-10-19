import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES, TUBE_SLOT_FRAMES, tubeSlotFrame } from '../data/assets';
import { ammoDef } from '../data/ammo';
import { HUD_LAYOUT, ITEM_ICON_SIZE } from '../data/hudLayout';
import { itemDef } from '../data/items';
import type { HudActive } from '../sim/volley';
import { tubeSlotBox, tubeSlotUnits, type ScreenBox } from './bottomHud';
import { TextLine } from './textLine';
import { addVector, showFrame, textureScale } from './vector/textures';

interface Unit {
  icon: GameObjects.Image;
  label: TextLine;
}

/** What the tube slot shows, for the test hook: its screen rect, and each unit's icon frame and text. */
export interface TubeSlotState extends ScreenBox {
  icons: string[];
  labels: string[];
  /** Each label's left and width, view px, so a test can check it stays clear of its well's ring. */
  labelBoxes: { x: number; w: number }[];
}

// The tube slot (025): centred above the hotbar row and `activeScale` times its size,
// it shows what the next fire press does, as the sim's `hudActive` says: the carried
// round of the selected ammo and its count; else the volley, one icon per round with
// its entrance's count; else a fist labelled "Melee".
export class TubeSlotView {
  private readonly frame: GameObjects.Image;
  private readonly units: Unit[];
  private shown: TubeSlotState = { ...tubeSlotBox(1), icons: [], labels: [], labelBoxes: [] };

  constructor(scene: Scene) {
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, depth: number = DEPTHS.hud): T => {
      o.setScrollFactor(0).setDepth(depth);
      return o;
    };
    this.frame = fixed(addVector(scene, 0, 0, tubeSlotFrame(1)).setOrigin(0));
    this.units = TUBE_SLOT_FRAMES.map(() => ({
      icon: fixed(addVector(scene, 0, 0, SPRITES.hudFist).setOrigin(0), DEPTHS.hud + 1),
      label: new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'count', HUD_LAYOUT.activeScale),
    }));
  }

  /** The slot's screen rect, so clicks on it never fire (015). */
  get box(): ScreenBox {
    const { x, y, w, h } = this.shown;
    return { x, y, w, h };
  }

  /** What it shows now, for `ui().hud`. */
  get state(): TubeSlotState {
    return { ...this.shown, icons: [...this.shown.icons], labels: [...this.shown.labels], labelBoxes: this.shown.labelBoxes.map((b) => ({ ...b })) };
  }

  /** `building`: the build bar is up, so the slot sits above its group labels (026). */
  update(active: HudActive, building = false): void {
    const S = HUD_LAYOUT.tubeSlot;
    // A volley has one round per intake entrance, and there's a frame for each count; more would be a bug.
    if (active.kind === 'volley' && active.rounds.length > this.units.length) {
      console.error(`The tube slot has ${this.units.length} units, but the volley has ${active.rounds.length} rounds`);
    }
    const shows: { icon: string; label: string }[] =
      active.kind === 'carried'
        ? [{ icon: ammoIcon(active.ammoId), label: String(active.count) }]
        : active.kind === 'volley'
          ? active.rounds.slice(0, this.units.length).map((r) => ({ icon: ammoIcon(r.ammoId), label: String(r.count) }))
          : [{ icon: SPRITES.hudFist, label: S.melee }];
    const box = tubeSlotBox(shows.length, building);
    showFrame(this.frame, tubeSlotFrame(shows.length)).setOrigin(0).setPosition(box.x, box.y);
    const at = tubeSlotUnits(shows.length, building);
    const iconSize = ITEM_ICON_SIZE * HUD_LAYOUT.activeScale;
    const labelBoxes: { x: number; w: number }[] = [];
    this.units.forEach((u, i) => {
      const show = shows[i];
      const pos = at[i];
      const visible = show !== undefined && pos !== undefined;
      u.icon.setVisible(visible);
      u.label.setVisible(visible);
      if (!show || !pos) return;
      showFrame(u.icon, show.icon)
        .setOrigin(0)
        .setScale(HUD_LAYOUT.activeScale / textureScale())
        .setPosition(pos.x + (S.w - iconSize) / 2, pos.y + S.iconY);
      u.label.set(show.label);
      const labelX = Math.round(pos.x + (S.w - u.label.width) / 2);
      u.label.moveTo(labelX, pos.y + S.countY);
      labelBoxes.push({ x: labelX, w: u.label.width });
    });
    this.shown = { ...box, icons: shows.map((s) => s.icon), labels: shows.map((s) => s.label), labelBoxes };
  }
}

const ammoIcon = (ammoId: string): string => itemDef(ammoDef(ammoId).itemId).icon;
