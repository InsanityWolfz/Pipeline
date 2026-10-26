import type { Scene } from 'phaser';
import type { SimEvents } from '../sim/events';
import { nextGhost } from '../sim/guided';
import type { SimState } from '../sim/state';
import { IntakePrompt } from './IntakePrompt';
import { InteractPrompt } from './InteractPrompt';
import { boundLetter } from './keyHint';
import { RESTORE_ENTRANCE_PROMPT } from '../data/objectives';
import { MadePopups } from './MadePopups';
import { ObjectiveView } from './ObjectiveView';
import { PromptView } from './PromptView';
import { TutorialView } from './TutorialView';
import { WaypointView } from './WaypointView';
import { GuidedView, NO_GUIDED } from './GuidedView';
import { SealedDoorView } from './SealedDoorView';
import type { UiState } from './testHook';
import type { ScreenBox } from './bottomHud';

/** What the tutorial reports to the test hook's `ui()`. */
export type TutorialUiState = Pick<UiState, 'intakePrompt' | 'prompt' | 'marker' | 'waypoint' | 'objective' | 'madePopups' | 'objectiveTick' | 'interactPrompt' | 'guided' | 'sealedDoor'>;

/** The tutorial's part of `ui()` before the scene has built its views. */
export const NO_TUTORIAL_UI: TutorialUiState = { intakePrompt: null, prompt: null, marker: null, waypoint: null, objective: { text: '', subSteps: [] }, madePopups: [], objectiveTick: 0, interactPrompt: null, guided: NO_GUIDED, sealedDoor: null };

/** The piece whose build-bar cell pulses (027) and takes the guide arrow (058): the guided step's next piece to place, or null. */
export function highlightOf(sim: SimState): string | null {
  const g = nextGhost(sim)?.ghost;
  return g?.kind === 'place' ? g.piece : null;
}

// Everything the tutorial (012) draws: the tube stone and sealed doors in the
// world, the objective line, and the key prompts (the intake's own since 024);
// the foundry steps' intake marker and "+ shaft" popups (027); the in-reach E prompt (045); and (067) a sealed
// door's line.
export class TutorialUi {
  private readonly world: TutorialView;
  private readonly objective: ObjectiveView;
  private readonly prompt: PromptView;
  private readonly intake: IntakePrompt;
  private readonly interact: InteractPrompt;
  private readonly made: MadePopups;
  private readonly waypoint: WaypointView;
  private readonly guided: GuidedView;
  private readonly sealed: SealedDoorView;

  constructor(scene: Scene) {
    this.world = new TutorialView(scene);
    this.objective = new ObjectiveView(scene);
    this.prompt = new PromptView(scene);
    this.intake = new IntakePrompt(scene);
    this.interact = new InteractPrompt(scene);
    this.made = new MadePopups(scene);
    this.waypoint = new WaypointView(scene);
    this.guided = new GuidedView(scene);
    this.sealed = new SealedDoorView(scene);
  }

  /**
   * For the test hook: the intake's prompt text while it shows (024), the key prompt as drawn, the intake marker's
   * point, and the "+ shaft" popups on screen (027) with their screen boxes (031).
   */
  get state(): TutorialUiState {
    return {
      intakePrompt: this.intake.shown,
      prompt: this.prompt.shown,
      marker: this.waypoint.markerAt,
      waypoint: this.waypoint.shown,
      objective: { text: this.objective.text, subSteps: this.objective.subSteps },
      madePopups: this.made.shown,
      objectiveTick: this.objective.tickAlpha,
      interactPrompt: this.interact.shown,
      guided: this.guided.shown,
      sealedDoor: this.sealed.shown,
    };
  }

  /** True over the objective band, so a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.objective.overUi(x, y);
  }

  /**
   * Draws the tutorial for the room on screen; `events` since the last draw pop a machine step's "+ shaft" (027) over its
   * piece's top (`topOf`). `deltaMs` is the frame's time on the tween clock (as the banner's), for the guided hint.
   */
  update(sim: SimState, shown: string, events: SimEvents, deltaMs: number, topOf: (id: number) => number | undefined, hud: readonly ScreenBox[] = []): void {
    this.made.play(events, sim.foundry, shown, topOf);
    this.world.update(sim, shown);
    this.guided.update(sim, shown, events, deltaMs);
    this.sealed.update(sim, shown, events, deltaMs);
    this.objective.update(sim);
    this.prompt.update(sim, shown);
    const band = this.objective.box;
    this.intake.update(sim, shown);
    // 045: the in-reach prompt, unless the objective's or the intake's already shows its key lit.
    const lit = [...(this.prompt.shown?.usable ? [this.prompt.shown.key] : []), ...(this.intake.lit ? [boundLetter(RESTORE_ENTRANCE_PROMPT.key)] : [])];
    this.interact.update(sim, shown, lit);
    // 058: after the prompts, so the arrow keeps clear of their caps.
    const caps = [this.prompt.capBox, this.interact.capBox].flatMap((b) => (b ? [b] : []));
    this.waypoint.update(sim, shown, band ? [...hud, band] : hud, caps);
  }
}
