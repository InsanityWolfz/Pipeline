import type { Scene } from 'phaser';
import type { SimState } from '../sim/state';
import { ObjectiveView } from './ObjectiveView';
import { PromptView } from './PromptView';
import { TutorialView } from './TutorialView';

// Everything the tutorial (012) draws: the tube stone and sealed doors in the
// world, the objective line, and the key prompts.
export class TutorialUi {
  private readonly world: TutorialView;
  private readonly objective: ObjectiveView;
  private readonly prompt: PromptView;

  constructor(scene: Scene) {
    this.world = new TutorialView(scene);
    this.objective = new ObjectiveView(scene);
    this.prompt = new PromptView(scene);
  }

  /** True over the objective band, so a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.objective.overUi(x, y);
  }

  update(sim: SimState, shown: string): void {
    this.world.update(sim, shown);
    this.objective.update(sim);
    this.prompt.update(sim, shown);
  }
}
