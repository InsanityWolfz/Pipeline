import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { INTERACT_PROMPTS, type InteractKind } from '../data/interact';
import { interactTarget } from '../sim/interactables';
import type { SimState } from '../sim/state';
import { boundLetter } from './keyHint';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The in-reach prompt as drawn (045), for the test hook: what it's over, its key and the world point it floats over. */
export interface InteractPromptState {
  kind: InteractKind;
  key: string;
  x: number;
  y: number;
}

// The in-reach E prompt (045, note 7 and 043.5): the objective prompt's key cap (012) and the bound key (042) over
// whatever E would act on now, from a node (a ley crystal vein like any other) to the Bulwark's sealed door. It gives
// way to the objective's own prompt or the intake's when either already shows E.
export class InteractPrompt {
  private readonly cap: GameObjects.Image;
  private readonly key: TextLine;
  shown: InteractPromptState | null = null;

  constructor(scene: Scene) {
    this.cap = addVector(scene, 0, 0, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.prompt).setVisible(false);
    this.key = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true).setVisible(false);
  }

  /** `eShown`: the objective's or the intake's prompt already shows E at full strength. */
  update(sim: SimState, shown: string, eShown: boolean): void {
    const target = shown === sim.roomId && !eShown ? interactTarget(sim) : null;
    const prompt = target ? INTERACT_PROMPTS[target.kind] : null;
    this.cap.setVisible(target !== null);
    this.key.setVisible(target !== null);
    this.shown = target && prompt ? { kind: target.kind, key: boundLetter(prompt.key), x: target.x, y: target.y } : null;
    if (!target || !prompt) return;
    const x = Math.round(target.x);
    const bottom = Math.round(target.y - prompt.rise - TUTORIAL_LAYOUT.promptLift);
    this.cap.setPosition(x, bottom);
    this.key.set(boundLetter(prompt.key));
    this.key.moveTo(Math.round(x - this.key.width / 2), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
  }
}
