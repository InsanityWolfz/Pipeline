import type { Scene, Time } from 'phaser';
import { DEPTHS, KO_FADE_MS, WAKE_TEXT } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { itemDef } from '../data/items';
import { TextLine } from './textLine';

// After a KO (011): "You wake in the foundry", then what the death cost, centred
// on screen for a few seconds before fading. Reads only the KO's lost report.
export class WakeView {
  private readonly scene: Scene;
  private lines: TextLine[] = [];
  private timer: Time.TimerEvent | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** Shows the wake-up text for a KO that lost `lost` (item id to count), once the KO's fade has played. */
  show(lost: Readonly<Record<string, number>>): void {
    this.clear();
    this.timer = this.scene.time.delayedCall(KO_FADE_MS * 2, () => this.draw(lost));
  }

  private draw(lost: Readonly<Record<string, number>>): void {
    const items = Object.entries(lost).filter(([, n]) => n > 0);
    const text = [WAKE_TEXT.title, ...(items.length > 0 ? ['', WAKE_TEXT.lostTitle, ...items.map(([id, n]) => `${itemDef(id).name} ${n}`)] : [])];
    const cx = VIEW_WIDTH / 2;
    const top = VIEW_HEIGHT / 2 + WAKE_TEXT.top;
    // The title in the display face, then what was lost below it.
    let y = top;
    this.lines = text.map((t, i) => {
      const line = new TextLine(this.scene, 0, y, DEPTHS.menu + 2, false, i === 0 ? 'title' : i === 2 ? 'display' : 'body');
      line.set(t).moveTo(Math.round(cx - line.width / 2), y);
      y += i === 0 ? line.lineHeight : WAKE_TEXT.lineStep;
      return line;
    });
    this.timer = this.scene.time.delayedCall(WAKE_TEXT.holdMs, () => this.fade());
  }

  private fade(): void {
    const lines = this.lines;
    this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: WAKE_TEXT.fadeMs,
      onUpdate: (tween) => {
        for (const l of lines) l.setAlpha(tween.getValue() ?? 0);
      },
      onComplete: () => {
        if (lines === this.lines) this.clear();
      },
    });
  }

  private clear(): void {
    this.timer?.remove();
    this.timer = null;
    for (const l of this.lines) l.set('');
    this.lines = [];
  }
}
