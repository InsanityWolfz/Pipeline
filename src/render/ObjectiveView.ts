import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, HUD_DIGITS, GLYPH_HEIGHT } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { OBJECTIVES } from '../data/objectives';
import { currentObjective } from '../sim/objectives';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

/** The HUD font's glyph height, px. */

// The objective line (012): the first unfinished goal, on the right of the screen
// below the minimap (019). Finishing one flashes a ley tick beside the line before it moves on.
export class ObjectiveView {
  private readonly scene: Scene;
  private readonly line: GlyphLine;
  private readonly tick: GameObjects.Image;
  private readonly panel: GameObjects.Graphics;
  private shown: number | null = -1;

  constructor(scene: Scene) {
    this.scene = scene;
    this.line = new GlyphLine(scene, 0, TUTORIAL_LAYOUT.objectiveTop);
    const L = TUTORIAL_LAYOUT;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud - 1);
    this.tick = scene.add
      .image(0, L.objectiveTop - L.tickRise, ATLAS_KEY, TUTORIAL_SPRITES.tick)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud)
      .setAlpha(0);
  }

  update(sim: SimState): void {
    const i = currentObjective(sim);
    if (i === this.shown) return;
    const finished = this.shown !== -1;
    this.shown = i;
    const text = i === null ? '' : (OBJECTIVES[i]?.text ?? '');
    const x = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight - text.length * HUD_DIGITS.advance;
    this.line.moveTo(x, TUTORIAL_LAYOUT.objectiveTop);
    this.line.set(text);
    this.drawPanel(x - TUTORIAL_LAYOUT.tickGap - this.tick.width, text);
    if (!finished) return;
    // The new goal fades in beside the tick for the one just done.
    this.line.setAlpha(0);
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: TUTORIAL_LAYOUT.objectiveFadeMs, onUpdate: (t) => this.line.setAlpha(t.getValue() ?? 1) });
    this.tick.setX(x - TUTORIAL_LAYOUT.tickGap).setAlpha(1);
    this.scene.tweens.add({ targets: this.tick, alpha: 0, delay: TUTORIAL_LAYOUT.tickMs / 2, duration: TUTORIAL_LAYOUT.tickMs / 2 });
  }

  /** The band's screen rect while it shows, so a press on it never fires (015). */
  private band: { x: number; y: number; w: number; h: number } | null = null;

  overUi(x: number, y: number): boolean {
    const b = this.band;
    return b !== null && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  }

  /** A dark band behind the text and the tick's place left of it, so both read over doors, barriers and busy floors. */
  private drawPanel(x: number, text: string): void {
    const { objectivePanel: P, objectiveTop } = TUTORIAL_LAYOUT;
    this.panel.clear();
    this.band = null;
    if (!text) return;
    const w = VIEW_WIDTH - TUTORIAL_LAYOUT.objectiveRight - x;
    this.band = { x: x - P.padX, y: objectiveTop - P.padY, w: w + 2 * P.padX, h: GLYPH_HEIGHT + 2 * P.padY };
    this.panel.fillStyle(colorOf(P.back), P.alpha).fillRect(x - P.padX, objectiveTop - P.padY, w + 2 * P.padX, GLYPH_HEIGHT + 2 * P.padY);
  }
}
