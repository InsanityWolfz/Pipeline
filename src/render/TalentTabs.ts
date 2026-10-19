import type { GameObjects, Scene } from 'phaser';
import { SPRITES } from '../data/assets';
import { GEAR_PANEL } from '../data/gearAssets';
import { TALENT_TABS, type TalentTab } from '../data/legibility';
import { colorOf } from './color';
import { MENU_HOVER_EVENT } from './menuFeedback';
import { onRect, type TalentPanelLayout } from './talentLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

// The T panel's title card with its two tabs (040), Talents and Build, in 036's tab style:
// the open tab filled brass, the other carved, a hovered one lit, with the hover sound.
export class TalentTabs {
  private readonly scene: Scene;
  private readonly card: GameObjects.Image;
  private readonly g: GameObjects.Graphics;
  private readonly texts: TextLine[];
  private hovered: TalentTab | null = null;

  constructor(scene: Scene, depth: number) {
    this.scene = scene;
    this.card = addVector(scene, 0, 0, SPRITES.inventoryTitle).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    this.texts = TALENT_TABS.tabs.map((t) => new TextLine(scene, 0, 0, depth + 3, false, 'body').set(t.text));
  }

  setVisible(on: boolean): void {
    this.card.setVisible(on);
    this.g.setVisible(on);
    for (const t of this.texts) t.setVisible(on);
  }

  /** The tab under a view point, or null. */
  tabAt(L: TalentPanelLayout, x: number, y: number): TalentTab | null {
    return L.tabs.find((t) => onRect(t.box, x, y))?.id ?? null;
  }

  /** The cursor is at a view point: a tab under it lights, with the hover sound on a new one. */
  pointAt(L: TalentPanelLayout, x: number, y: number): void {
    const tab = this.tabAt(L, x, y);
    if (tab !== null && tab !== this.hovered) this.scene.events.emit(MENU_HOVER_EVENT);
    this.hovered = tab;
  }

  /** Draws the card over the panel and its tabs, `open` filled. */
  draw(L: TalentPanelLayout, open: TalentTab): void {
    const C = GEAR_PANEL.colors;
    this.card.setPosition(L.title.x, L.title.y);
    this.g.clear();
    L.tabs.forEach((t, i) => {
      const fill = t.id === open ? C.tabOn : C.tab;
      this.g.fillStyle(colorOf(fill.color), fill.alpha).fillRect(t.box.x, t.box.y, t.box.w, t.box.h);
      if (t.id === this.hovered) this.g.fillStyle(colorOf(C.hover.color), C.hover.alpha).fillRect(t.box.x, t.box.y, t.box.w, t.box.h);
      const text = this.texts[i];
      text?.moveTo(Math.round(t.box.x + (t.box.w - text.width) / 2), t.box.y + TALENT_TABS.textY);
    });
  }
}
