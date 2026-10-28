import type { GameObjects, Scene } from 'phaser';
import type { Quality } from '../data/settings';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import { BossIntroView, type BossIntroShown } from './BossIntroView';
import { BossPhaseView, type BossPhaseUi } from './BossPhaseView';
import type { FeelView } from './FeelView';
import type { IntroShakeLog } from './JuiceView';
import type { SceneCameras } from './SceneCameras';

// 080: the bosses' show, wired from GameScene in one place: the intro (its card, bursts, sound and shake) and the phase
// looks over the boss's sprite. The pan is SceneCameras.introLook's, run from bossLook.

/** 080: what `ui()` reports of the bosses' show (joined into the test hook's ui state). */
export interface BossShowUi {
  /** The boss in its intro on screen: its beat and frame, the card and the pan; null with none. */
  bossIntro: BossIntroShown;
  /** Each region boss's phase look as drawn, with whether a transition plays. */
  bossPhase: BossPhaseUi;
  /** Every intro shake asked for (the last 50), suppressed or not, and how often the world camera really shook. */
  introShakes: IntroShakeLog[];
  cameraShakes: number;
}

export class BossShow {
  readonly intro: BossIntroView;
  readonly phase: BossPhaseView;

  constructor(scene: Scene, feel: () => FeelView | undefined, quality: () => Quality) {
    this.intro = new BossIntroView(scene, () => feel()?.juice, () => feel()?.sound, quality);
    this.phase = new BossPhaseView(scene, () => feel()?.juice, quality);
  }

  /** The intro's show, by intro ticks, and the phase looks over the enemies just drawn. */
  update(sim: SimState, shown: string, deltaMs: number, enemies: readonly EnemyState[], spriteOf: (id: number) => GameObjects.Sprite | undefined, cameras: SceneCameras | undefined): void {
    this.intro.update(sim, shown, deltaMs, cameras?.panShown ?? { active: false, dx: 0, dy: 0 });
    this.phase.update(enemies, spriteOf, deltaMs);
  }

  get ui(): Pick<BossShowUi, 'bossIntro' | 'bossPhase'> {
    return { bossIntro: this.intro.shown, bossPhase: this.phase.ui };
  }
}

/** `ui()`'s boss show before the scene has built it. */
export const NO_BOSS_SHOW: Pick<BossShowUi, 'bossIntro' | 'bossPhase'> = { bossIntro: null, bossPhase: [] };
