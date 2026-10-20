import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { NOTICE } from '../../data/flowLayout';
import { drawTablet } from '../tablet';
import { TextLine } from '../textLine';

// A short notice (042): "Couldn't save. Export your save from Settings.", storage being blocked, a bad import. In 031's
// pickup-feed style: a faint tablet with one line, top-left under the feed, holding a few seconds then fading. It never
// stops play. A new notice replaces the one showing.

export class NoticeView {
  private readonly back: GameObjects.Graphics;
  private readonly text: TextLine;
  private ageMs = Infinity;
  private shown: string | null = null;

  constructor(scene: Scene) {
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu + 40);
    this.text = new TextLine(scene, NOTICE.x, NOTICE.y + NOTICE.textY, DEPTHS.menu + 41, false, 'body');
    this.draw(0);
  }

  show(message: string): void {
    this.shown = message;
    this.ageMs = 0;
    this.text.set(message);
    this.draw(1);
  }

  /** The notice on screen, or null (`ui().flow.notice`). */
  get current(): string | null {
    return this.shown;
  }

  update(dtMs: number): void {
    if (this.shown === null) return;
    this.ageMs += dtMs;
    const N = NOTICE;
    if (this.ageMs >= N.holdMs + N.fadeMs) {
      this.shown = null;
      this.draw(0);
      return;
    }
    this.draw(this.ageMs <= N.holdMs ? 1 : 1 - (this.ageMs - N.holdMs) / N.fadeMs);
  }

  private draw(alpha: number): void {
    const N = NOTICE;
    this.back.clear();
    this.text.setVisible(alpha > 0).setAlpha(alpha);
    if (alpha <= 0) return;
    drawTablet(this.back, N.x - N.pad, N.y, this.text.width + 2 * N.pad, N.h, N.alpha * alpha);
  }
}
