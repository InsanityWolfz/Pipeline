import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { RESTORE_ENTRANCE_PROMPT as INTAKE_PROMPT } from '../data/objectives';
import { FOUNDRY_ROOM } from '../data/rooms';
import { intakeInReach } from '../sim/intake';
import { affordable, nextEntranceNode, requiresMet } from '../sim/research';
import type { SimState } from '../sim/state';
import { intakeAnchor } from './foundryLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

// The intake's prompt (024, 033): "E: restore an entrance" on the wall beside the
// pipe, while the player is in the foundry, attuned, carrying what the next entrance
// node costs (a warden core for the second) with a cap still on. Dimmed until the
// player is in reach, as other prompts are.
export class IntakePrompt {
  private readonly cap: GameObjects.Image;
  private readonly key: TextLine;
  private readonly text: TextLine;
  /** The prompt's text while it shows, for the test hook; null when hidden. */
  shown: string | null = null;

  constructor(scene: Scene) {
    const L = TUTORIAL_LAYOUT.intakePrompt;
    const at = intakeAnchor();
    const x = at.x + L.x;
    const bottom = at.y + L.y;
    this.cap = addVector(scene, x, bottom, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.prompt);
    this.key = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true);
    this.key.set(INTAKE_PROMPT.key);
    this.key.moveTo(Math.round(x - this.key.width / 2), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
    this.text = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true, 'float');
    this.text.set(INTAKE_PROMPT.text);
    this.text.moveTo(Math.round(x + this.cap.displayWidth / 2 + L.textGap), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
    this.setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    const next = nextEntranceNode(sim);
    const capped = sim.link.entrances.some((e) => !e.open);
    const on = shown === FOUNDRY_ROOM && sim.link.attuned && capped && next !== undefined && requiresMet(sim, next) && affordable(sim.inventory, next);
    this.setVisible(on);
    this.shown = on ? `${INTAKE_PROMPT.key}: ${INTAKE_PROMPT.text}` : null;
    if (!on) return;
    const alpha = intakeInReach(sim) ? 1 : TUTORIAL_LAYOUT.promptDimAlpha;
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
