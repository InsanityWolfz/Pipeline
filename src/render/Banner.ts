import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { DISCOVERY_BANNER } from '../data/landmarkAssets';
import { LANDMARKS } from '../data/landmarks';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

/** One banner: what it's about (`kind`, `id`, for the test hook), a small kicker line and the name under it. */
export interface BannerEntry {
  kind: 'discovery' | 'schematic';
  id: string;
  kicker: string;
  name: string;
}

// The banner (032, shared by 033's schematics): top centre under the objective band,
// a kicker line over a name on a tablet, fading in, holding `bannerMs`, fading out.
// Entries queue and show in turn, so a discovery and a schematic never overlap. Its
// time runs on the tween clock the caller passes, so the test hook can hold it.
export class Banner {
  private readonly panel: GameObjects.Graphics;
  private readonly kicker: TextLine;
  private readonly name: TextLine;
  private queue: BannerEntry[] = [];
  private on: BannerEntry | null = null;
  private ms = 0;

  constructor(scene: Scene) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud - 1).setVisible(false);
    this.kicker = new TextLine(scene, 0, 0, DEPTHS.hud, false, 'label').setVisible(false);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud, false, 'title').setVisible(false);
  }

  /** The entry showing, and how strongly (0..1), or null. */
  get current(): (BannerEntry & { alpha: number }) | null {
    return this.on ? { ...this.on, alpha: this.name.obj.alpha } : null;
  }

  push(entry: BannerEntry): void {
    this.queue.push(entry);
  }

  /** Advances `deltaMs` on the tween clock: starts the next entry when none shows, fades it in, holds it and fades it out. */
  update(deltaMs: number): void {
    const B = DISCOVERY_BANNER;
    const parts = [this.panel, this.kicker, this.name];
    if (!this.on) {
      const next = this.queue.shift();
      if (!next) return;
      this.on = next;
      this.ms = 0;
      this.kicker.set(next.kicker);
      this.name.set(next.name);
      const w = Math.max(this.name.width, this.kicker.width) + B.pad.x * 2;
      const h = this.kicker.lineHeight + B.kickerGap + this.name.lineHeight + B.pad.y * 2;
      this.panel.clear();
      drawTablet(this.panel, Math.round(VIEW_WIDTH / 2 - w / 2), B.top, w, h, B.alpha);
      this.kicker.moveTo(Math.round(VIEW_WIDTH / 2 - this.kicker.width / 2), B.top + B.pad.y);
      this.name.moveTo(Math.round(VIEW_WIDTH / 2 - this.name.width / 2), B.top + B.pad.y + this.kicker.lineHeight + B.kickerGap);
    }
    this.ms += deltaMs;
    const total = B.fadeInMs + LANDMARKS.bannerMs + B.fadeOutMs;
    const alpha = this.ms < B.fadeInMs ? this.ms / B.fadeInMs : this.ms < B.fadeInMs + LANDMARKS.bannerMs ? 1 : Math.max(0, (total - this.ms) / B.fadeOutMs);
    for (const o of parts) o.setVisible(true).setAlpha(alpha);
    if (this.ms < total) return;
    this.on = null;
    for (const o of parts) o.setVisible(false);
  }
}
