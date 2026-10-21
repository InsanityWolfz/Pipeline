import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES, tubeSlotFrame } from '../data/assets';
import { MOUSE_HINT, SLOT_SWAP } from '../data/hints';
import { HUD_LAYOUT } from '../data/hudLayout';
import { MOUSE_INPUTS } from '../data/settings';
import { hotbarBox, hotbarCells, type ScreenBox } from './bottomHud';
import { settings } from './flow/settingsStore';
import { keyLabel } from './keyHint';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector, showFrame } from './vector/textures';

/** The right-click hint as drawn (051, B.7), for `ui().hud.carriedHint`. */
export interface CarriedHintShown {
  /** The mouse (right click) or the bound key's label, beside the carried bar while it shows. */
  shown: boolean;
  input: 'mouse' | 'key';
  label: string;
  box: ScreenBox;
  /** The slot swap: playing now, how far through its shrink (0..1, on the tween clock), and how many times it has played. */
  swapping: boolean;
  progress: number;
  swaps: number;
}

// Learning right click (051, B.7). 047.9's banner line gave way to a small mouse beside the carried bar, its right
// button lit (or, with "Use carried item" bound to a key, that key's label in a little tablet). As the attune ends on
// the first entry, the old left-click slot (the carried round the intake's bar showed) shrinks down into the carried
// bar's selected cell, and the intake's slot appears in its place.
export class CarriedHintView {
  private readonly scene: Scene;
  private readonly mouse: GameObjects.Image;
  private readonly keyPanel: GameObjects.Graphics;
  private readonly key: TextLine;
  private state: CarriedHintShown = { shown: false, input: 'mouse', label: '', box: { x: 0, y: 0, w: 0, h: 0 }, swapping: false, progress: 0, swaps: 0 };

  constructor(scene: Scene) {
    this.scene = scene;
    this.mouse = addVector(scene, 0, 0, SPRITES.hudMouse).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.hud).setVisible(false);
    this.keyPanel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    this.key = new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'count');
  }

  get shown(): CarriedHintShown {
    return { ...this.state, box: { ...this.state.box } };
  }

  /** The hint's box while it shows, so a press on it never fires (015). */
  get box(): ScreenBox | null {
    return this.state.shown ? this.state.box : null;
  }

  /** Beside the carried bar while it shows (`visible`): the mouse, or the bound key. */
  update(visible: boolean): void {
    const bound = settings().bindings.use;
    const mouse = MOUSE_INPUTS.includes(bound);
    const bar = hotbarBox();
    const x = bar.x + bar.w + MOUSE_HINT.gap;
    this.mouse.setVisible(visible && mouse);
    this.key.setVisible(visible && !mouse);
    this.keyPanel.clear();
    const label = mouse ? '' : keyLabel(bound);
    let box: ScreenBox;
    if (mouse) {
      const w = this.mouse.displayWidth;
      const h = this.mouse.displayHeight;
      box = { x, y: Math.round(bar.y + (bar.h - h) / 2), w, h };
      this.mouse.setPosition(box.x, box.y);
    } else {
      this.key.set(label);
      const pad = MOUSE_HINT.pad;
      box = { x, y: Math.round(bar.y + (bar.h - this.key.lineHeight) / 2) - pad, w: this.key.width + 2 * pad, h: this.key.lineHeight + 2 * pad };
      if (visible) drawTablet(this.keyPanel, box.x, box.y, box.w, box.h);
      this.key.moveTo(box.x + pad, box.y + pad);
    }
    this.state = { ...this.state, shown: visible, input: mouse ? 'mouse' : 'key', label, box };
  }

  /**
   * The slot swap: a copy of the old slot (its frame and the round's icon, at `from`) shrinks down into the carried
   * bar's `selected` cell and fades; `grow` fades the intake's slot (its new frame and rounds) in in its place.
   */
  swap(from: ScreenBox, icon: string | undefined, selected: number, grow: (alpha: number) => void): void {
    const S = SLOT_SWAP;
    const cell = hotbarCells()[selected] ?? hotbarCells()[0];
    if (!cell) return;
    const frame = addVector(this.scene, from.x + from.w / 2, from.y + from.h / 2, tubeSlotFrame(1)).setScrollFactor(0).setDepth(DEPTHS.hud + 2);
    frame.setOrigin(0.5);
    const parts: GameObjects.Image[] = [frame];
    if (icon) parts.push(showFrame(addVector(this.scene, frame.x, frame.y, icon), icon).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.hud + 3));
    const scales = parts.map((p) => p.scaleX * (p === frame ? 1 : HUD_LAYOUT.activeScale));
    for (const [i, p] of parts.entries()) p.setScale(scales[i] ?? 1);
    const to = { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
    this.state = { ...this.state, swapping: true, progress: 0, swaps: this.state.swaps + 1 };
    grow(0);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: S.shrinkMs,
      ease: 'Quad.InOut',
      onUpdate: (t) => {
        const k = t.getValue() ?? 1;
        this.state = { ...this.state, progress: t.progress };
        const fade = Math.min(1, Math.max(0, (S.shrinkMs - k * S.shrinkMs) / S.fadeMs));
        for (const [i, p] of parts.entries()) {
          p.setPosition(from.x + from.w / 2 + (to.x - from.x - from.w / 2) * k, from.y + from.h / 2 + (to.y - from.y - from.h / 2) * k);
          p.setScale((scales[i] ?? 1) * (1 + (S.endScale - 1) * k)).setAlpha(fade);
        }
      },
      onComplete: () => {
        for (const p of parts) p.destroy();
        this.state = { ...this.state, swapping: false, progress: 1 };
      },
    });
    this.scene.tweens.addCounter({ from: 0, to: 1, delay: S.growDelayMs, duration: S.growMs, onUpdate: (t) => grow(t.getValue() ?? 1), onComplete: () => grow(1) });
  }
}
