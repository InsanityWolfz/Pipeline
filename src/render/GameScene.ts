import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP } from '../data/config';
import { advanceClock, createClock } from '../sim/clock';
import { roomOf, roomSize, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { ArrowView } from './ArrowView';
import { Controls } from './controls';
import { HudView } from './HudView';
import { PlayerView } from './PlayerView';
import { drawRoom } from './room';

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  private controls?: Controls;
  private playerView?: PlayerView;
  private arrowView?: ArrowView;
  private hud?: HudView;
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
    this.arrowView = new ArrowView(this);
    this.hud = new HudView(this);
    this.draw();

    const camera = this.cameras.main;
    const { width, height } = roomSize(room);
    camera.setBounds(0, 0, width, height);
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.controls = new Controls(this);
  }

  override update(_time: number, delta: number): void {
    if (!this.manualStepping && this.controls) {
      this.controls.poll();
      const ticks = advanceClock(this.clock, delta);
      for (let i = 0; i < ticks; i++) stepSim(this.sim, this.controls.nextCommand());
    }
    this.draw();
  }

  private draw(): void {
    this.playerView?.update(this.sim.player, this.sim.tube);
    this.arrowView?.update(this.sim.arrows);
    this.hud?.update(this.sim.tube, this.sim.inventory);
  }
}
