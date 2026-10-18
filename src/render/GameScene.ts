import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP } from '../data/config';
import { advanceClock, createClock } from '../sim/clock';
import { craft } from '../sim/crafting';
import { clearEvents, createEvents, type SimEvents } from '../sim/events';
import { cancelHarvest } from '../sim/harvest';
import type { Command } from '../sim/input';
import { roomOf, roomSize, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { ArrowView } from './ArrowView';
import { BombView } from './BombView';
import { Controls } from './controls';
import { CraftMenuView } from './CraftMenuView';
import { EffectsView } from './EffectsView';
import { EnemyView } from './EnemyView';
import { GroundItemView } from './GroundItemView';
import { HudView } from './HudView';
import { NodeView } from './NodeView';
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
  private enemyView?: EnemyView;
  private groundItemView?: GroundItemView;
  private effects?: EffectsView;
  private nodeView?: NodeView;
  private bombView?: BombView;
  private menu?: CraftMenuView;
  /** Events from every tick since the last draw; the sim clears its own each tick. */
  private readonly pending: SimEvents = createEvents();
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
    this.nodeView = new NodeView(this);
    this.groundItemView = new GroundItemView(this);
    this.enemyView = new EnemyView(this);
    this.playerView = new PlayerView(this);
    this.effects = new EffectsView(this, this.playerView.sprite);
    this.arrowView = new ArrowView(this);
    this.bombView = new BombView(this);
    this.hud = new HudView(this);
    this.menu = new CraftMenuView(this, (recipeId) => this.craft(recipeId));
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
      const toggle = this.controls.takeMenuToggle();
      const close = this.controls.takeMenuClose();
      if (toggle || (close && this.menuOpen)) this.setMenuOpen(toggle ? !this.menuOpen : false);
      if (this.menuOpen) {
        // The world is paused: no ticks run, and no time is banked to catch up on later.
        this.controls.discardPending();
      } else {
        const ticks = advanceClock(this.clock, delta);
        for (let i = 0; i < ticks; i++) this.stepOnce(this.controls.nextCommand());
      }
    }
    this.draw();
  }

  get menuOpen(): boolean {
    return this.menu?.isOpen ?? false;
  }

  /** Opening the menu cancels a harvest in progress; while it's open the sim doesn't tick. */
  setMenuOpen(open: boolean): void {
    if (open === this.menuOpen) return;
    if (open) cancelHarvest(this.sim);
    this.menu?.setOpen(open);
  }

  /** Crafts once, between ticks. The test hook crafts through here too. Crafting has no drawn effects. */
  craft(recipeId: string): void {
    craft(this.sim, recipeId);
  }

  /** Steps the sim one tick and keeps its events for the next draw. The test hook steps through here too. */
  stepOnce(cmd: Command): void {
    stepSim(this.sim, cmd);
    // Hits aren't drawn from events (flashes read sim state), so they aren't kept.
    const { deaths, pickups, bursts, ko } = this.sim.events;
    this.pending.deaths.push(...deaths);
    this.pending.pickups.push(...pickups);
    this.pending.bursts.push(...bursts);
    this.pending.ko ||= ko;
  }

  private draw(): void {
    // Before create() runs there are no views to hand events to; keep them for later.
    if (!this.effects) return;
    this.effects.play(this.pending, this.sim.player);
    clearEvents(this.pending);
    this.nodeView?.update(this.sim.nodes, this.sim.harvest);
    this.groundItemView?.update(this.sim.groundItems);
    this.enemyView?.update(this.sim.enemies);
    this.playerView?.update(this.sim.player, this.sim.tube);
    this.arrowView?.update(this.sim.arrows);
    this.bombView?.update(this.sim.bombs);
    this.hud?.update(this.sim.tube, this.sim.inventory, this.sim.player);
    this.menu?.update(this.sim.inventory);
  }
}
