import type { Scene } from 'phaser';
import type { SimEvents } from '../sim/events';
import { currentObjectiveDef } from '../sim/objectives';
import type { SimState } from '../sim/state';
import { IntakePrompt } from './IntakePrompt';
import { InteractPrompt } from './InteractPrompt';
import { boundLetter } from './keyHint';
import { MadePopups } from './MadePopups';
import { ObjectiveView } from './ObjectiveView';
import { PromptView } from './PromptView';
import { TutorialView } from './TutorialView';
import type { UiState } from './testHook';

/** What the tutorial reports to the test hook's `ui()`. */
export type TutorialUiState = Pick<UiState, 'intakePrompt' | 'prompt' | 'marker' | 'madePopups' | 'objectiveTick' | 'interactPrompt'>;

/** The tutorial's part of `ui()` before the scene has built its views. */
export const NO_TUTORIAL_UI: TutorialUiState = { intakePrompt: null, prompt: null, marker: null, madePopups: [], objectiveTick: 0, interactPrompt: null };

/** The piece the current objective names, whose build-bar cell pulses (027), or null. */
export function highlightOf(sim: SimState): string | null {
  return currentObjectiveDef(sim)?.highlight ?? null;
}

// Everything the tutorial (012) draws: the tube stone and sealed doors in the
// world, the objective line, and the key prompts (the intake's own since 024);
// the foundry steps' intake marker and "+ shaft" popups (027); and the in-reach E prompt (045).
export class TutorialUi {
  private readonly world: TutorialView;
  private readonly objective: ObjectiveView;
  private readonly prompt: PromptView;
  private readonly intake: IntakePrompt;
  private readonly interact: InteractPrompt;
  private readonly made: MadePopups;

  constructor(scene: Scene) {
    this.world = new TutorialView(scene);
    this.objective = new ObjectiveView(scene);
    this.prompt = new PromptView(scene);
    this.intake = new IntakePrompt(scene);
    this.interact = new InteractPrompt(scene);
    this.made = new MadePopups(scene);
  }

  /**
   * For the test hook: the intake's prompt text while it shows (024), the key prompt as drawn, the intake marker's
   * point, and the "+ shaft" popups on screen (027) with their screen boxes (031).
   */
  get state(): TutorialUiState {
    return {
      intakePrompt: this.intake.shown,
      prompt: this.prompt.shown,
      marker: this.prompt.markerAt,
      madePopups: this.made.shown,
      objectiveTick: this.objective.tickAlpha,
      interactPrompt: this.interact.shown,
    };
  }

  /** True over the objective band, so a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.objective.overUi(x, y);
  }

  /** Draws the tutorial for the room on screen; `events` since the last draw pop a machine step's "+ shaft" (027) over its piece's top (`topOf`). */
  update(sim: SimState, shown: string, events: SimEvents, topOf: (id: number) => number | undefined): void {
    this.made.play(events, sim.foundry, shown, topOf);
    this.world.update(sim, shown);
    this.objective.update(sim);
    this.prompt.update(sim, shown);
    this.intake.update(sim, shown);
    // 045: the in-reach E prompt, unless the objective's or the intake's already shows E lit.
    const e = boundLetter('E');
    const eShown = (this.prompt.shown?.key === e && this.prompt.shown.usable) || this.intake.lit;
    this.interact.update(sim, shown, eShown);
  }
}
