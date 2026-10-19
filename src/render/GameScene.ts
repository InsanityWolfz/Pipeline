import { Scene } from 'phaser';
import { CAMERA_LERP } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import { SOUNDS } from '../data/sounds';
import { FOUNDRY_ROOM } from '../data/rooms';
import { worn } from '../sim/armor';
import { advanceClock, createClock } from '../sim/clock';
import { craft } from '../sim/crafting';
import { clearEvents, createEvents, type SimEvents } from '../sim/events';
import type { Command } from '../sim/input';
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
import { HudView, NO_HUD_PANELS } from './HudView';
import { NodeView } from './NodeView';
import { PlayerView } from './PlayerView';
import { SiteMenus } from './SiteMenus';
import { SiteView } from './SiteView';
import { WakeView } from './WakeView';
import { mergeEvents } from './eventLog';
import { FeelView } from './FeelView';
import { highlightOf, NO_TUTORIAL_UI, TutorialUi } from './TutorialUi';
import { currentFit, type ScreenFit } from './scale';
import { bakeVectors } from './vector/textures';
import type { UiState } from './testHook';
import { NO_ROOM_UI, RoomViews } from './RoomViews';
import { fontsReady } from './fonts';
import { MENU_HOVER_EVENT } from './menuFeedback';
import { MenuRouter } from './MenuRouter';
import { PauseMenuView } from './PauseMenuView';
import { SceneCameras } from './SceneCameras';
import { CursorView } from './CursorView';

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
  private pause?: PauseMenuView;
  private router?: MenuRouter;
  private site?: SiteView;
  private siteMenus?: SiteMenus;
  private wake?: WakeView;
  private tutorial?: TutorialUi;
  private feel?: FeelView;
  private cursorView?: CursorView;
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
    FeelView.preload(this);
  }

  create(): void {
    // Every sprite is vector (016, 020): drawn once at the screen's scale.
    bakeVectors(this, this.fit.scale);
    this.sceneCameras = new SceneCameras(this, this.fit);
    this.events.on(MENU_HOVER_EVENT, () => this.feel?.sound.play(SOUNDS.menuHover));
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
    this.pause = new PauseMenuView(this);
    this.cursorView = new CursorView(this);
    this.feel = new FeelView(this, (id) => this.foundryView?.dropIn(id), (id, ms) => this.enemyView?.freeze(id, ms));
    this.showRoom(this.sim.roomId);
    this.draw();

    const camera = this.cameras.main;
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.controls = new Controls(this);
    if (this.menu && this.pause && this.siteMenus && this.picker && this.buildView && this.feel && this.hud && this.wake)
      this.router = new MenuRouter(this.sim, { craft: this.menu, pause: this.pause, site: this.siteMenus, picker: this.picker, build: this.buildView, sound: this.feel.sound, inventory: this.hud.inventory, wake: this.wake });
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
        overUi: (x, y) => [this.pause, this.menu, this.buildView, this.picker, this.siteMenus, this.hud, this.tutorial].some((v) => v?.overUi(x, y)),
        clickUi: (x, y, mods) => this.router?.click(controls, x, y, mods),
      });
      this.router?.handle(controls);
      if (this.pause?.isOpen) {
        // The world is paused (Esc): no ticks run, and no time is banked to catch up on later.
        controls.discardPending();
      } else if (!this.manualStepping) {
        const ticks = advanceClock(this.clock, delta);
        for (let i = 0; i < ticks; i++) this.stepOnce(controls.nextCommand());
      }
    }
    this.draw();
  }

  /** The mouse-over text on show, for the test hook (015). */
  hoverText(): UiState {
    return {
      ready: this.effects !== undefined && fontsReady(),
      craftOpen: this.menu?.isOpen ?? false,
      paused: this.pause?.isOpen ?? false,
      pickerOpen: this.picker?.isOpen ?? false,
      siteOpen: this.siteMenus?.isOpen ?? false,
      pickerHint: this.picker?.hintShown ?? null,
      pickerCounts: [...(this.picker?.shownCounts ?? [])],
      hoverName: this.hover?.shown ?? null,
      hoverDescription: this.hover?.shownDescription ?? null,
      buildTip: this.buildView?.tip.shown ?? null,
      ...(this.roomViews?.state ?? NO_ROOM_UI),
      nodes: this.nodeView?.frames ?? {},
      shakes: [...(this.feel?.juice.shakes ?? [])],
      cursor: this.cursorView?.state ?? null,
      sliding: this.groundItemView?.sliding ?? 0,
      slideProgress: this.groundItemView?.slideProgress ?? 0,
      swooshes: this.effects?.swooshes ?? 0,
      ...(this.tutorial?.state ?? NO_TUTORIAL_UI),
      camera: { x: this.cameras.main.worldView.centerX, y: this.cameras.main.worldView.centerY },
      hud: this.hud?.bottom ?? null,
      ...(this.hud?.panels ?? NO_HUD_PANELS),
      craftMenu: this.menu?.state ?? null,
      buildBar: this.buildView?.state ?? null,
      tagged: { benchStages: this.siteMenus?.stagePanel ?? null, starFlashes: this.effects?.starFlashes ?? 0, trails: this.arrowView?.trails ?? { count: 0, longest: 0 } },
      champions: this.enemyView?.champions ?? [], waystone: this.siteMenus?.waystoneRows ?? null,
    };
  }

  /** The sound settings, for the test hook. */
  soundSettings(): { muted: boolean; volume: number } {
    const sound = this.feel?.sound;
    return { muted: sound?.muted ?? false, volume: sound?.volume ?? 0 };
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
    if (!this.fading && this.playerView) this.sceneCameras?.attuneLook(sim, this.shownRoomId, this.playerView.sprite);
    this.effects.play(this.pending, sim.player);
    if (this.pending.identifies.length > 0) this.site?.identified();
    if (this.pending.ko) this.wake?.show(this.pending.lost);
    const shown = this.shownRoomId;
    this.feel?.update(sim, this.pending, shown, this.game.loop.delta);
    this.roomViews?.update(sim, this.pending, shown, this.game.loop.delta);
    this.tutorial?.update(sim, shown, this.pending, (id) => this.foundryView?.topOf(id));
    const picked = new Set(this.pending.pickups.map((p) => p.id));
    this.hud?.update(sim, this.pending, this.game.loop.delta);
    clearEvents(this.pending);
    const inFoundry = shown === FOUNDRY_ROOM;
    this.foundryView?.update(sim.foundry, inFoundry, sim.building);
    this.nodeView?.update(inRoom(sim.nodes, shown), sim.harvest, this.game.loop.delta);
    this.groundItemView?.update(inRoom(sim.groundItems, shown), picked, sim.player);
    this.enemyView?.update(inRoom(sim.enemies, shown));
    // Through a door's fade the player is already in the next room; hide them until it shows.
    this.playerView?.update(sim.player, sim.tube, sim.link, worn(sim)?.weight ?? null, sim.hasTube, shown === sim.roomId);
    this.arrowView?.update(inRoom(sim.arrows, shown));
    this.bombView?.update(inRoom(sim.bombs, shown));
    this.site?.update(sim, shown);
    this.siteMenus?.update(sim);
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
      highlightOf(sim),
    );
    // Menu rows light under the cursor (020).
    const pointer = controls?.viewPointer();
    if (pointer) for (const menu of [this.siteMenus, this.picker, this.pause]) menu?.pointAt(pointer.x, pointer.y);
    // The arrow pointer while a menu is open or over the build bar, else the crosshair (021).
    const inMenu = [this.menu, this.pause, this.picker, this.siteMenus, this.hud?.inventory].some((m) => m?.isOpen) || (this.wake?.isShown ?? false);
    this.cursorView?.update(inMenu || (pointer !== undefined && (this.buildView?.overUi(pointer.x, pointer.y) ?? false)));
    if (this.feel) this.pause?.update(this.feel.sound);
    const point = controls?.overWorld() ? controls.cursorPoint() : null;
    this.hover?.update(sim, shown, point, (id) => this.foundryView?.topOf(id), this.cameras.main.worldView);
  }
}
