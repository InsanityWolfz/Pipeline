import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, HUD_DIGITS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { OBJECTIVES } from '../data/objectives';
import { currentObjective } from '../sim/objectives';
import type { SimState } from '../sim/state';
import { GlyphLine } from './glyphLine';

// The objective line (012): the first unfinished goal, centred at the top of the
// screen. Finishing one flashes a ley tick beside the line before it moves on.
export class ObjectiveView {
  private readonly scene: Scene;
  private readonly line: GlyphLine;
  private readonly tick: GameObjects.Image;
  private shown: number | null = -1;

  constructor(scene: Scene) {
    this.scene = scene;
    this.line = new GlyphLine(scene, 0, TUTORIAL_LAYOUT.objectiveTop);
    this.tick = scene.add.image(0, TUTORIAL_LAYOUT.objectiveTop - 2, ATLAS_KEY, TUTORIAL_SPRITES.tick).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTHS.hud).setAlpha(0);
  }

  update(sim: SimState): void {
    const i = currentObjective(sim);
    if (i === this.shown) return;
    const finished = this.shown !== -1;
    this.shown = i;
    const text = i === null ? '' : (OBJECTIVES[i]?.text ?? '');
    const x = Math.round((VIEW_WIDTH - text.length * HUD_DIGITS.advance) / 2);
    this.line.moveTo(x, TUTORIAL_LAYOUT.objectiveTop);
    this.line.set(text);
    if (!finished) return;
    this.tick.setX(x - TUTORIAL_LAYOUT.tickGap).setAlpha(1);
    this.scene.tweens.add({ targets: this.tick, alpha: 0, delay: TUTORIAL_LAYOUT.tickMs / 2, duration: TUTORIAL_LAYOUT.tickMs / 2 });
  }
}
