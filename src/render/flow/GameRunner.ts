import type { Game } from 'phaser';
import { SAVE_TEXT } from '../../data/save';
import { END_CARD } from '../../data/endCard';
import type { SimState } from '../../sim/state';
import { GameScene } from '../GameScene';
import type { ScreenFit } from '../scale';
import { holdsClock } from './flowTypes';
import type { GameHost } from './host';
import type { SaveStore } from './saveStore';

// The running game (042): a fresh GameScene under a fresh key for each New game or Continue, drawn under the flow
// scene and removed on Quit to title; its foundry entries save.

export class GameRunner {
  private readonly game: Game;
  private readonly saves: SaveStore;
  private readonly onTop: () => void;
  private readonly notice: (message: string) => void;
  private count = 0;
  /** The running game scene, or null on the title. */
  scene: GameScene | null = null;
  /** This run's end card has been seen (042: saved in the envelope from the next foundry entry). */
  endCardSeen = false;
  /** The tick the end card is due on, after the last boss's first kill (060: the Forgewright's), or null. */
  private endCardAt: number | null = null;

  constructor(game: Game, saves: SaveStore, onTop: () => void, notice: (message: string) => void) {
    this.game = game;
    this.saves = saves;
    this.onTop = onTop;
    this.notice = notice;
  }

  /** Starts a game on `sim`, ending any running one. */
  start(sim: SimState, host: GameHost, endCardSeen: boolean, fit: ScreenFit): void {
    this.end();
    this.endCardSeen = endCardSeen;
    this.endCardAt = null;
    const scene = new GameScene(sim, host);
    // fix-held-clock: a test that compares runs takes the clock before the first frame, not after a frame-dependent count of ticks.
    scene.manualStepping = holdsClock(window.location.search);
    this.count += 1;
    this.game.scene.add(`game-${this.count}`, scene, true);
    this.onTop();
    scene.applyFit(fit);
    this.scene = scene;
  }

  /** Discards the running game, if any. */
  end(): void {
    const old = this.scene;
    if (!old) return;
    this.scene = null;
    this.game.scene.remove(old.scene.key);
  }

  /**
   * After each tick: END_CARD.boss's first kill (060: the Forgewright's; 064: the Conductor's) sets the end card due `delayTicks` later, once per save (altar refights
   * aren't first kills). Returns whether it's due now; the caller shows it and calls `endCardShown`.
   */
  endCardDue(sim: SimState): boolean {
    // 044.5: the sandbox never shows it.
    if (sim.sandbox) return false;
    if (!this.endCardSeen && this.endCardAt === null && sim.events.bossDefeats.some((d) => d.boss === END_CARD.boss)) this.endCardAt = sim.tick + END_CARD.delayTicks;
    return this.endCardAt !== null && sim.tick >= this.endCardAt;
  }

  endCardShown(): void {
    this.endCardAt = null;
    this.endCardSeen = true;
  }

  /** After each tick: a foundry entry saves (042.2); a failed write says so and play goes on. Returns whether it saved. */
  save(sim: SimState): boolean {
    if (sim.events.foundryArrivals.length === 0) return false;
    const result = this.saves.write(sim, this.endCardSeen, new Date());
    if (result === 'failed') this.notice(SAVE_TEXT.failed);
    return result === 'saved';
  }
}
