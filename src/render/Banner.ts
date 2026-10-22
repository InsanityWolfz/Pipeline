import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { BANNER_NAME_MAX_W, DISCOVERY_BANNER } from '../data/landmarkAssets';
import { LANDMARKS } from '../data/landmarks';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

/** One banner: what it's about (`kind`, `id`, for the test hook), a small kicker line and the name under it. */
export interface BannerEntry {
  kind: 'discovery' | 'schematic' | 'unlock';
  id: string;
  kicker: string;
  name: string;
}

/** How many started entries the banner remembers for the test hook. */
const SEEN_KEPT = 8;

// The banner (032, shared by 033's schematics and 058's recipe unlocks): top centre (050: at the top, never over the player),
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
  /** The last few entries that started showing, oldest first (for the test hook: a quick banner can't slip between polls). */
  private started: BannerEntry[] = [];
  /** The showing entry's tablet, view px. */
  private box = { x: 0, y: 0, w: 0, h: 0 };

  constructor(scene: Scene) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud - 1).setVisible(false);
    this.kicker = new TextLine(scene, 0, 0, DEPTHS.hud, false, 'label').setVisible(false);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud, false, 'title').setVisible(false);
    this.name.obj.setAlign('center');
  }

  /** The entry showing, how strongly (0..1) and its tablet's box (view px), or null. */
  get current(): (BannerEntry & { alpha: number; box: { x: number; y: number; w: number; h: number } }) | null {
    return this.on ? { ...this.on, alpha: this.name.obj.alpha, box: this.box } : null;
  }

  /** Nothing showing and nothing queued (between entries one is briefly null while the next waits for the next frame). */
  get idle(): boolean {
    return this.on === null && this.queue.length === 0;
  }

  /** The last few entries that started showing, oldest first. */
  get seen(): readonly BannerEntry[] {
    return this.started;
  }

  /** 058: the name in lines no wider than BANNER_NAME_MAX_W, broken after commas (a single long name stays whole). */
  private wrap(name: string): string[] {
    const parts = name.split(/(?<=,) /);
    const lines: string[] = [];
    for (const part of parts) {
      const last = lines[lines.length - 1];
      if (last !== undefined && this.name.set(`${last} ${part}`).width <= BANNER_NAME_MAX_W) lines[lines.length - 1] = `${last} ${part}`;
      else lines.push(part);
    }
    return lines;
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
      this.started = [...this.started, next].slice(-SEEN_KEPT);
      this.kicker.set(next.kicker);
      const lines = this.wrap(next.name);
      this.name.set(lines.join('\n'));
      const kickerH = next.kicker ? this.kicker.lineHeight + B.kickerGap : 0;
      const w = Math.max(this.name.width, next.kicker ? this.kicker.width : 0) + B.pad.x * 2;
      const h = kickerH + this.name.lineHeight * lines.length + B.pad.y * 2;
      this.panel.clear();
      this.box = { x: Math.round(VIEW_WIDTH / 2 - w / 2), y: B.top, w, h };
      drawTablet(this.panel, this.box.x, B.top, w, h, B.alpha);
      this.kicker.moveTo(Math.round(VIEW_WIDTH / 2 - this.kicker.width / 2), B.top + B.pad.y);
      this.name.moveTo(Math.round(VIEW_WIDTH / 2 - this.name.width / 2), B.top + B.pad.y + kickerH);
    }
    this.ms += deltaMs;
    const total = B.fadeInMs + LANDMARKS.bannerMs + B.fadeOutMs;
    const alpha = this.ms < B.fadeInMs ? this.ms / B.fadeInMs : this.ms < B.fadeInMs + LANDMARKS.bannerMs ? 1 : Math.max(0, (total - this.ms) / B.fadeOutMs);
    for (const o of parts) o.setVisible(o !== this.kicker || this.on.kicker !== '').setAlpha(alpha);
    if (this.ms < total) return;
    this.on = null;
    for (const o of parts) o.setVisible(false);
  }
}
