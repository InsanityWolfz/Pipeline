import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY, SPRITES } from '../data/assets';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { advanceClock, createClock } from '../sim/clock';
import type { SimState } from '../sim/state';
import { stepSim } from '../sim/step';

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  /** Set by the test hook: the real-time loop stops advancing the sim. */
  manualStepping = false;

  constructor(sim: SimState) {
    super('game');
    this.sim = sim;
  }

  preload(): void {
    this.load.atlas(ATLAS_KEY, atlasImage, atlasData);
  }

  create(): void {
    for (let y = 0; y < VIEW_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < VIEW_WIDTH; x += TILE_SIZE) {
        this.add.image(x, y, ATLAS_KEY, SPRITES.floorRune).setOrigin(0);
      }
    }
    this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, ATLAS_KEY, SPRITES.leyCrystal);
  }

  override update(_time: number, delta: number): void {
    if (this.manualStepping) return;
    const ticks = advanceClock(this.clock, delta);
    for (let i = 0; i < ticks; i++) stepSim(this.sim);
  }
}
