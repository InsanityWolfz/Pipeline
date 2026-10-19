import type { Scene } from 'phaser';
import { OBJECTIVES } from '../data/objectives';
import type { SimEvents } from '../sim/events';
import { currentObjective } from '../sim/objectives';
import type { SimState } from '../sim/state';
import { IntakePrompt } from './IntakePrompt';
import { MadePopups } from './MadePopups';
import { ObjectiveView } from './ObjectiveView';
import { PromptView, type PromptState } from './PromptView';
import { TutorialView } from './TutorialView';

/** The piece the current objective names, whose build-bar cell pulses (027), or null. */
export function highlightOf(sim: SimState): string | null {
  const i = currentObjective(sim);
  return (i === null ? undefined : OBJECTIVES[i]?.highlight) ?? null;
}

// Everything the tutorial (012) draws: the tube stone and sealed doors in the
// world, the objective line, and the key prompts (the intake's own since 024);
// the foundry steps' intake marker and "+ shaft" popups (027).
export class TutorialUi {
  private readonly world: TutorialView;
  private readonly objective: ObjectiveView;
  private readonly prompt: PromptView;
  private readonly intake: IntakePrompt;
  private readonly made: MadePopups;

  constructor(scene: Scene) {
    this.world = new TutorialView(scene);
    this.objective = new ObjectiveView(scene);
    this.prompt = new PromptView(scene);
    this.intake = new IntakePrompt(scene);
    this.made = new MadePopups(scene);
  }

  /** The intake's prompt text while it shows (024), for the test hook. */
  get intakePrompt(): string | null {
    return this.intake.shown;
  }

  /** The key prompt as drawn, the intake marker's point, and the "+ shaft" popups on screen (027), for the test hook. */
  get keyPrompt(): PromptState | null {
    return this.prompt.shown;
  }

  get marker(): { x: number; y: number } | null {
    return this.prompt.markerAt;
  }

  get madePopups(): string[] {
    return this.made.shown;
  }

  /** One-shot effects from the events since the last draw: a machine step's popup (027). */
  play(events: SimEvents, sim: SimState, shown: string, topOf: (id: number) => number | undefined): void {
    this.made.play(events, sim.foundry, shown, topOf);
  }

  /** True over the objective band, so a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.objective.overUi(x, y);
  }

  update(sim: SimState, shown: string): void {
    this.world.update(sim, shown);
    this.objective.update(sim);
    this.prompt.update(sim, shown);
    this.intake.update(sim, shown);
  }
}
