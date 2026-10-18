import { Scene, Textures } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import { SOUNDS } from '../data/sounds';
import { FOUNDRY_ROOM } from '../data/rooms';
import { worn } from '../sim/armor';
import { advanceClock, createClock } from '../sim/clock';
import { craft } from '../sim/crafting';
import { clearEvents, createEvents, type SimEvents } from '../sim/events';
import { usableInReach } from '../sim/foundryUse';
import { cancelHarvest } from '../sim/harvest';
import type { Command } from '../sim/input';
import { pieceAt } from '../sim/pieces';
import { canPlace, conduitInFrom, unlockedPieces } from '../sim/placement';
import { roomById, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { ArrowView } from './ArrowView';
import { BombView } from './BombView';
import { BuildView } from './BuildView';
import { Controls, NO_UI_COMMAND, type UiCommand } from './controls';
import { ghostShape } from './dragPath';
import { CraftMenuView } from './CraftMenuView';
import { EffectsView } from './EffectsView';
import { EnemyView } from './EnemyView';
import { FoundryView } from './FoundryView';
import { GroundItemView } from './GroundItemView';
import { HopperPicker } from './HopperPicker';
import { HoverView } from './HoverView';
import { HudView } from './HudView';
import { NodeView } from './NodeView';
import { PlayerView } from './PlayerView';
import { SiteMenus } from './SiteMenus';
import { SiteView } from './SiteView';
import { WakeView } from './WakeView';
import { mergeEvents } from './eventLog';
import { FeelView } from './FeelView';
import { TutorialUi } from './TutorialUi';
import { currentFit, type ScreenFit } from './scale';
import { bakeVectors } from './vector/textures';
import type { UiState } from './testHook';
import { RoomViews } from './RoomViews';
import { SceneCameras } from './SceneCameras';

const FIRST_PIECE = BUILD_BAR[0] ?? '';

const inRoom = <T extends { roomId: string }>(list: readonly T[], roomId: string): T[] =>
  list.filter((o) => o.roomId === roomId);

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  private controls?: Controls;
  private roomViews?: RoomViews;
  private playerView?: PlayerView;
  private arrowView?: ArrowView;
  private hud?: HudView;
  private enemyView?: EnemyView;
  private groundItemView?: GroundItemView;
  private effects?: EffectsView;
  private nodeView?: NodeView;
  private bombView?: BombView;
  private foundryView?: FoundryView;
  private buildView?: BuildView;
  private hover?: HoverView;
  private picker?: HopperPicker;
  private menu?: CraftMenuView;
  private site?: SiteView;
  private siteMenus?: SiteMenus;
  private wake?: WakeView;
  private tutorial?: TutorialUi;
  private feel?: FeelView;
  /** The room on screen. It lags the player's room through a door's fade. */
  private shownRoomId: string;
  private fading = false;
  /** Events from every tick since the last draw; the sim clears its own each tick. */
  private readonly pending: SimEvents = createEvents();
  /** Set by the test hook: the real-time loop stops advancing the sim (the menu still opens and crafts). */
  manualStepping = false;
  /** The screen fit (016): cameras zoom by its scale so the same 640×360 of the world fills a full-resolution backbuffer. */
  private fit: ScreenFit = currentFit();
  private sceneCameras?: SceneCameras;

  constructor(sim: SimState) {
    super('game');
    this.sim = sim;
    this.shownRoomId = sim.roomId;
  }

  preload(): void {
    this.load.atlas(ATLAS_KEY, atlasImage, atlasData);
    FeelView.preload(this);
  }

  create(): void {
    // Pixel art stays crisp at any zoom; vector frames (016) are drawn once at the screen's scale.
    this.textures.get(ATLAS_KEY).setFilter(Textures.FilterMode.NEAREST);
    bakeVectors(this, this.fit.scale);
    this.sceneCameras = new SceneCameras(this, this.fit);
    this.roomViews = new RoomViews(this);
    this.foundryView = new FoundryView(this);
    this.nodeView = new NodeView(this);
    this.groundItemView = new GroundItemView(this);
    this.enemyView = new EnemyView(this);
    this.playerView = new PlayerView(this);
    this.effects = new EffectsView(this, this.playerView.sprite);
    this.arrowView = new ArrowView(this);
    this.bombView = new BombView(this);
    this.hud = new HudView(this);
    this.buildView = new BuildView(this);
    this.hover = new HoverView(this);
    this.picker = new HopperPicker(this);
    this.site = new SiteView(this);
    this.siteMenus = new SiteMenus(this);
    this.wake = new WakeView(this);
    this.tutorial = new TutorialUi(this);
    this.menu = new CraftMenuView(this, (recipeId) => this.craft(recipeId));
    this.feel = new FeelView(
      this,
      (id) => this.foundryView?.dropIn(id),
      (id, ms) => this.enemyView?.freeze(id, ms),
    );
    this.showRoom(this.sim.roomId);
    this.draw();

    const camera = this.cameras.main;
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.controls = new Controls(this);
  }

  /** Matches both cameras to the backbuffer (016). Called on boot and whenever the window changes. */
  applyFit(fit: ScreenFit): void {
    this.fit = fit;
    this.sceneCameras?.applyFit(fit);
  }

  override update(_time: number, delta: number): void {
    const controls = this.controls;
    if (controls) {
      controls.poll({
        building: this.sim.building,
        pieceId: () => this.buildView?.selected ?? FIRST_PIECE,
        overUi: (x, y) => [this.buildView, this.picker, this.siteMenus, this.hud, this.tutorial].some((v) => v?.overUi(x, y)),
        clickUi: (x, y) => this.clickUi(controls, x, y),
        stagerAt: (t) => {
          const piece = pieceAt(this.sim.foundry, t.tx, t.ty);
          return piece?.kind === 'stager' ? piece.id : null;
        },
      });
      this.handleUi(controls);
      if (this.menuOpen) {
        // The world is paused: no ticks run, and no time is banked to catch up on later.
        controls.discardPending();
      } else if (!this.manualStepping) {
        const ticks = advanceClock(this.clock, delta);
        for (let i = 0; i < ticks; i++) this.stepOnce(controls.nextCommand());
      }
    }
    this.draw();
  }

  /** The menu, the build bar, the picker and Esc. These work under the test hook too; only ticking is left to it. */
  private handleUi(controls: Controls): void {
    const toggle = controls.takeMenuToggle();
    const close = controls.takeMenuClose();
    if (close && this.siteMenus?.isOpen) this.siteMenus.close();
    else if (close && this.picker?.isOpen) this.picker.close();
    else if (close && this.sim.building && !this.menuOpen) controls.requestBuildToggle();
    else if (toggle || (close && this.menuOpen)) this.setMenuOpen(toggle ? !this.menuOpen : false);
    if (this.menuOpen) return;
    const steps = controls.takeWheel();
    if (steps !== 0 && this.sim.building) this.buildView?.step(steps);
    // E on a hopper opens its menu; the sim does nothing with it.
    if (controls.takeInteractPress()) {
      const target = usableInReach(this.sim);
      if (target?.kind === 'hopper') this.picker?.open(target.id);
      else this.siteMenus?.interact(this.sim);
    }
    const open = this.picker?.hopperId;
    if (open !== null && open !== undefined && usableInReach(this.sim)?.id !== open) this.picker?.close();
  }

  /** A click on the build bar picks a piece; on the hopper menu, it takes out or puts in. */
  private clickUi(controls: Controls, x: number, y: number): void {
    if (this.menuOpen) return;
    if (this.buildView?.click(x, y) || this.siteMenus?.click(controls, x, y)) {
      this.feel?.sound.play(SOUNDS.menuClick);
      return;
    }
    const entry = this.picker?.entryAt(x, y);
    const hopper = this.picker?.hopperId;
    if (!entry || hopper === null || hopper === undefined) return;
    this.feel?.sound.play(SOUNDS.menuClick);
    if (entry.action === 'take') controls.menus.withdraw(hopper);
    else controls.menus.deposit(hopper, entry.itemId);
    this.picker?.close();
  }

  /** The mouse-over text on show, for the test hook (015). */
  hoverText(): UiState {
    return {
      hoverName: this.hover?.shown ?? null,
      hoverDescription: this.hover?.shownDescription ?? null,
      buildTip: this.buildView?.tip.shown ?? null,
      minimap: this.roomViews?.map ?? { shown: false, markers: [] },
      nodes: this.nodeView?.frames ?? {},
      supply: this.roomViews?.motes ?? { started: 0, inFlight: [] },
    };
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
    const before = this.sim.events.crafts.length;
    craft(this.sim, recipeId);
    this.feel?.sound.play(this.sim.events.crafts.length > before ? SOUNDS.craft : SOUNDS.menuClick);
  }

  /** Build actions made with the mouse and keys since the last tick, for the test hook to merge into its steps. */
  takeUiCommand(): UiCommand {
    return this.controls?.takeUiCommand() ?? NO_UI_COMMAND;
  }

  /** Steps the sim one tick and keeps its events for the next draw. The test hook steps through here too. */
  stepOnce(cmd: Command): void {
    stepSim(this.sim, cmd);
    mergeEvents(this.pending, this.sim.events);
  }

  /** Draws a room's ground and fits the camera to it. */
  private showRoom(roomId: string): void {
    this.shownRoomId = roomId;
    this.roomViews?.show(roomById(roomId));
  }

  /**
   * Keeps the room on screen in step with the player's. Through a door it fades
   * out, swaps the room at dark and fades back in. A KO has its own fade, so the
   * room swaps straight away.
   */
  private followRoom(ko: boolean): void {
    if (this.fading || this.shownRoomId === this.sim.roomId) return;
    const camera = this.cameras.main;
    if (ko) {
      this.showRoom(this.sim.roomId);
      return;
    }
    this.fading = true;
    this.sceneCameras?.fadeThrough(() => {
      this.showRoom(this.sim.roomId);
      camera.centerOn(this.sim.player.x, this.sim.player.y);
      this.fading = false;
    });
  }

  private draw(): void {
    // Before create() runs there are no views to hand events to; keep them for later.
    if (!this.effects) return;
    const sim = this.sim;
    this.followRoom(this.pending.ko);
    this.effects.play(this.pending, sim.player);
    if (this.pending.identifies.length > 0) this.site?.identified();
    if (this.pending.ko) this.wake?.show(this.pending.lost);
    const shown = this.shownRoomId;
    this.feel?.update(sim, this.pending, shown, this.game.loop.delta);
    this.roomViews?.update(sim, this.pending, shown, this.game.loop.delta);
    clearEvents(this.pending);
    const inFoundry = shown === FOUNDRY_ROOM;
    this.foundryView?.update(sim.foundry, inFoundry, sim.building);
    this.nodeView?.update(inRoom(sim.nodes, shown), sim.harvest, this.game.loop.delta);
    this.groundItemView?.update(inRoom(sim.groundItems, shown));
    this.enemyView?.update(inRoom(sim.enemies, shown));
    // Through a door's fade the player is already in the next room; hide them until it shows.
    this.playerView?.update(sim.player, sim.tube, sim.link, worn(sim)?.weight ?? null, sim.hasTube, shown === sim.roomId);
    this.arrowView?.update(inRoom(sim.arrows, shown));
    this.bombView?.update(inRoom(sim.bombs, shown));
    this.site?.update(sim, shown);
    this.siteMenus?.update(sim);
    this.tutorial?.update(sim, shown);
    this.hud?.update(sim.tube, sim.inventory, sim.player, sim.link, worn(sim), sim.hasTube);
    this.menu?.update(sim.inventory, sim.link);
    const hopper = sim.foundry.pieces.find((p) => p.id === this.picker?.hopperId);
    this.picker?.update(sim.inventory, hopper?.kind === 'hopper' ? hopper : undefined);
    const controls = this.controls;
    const cursor = controls && inFoundry && controls.overWorld() ? controls.cursorTile() : null;
    this.buildView?.update(
      sim.building,
      unlockedPieces(sim),
      cursor,
      controls?.facing ?? 'right',
      controls?.mirrored ?? false,
      (...a) => canPlace(sim, ...a),
      (t, f) => ghostShape(controls?.heldLay() ?? null, t, f, (u, g) => conduitInFrom(sim, u.tx, u.ty, g)),
    );
    const point = controls?.overWorld() ? controls.cursorPoint() : null;
    this.hover?.update(sim, shown, point, (id) => this.foundryView?.topOf(id), this.cameras.main.worldView.y);
  }
}
