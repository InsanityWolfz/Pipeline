import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP } from '../data/config';
import { advanceClock, createClock } from '../sim/clock';
import { roomOf, roomSize, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { KeyboardInput } from './keyboard';
import { PlayerView } from './PlayerView';
import { drawRoom } from './room';

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  private keyboard?: KeyboardInput;
  private playerView?: PlayerView;
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
    const room = roomOf(this.sim);
    drawRoom(this, room);
    this.playerView = new PlayerView(this);
    this.playerView.update(this.sim.player);

    const camera = this.cameras.main;
    const { width, height } = roomSize(room);
    camera.setBounds(0, 0, width, height);
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.keyboard = new KeyboardInput(this);
  }

  override update(_time: number, delta: number): void {
    if (!this.manualStepping && this.keyboard) {
      this.keyboard.poll();
      const ticks = advanceClock(this.clock, delta);
      for (let i = 0; i < ticks; i++) stepSim(this.sim, this.keyboard.nextCommand());
    }
    this.playerView?.update(this.sim.player);
  }
}
