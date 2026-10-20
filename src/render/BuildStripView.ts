import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { BUILD_STRIP } from '../data/hudLayout';
import type { ScreenBox } from './bottomHud';
import { buildStripEntries, buildStripLayout, type StripEntry } from './buildStrip';
import { colorOf } from './color';
import { settings } from './flow/settingsStore';
import { TextLine } from './textLine';

/** The strip as drawn (045), for `ui().buildBar.strip`: whether it shows, its entries and the box behind them, view px. */
export interface BuildStripState {
  shown: boolean;
  entries: StripEntry[];
  box: ScreenBox;
}

// The build controls strip (045, note 9): just above the build bar in build mode, each control's input (the bound key,
// 042, or the mouse) in gold and what it does, on a faint ink back. Hidden outside build mode.
export class BuildStripView {
  private readonly back: GameObjects.Graphics;
  private readonly keys: TextLine[];
  private readonly words: TextLine[];
  private entries: StripEntry[] = [];
  private box: ScreenBox = { x: 0, y: 0, w: 0, h: 0 };
  private shown = false;

  constructor(scene: Scene) {
    const n = BUILD_STRIP.entries.length;
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud).setVisible(false);
    this.keys = Array.from({ length: n }, () => new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'label').setFill(BUILD_STRIP.keyColor).setVisible(false));
    this.words = Array.from({ length: n }, () => new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'label').setVisible(false));
  }

  get state(): BuildStripState {
    return { shown: this.shown, entries: this.shown ? this.entries.map((e) => ({ ...e })) : [], box: { ...this.box } };
  }

  update(building: boolean): void {
    this.shown = building;
    this.back.setVisible(building);
    for (const t of [...this.keys, ...this.words]) t.setVisible(building);
    if (!building) return;
    const entries = buildStripEntries(settings().bindings);
    // Relaid only when a key changes (042: the player rebinds in Settings).
    if (entries.map((e) => e.key).join() === this.entries.map((e) => e.key).join()) return;
    this.entries = entries;
    entries.forEach((e, i) => {
      this.keys[i]?.set(e.key);
      this.words[i]?.set(e.does);
    });
    const L = buildStripLayout(entries.map((_, i) => ({ key: this.keys[i]?.width ?? 0, does: this.words[i]?.width ?? 0 })));
    L.parts.forEach((p, i) => {
      this.keys[i]?.moveTo(p.key.x, p.key.y);
      this.words[i]?.moveTo(p.does.x, p.does.y);
    });
    this.box = L.back;
    this.back.clear().fillStyle(colorOf(BUILD_STRIP.backColor), BUILD_STRIP.backAlpha).fillRect(L.back.x, L.back.y, L.back.w, L.back.h);
  }
}
