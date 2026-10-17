import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP, TILE_SIZE } from '../data/config';
import { advanceClock, createClock } from '../sim/clock';
import { roomOf, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { KeyboardInput } from './keyboard';
import { PlayerView } from './PlayerView';
import { RoomView } from './RoomView';
import { otherView, type ViewMode } from './view';

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  private keyboard?: KeyboardInput;
  private roomView?: RoomView;
  private playerView?: PlayerView;
  private currentView: ViewMode;
  /** Set by the test hook: the real-time loop stops advancing the sim. */
  manualStepping = false;

  constructor(sim: SimState, view: ViewMode) {
    super('game');
    this.sim = sim;
    this.currentView = view;
  }

  get view(): ViewMode {
    return this.currentView;
  }

  preload(): void {
    this.load.atlas(ATLAS_KEY, atlasImage, atlasData);
  }

  create(): void {
    const room = roomOf(this.sim);
    this.roomView = new RoomView(this, room);
    this.roomView.build(this.currentView);
    this.playerView = new PlayerView(this, this.currentView);
    this.playerView.update(this.sim.player);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, (room.rows[0]?.length ?? 0) * TILE_SIZE, room.rows.length * TILE_SIZE);
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.keyboard = new KeyboardInput(this);
    this.input.keyboard?.on('keydown-V', () => this.setView(otherView(this.currentView)));
  }

  setView(view: ViewMode): void {
    if (view === this.currentView) return;
    this.currentView = view;
    this.roomView?.build(view);
    this.playerView?.setView(view);
    this.playerView?.update(this.sim.player);
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
