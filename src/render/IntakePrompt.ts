import type { GameObjects, Scene } from 'phaser';
import { boundLetter } from './keyHint';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { RESTORE_ENTRANCE_PROMPT } from '../data/objectives';
import { FOUNDRY_ROOM } from '../data/rooms';
import { diagramInReach, nextEntranceNode, nodeReady } from '../sim/research';
import type { SimState } from '../sim/state';
import { intakeAnchor } from './foundryLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

// The intake's prompt (024, 033): "E: restore an entrance" on the wall beside the
// pipe, while the player is in the foundry, attuned, carrying what the next entrance
// node costs (a warden core for the second) with a cap still on. Dimmed until the
// player stands where E would open a cap's restore panel, as other prompts are.
export class IntakePrompt {
  private readonly cap: GameObjects.Image;
  private readonly key: TextLine;
  private readonly text: TextLine;
  /** The prompt's text while it shows, for the test hook; null when hidden. */
  shown: string | null = null;
  /** Shown at full strength: E at the intake would open a cap's restore panel now (045: the in-reach prompt gives way). */
  lit = false;

  constructor(scene: Scene) {
    const L = TUTORIAL_LAYOUT.intakePrompt;
    const at = intakeAnchor();
    const x = at.x + L.x;
    const bottom = at.y + L.y;
    this.cap = addVector(scene, x, bottom, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.prompt);
    this.key = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true);
    this.key.set(RESTORE_ENTRANCE_PROMPT.key);
    this.key.moveTo(Math.round(x - this.key.width / 2), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
    this.text = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true, 'float');
    this.text.set(RESTORE_ENTRANCE_PROMPT.text);
    this.text.moveTo(Math.round(x + this.cap.displayWidth / 2 + L.textGap), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
    this.setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    const next = nextEntranceNode(sim);
    const capped = sim.link.entrances.some((e) => !e.open);
    const on = shown === FOUNDRY_ROOM && sim.link.attuned && capped && next !== undefined && nodeReady(sim, next.id);
    this.setVisible(on);
    const key = boundLetter(RESTORE_ENTRANCE_PROMPT.key);
    this.shown = on ? `${key}: ${RESTORE_ENTRANCE_PROMPT.text}` : null;
    this.lit = false;
    if (!on) return;
    // 042: the bound key, which Settings may have changed.
    this.key.set(key);
    // Full strength once E would open a cap's restore panel: a cap's diagram in reach.
    const capInReach = (diagramInReach(sim)?.entrance ?? null) !== null;
    this.lit = capInReach;
    const alpha = capInReach ? 1 : TUTORIAL_LAYOUT.promptDimAlpha;
    this.cap.setAlpha(alpha);
    this.key.setAlpha(alpha);
    this.text.setAlpha(alpha);
  }

  private setVisible(on: boolean): void {
    this.cap.setVisible(on);
    this.key.setVisible(on);
    this.text.setVisible(on);
  }
}
