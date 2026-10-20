import { keyLook, shownKey } from './itemShown';
import type { SimState } from '../sim/state';
import type { GameObjects, Scene, Time, Tweens } from 'phaser';
import { DEPTHS, KO_FADE_MS, WAKE_TEXT } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import type { TextStyleKey } from '../data/fonts';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

// After a KO (011): "You wake in the foundry", then what the death cost, centred
// on screen for a few seconds before fading. Reads only the KO's lost report.
export class WakeView {
  private readonly scene: Scene;
  private lines: TextLine[] = [];
  /** The stone tablet behind the lines (020). */
  private readonly back: GameObjects.Graphics;
  private timer: Time.TimerEvent | null = null;
  private fading: Tweens.Tween | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu + 1);
  }

  /** The wake panel is on screen (021: the menu pointer shows over it). */
  get isShown(): boolean {
    return this.lines.length > 0;
  }

  /**
   * Shows the wake-up text for a KO that lost `lost` (item id to count), once the KO's fade has played, each item as it
   * shows (033: unknown schematics as one "Unknown schematic" line).
   */
  show(lost: Readonly<Record<string, number>>, sim: Pick<SimState, 'research'>): void {
    this.clear();
    const shown: Record<string, number> = {};
    for (const [id, n] of Object.entries(lost)) if (n > 0) shown[shownKey(sim, id)] = (shown[shownKey(sim, id)] ?? 0) + n;
    this.timer = this.scene.time.delayedCall(KO_FADE_MS * 2, () => this.draw(shown));
  }

  private draw(lost: Readonly<Record<string, number>>): void {
    const items = Object.entries(lost).filter(([, n]) => n > 0);
    // The title, then (after a gap) what was lost: its heading in the display face, each item in the body face.
    const text: [string, TextStyleKey][] = [
      [WAKE_TEXT.title, 'title'],
      ...(items.length > 0
        ? [['', 'body'] as [string, TextStyleKey], [WAKE_TEXT.lostTitle, 'display'] as [string, TextStyleKey], ...items.map(([id, n]): [string, TextStyleKey] => [`${keyLook(id).name} ${n}`, 'body'])]
        : []),
    ];
    const cx = VIEW_WIDTH / 2;
    const top = VIEW_HEIGHT / 2 + WAKE_TEXT.top;
    let y = top;
    this.lines = text.map(([t, style]) => {
      const line = new TextLine(this.scene, 0, y, DEPTHS.menu + 2, false, style);
      line.set(t).moveTo(Math.round(cx - line.width / 2), y);
      y += style === 'title' ? line.lineHeight : WAKE_TEXT.lineStep;
      return line;
    });
    const w = Math.max(...this.lines.map((l) => l.width)) + 2 * WAKE_TEXT.pad;
    this.back.clear().setAlpha(1);
    drawTablet(this.back, Math.round(cx - w / 2), top - WAKE_TEXT.pad, Math.ceil(w), y - top + WAKE_TEXT.pad);
    this.timer = this.scene.time.delayedCall(WAKE_TEXT.holdMs, () => this.fade());
  }

  private fade(): void {
    const lines = this.lines;
    this.fading = this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: WAKE_TEXT.fadeMs,
      onUpdate: (tween) => {
        for (const l of lines) l.setAlpha(tween.getValue() ?? 0);
        this.back.setAlpha(tween.getValue() ?? 0);
      },
      onComplete: () => {
        if (lines === this.lines) this.clear();
      },
    });
  }

  private clear(): void {
    this.timer?.remove();
    this.timer = null;
    this.fading?.stop();
    this.fading = null;
    for (const l of this.lines) l.destroy();
    this.lines = [];
    this.back.clear();
  }
}
