import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { INTERACT_PROMPTS, type InteractKind } from '../data/interact';
import { interactTarget } from '../sim/interactables';
import type { SimState } from '../sim/state';
import { boundLetter } from './keyHint';
import { TextLine } from './textLine';
import { capBox, type ViewRect } from './waypointPlace';
import { addVector } from './vector/textures';

/** The in-reach prompt as drawn (045), for the test hook: what it's over, its key and the world point it floats over. */
export interface InteractPromptState {
  kind: InteractKind;
  key: string;
  x: number;
  y: number;
}

/** The x the prompt's key cap is centred on: over its point, or `beside` it on the side away from the player (052.9). */
export function promptCapX(kind: InteractKind, x: number, playerX: number): number {
  const side = INTERACT_PROMPTS[kind].beside ?? 0;
  return Math.round(x + (playerX > x ? -side : side));
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

  /** 058: the key cap's world rect while it shows, else null. */
  get capBox(): ViewRect | null {
    return capBox(this.cap);
  }

  /** `litKeys`: the keys the objective's and the intake's prompts already show at full strength (it gives way to them). */
  update(sim: SimState, shown: string, litKeys: readonly string[]): void {
    const found = shown === sim.roomId ? interactTarget(sim) : null;
    const target = found && !litKeys.includes(boundLetter(INTERACT_PROMPTS[found.kind].key)) ? found : null;
    const prompt = target ? INTERACT_PROMPTS[target.kind] : null;
    this.cap.setVisible(target !== null);
    this.key.setVisible(target !== null);
    this.shown = target && prompt ? { kind: target.kind, key: boundLetter(prompt.key), x: target.x, y: target.y } : null;
    if (!target || !prompt) return;
    const x = promptCapX(target.kind, target.x, sim.player.x);
    const bottom = Math.round(target.y - prompt.rise - TUTORIAL_LAYOUT.promptLift);
    this.cap.setPosition(x, bottom);
    this.key.set(boundLetter(prompt.key));
    this.key.moveTo(Math.round(x - this.key.width / 2), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
  }
}
