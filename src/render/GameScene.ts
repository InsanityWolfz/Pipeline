import { Scene } from 'phaser';
import { CAMERA_LERP } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import { SOUNDS } from '../data/sounds';
import { FOUNDRY_ROOM } from '../data/rooms';
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
import { EnemyView, NO_ENEMY_UI } from './EnemyView';
import { FoundryView } from './FoundryView';
import { GroundItemView } from './GroundItemView';
import { HopperPicker } from './HopperPicker';
import { HoverView, NO_HOVER_UI } from './HoverView';
import { HudView, NO_HUD_PANELS } from './HudView';
import { NodeView } from './NodeView';
import { bodyLook, PlayerView } from './PlayerView';
import { NO_SITE_UI, SiteMenus } from './SiteMenus';
import { SiteView } from './SiteView';
import { WakeView } from './WakeView';
import { mergeEvents } from './eventLog';
import { FeelView } from './FeelView';
import { highlightOf, NO_TUTORIAL_UI, TutorialUi } from './TutorialUi';
import { currentFit, type ScreenFit } from './scale';
import { bakeVectors } from './vector/textures';
import type { GameUiState, UiState } from './testHook';
import { NO_ROOM_UI, RoomViews } from './RoomViews';
import { fontsReady } from './fonts';
import { MENU_HOVER_EVENT } from './menuFeedback';
import { MenuRouter } from './MenuRouter';
import { PauseMenuView } from './PauseMenuView';
import { SceneCameras } from './SceneCameras';
import { CursorView } from './CursorView';
import { Legibility, NO_LEGIBILITY_UI } from './Legibility';
import { IDLE_HOST, type GameHost } from './flow/host';

const FIRST_PIECE = BUILD_BAR[0] ?? '';

const inRoom = <T extends { roomId: string }>(list: readonly T[], roomId: string): T[] =>
  list.filter((o) => o.roomId === roomId);

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  /** The sim this scene draws and drives (042: the test hook follows the live scene's). */
  readonly sim: SimState;
  /** The flow (042): whether to step, and what to tell it. */
  private readonly host: GameHost;
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
  /** 040: hover tips (Shift for the breakdown) and the glossary; the test hook measures its summaries. */
  legibility?: Legibility;
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

  constructor(sim: SimState, host: GameHost = IDLE_HOST) {
    super('game');
    this.sim = sim;
    this.host = host;
    this.shownRoomId = sim.roomId;
    // Events made before the first tick (042: Continue's wake in the foundry) play on the first draw.
    mergeEvents(this.pending, sim.events);
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
    this.legibility = new Legibility(this, [this.hud, this.siteMenus, this.buildView]);
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
    if (this.menu && this.pause && this.siteMenus && this.picker && this.buildView && this.feel && this.hud && this.wake && this.legibility)
      this.router = new MenuRouter(this.sim, { craft: this.menu, pause: this.pause, site: this.siteMenus, picker: this.picker, build: this.buildView, sound: this.feel.sound, inventory: this.hud.inventory, research: this.hud.research, talents: this.hud.talents, wake: this.wake, legibility: this.legibility, host: this.host });
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
        // Under a flow screen (042) the whole screen is that screen's: nothing reaches the world or the menus.
        overUi: (x, y) => this.host.covered || [this.pause, this.menu, this.buildView, this.picker, this.siteMenus, this.hud, this.tutorial, this.legibility].some((v) => v?.overUi(x, y)),
        clickUi: (x, y, mods) => {
          if (!this.host.covered) this.router?.click(controls, x, y, mods);
        },
      });
      this.pause?.setOpen(this.host.paused);
      if (this.host.covered) controls.drain();
      else this.router?.handle(controls);
      if (!this.host.stepping) {
        // The world is paused (Esc, or a flow screen, 042): no ticks run, and no time is banked to catch up on later.
        controls.discardPending();
      } else if (!this.manualStepping) {
        const ticks = advanceClock(this.clock, delta);
        // A tick can stop the world (042: the end card): the rest of this frame's ticks wait for play.
        for (let i = 0; i < ticks && this.host.stepping; i++) this.stepOnce(controls.nextCommand());
      }
    }
    this.draw();
  }

  /** The mouse-over text on show, for the test hook (015). */
  hoverText(): GameUiState {
    return {
      ready: this.effects !== undefined && fontsReady(),
      craftOpen: this.menu?.isOpen ?? false,
      paused: this.pause?.isOpen ?? false,
      pickerOpen: this.picker?.isOpen ?? false,
      ...(this.siteMenus?.ui ?? NO_SITE_UI),
      pickerHint: this.picker?.hintShown ?? null,
      pickerCounts: [...(this.picker?.shownCounts ?? [])],
      ...(this.hover?.ui ?? NO_HOVER_UI),
      buildTip: this.buildView?.tipShown ?? null,
      ...(this.roomViews?.state ?? NO_ROOM_UI),
      nodes: this.nodeView?.frames ?? {},
      shakes: [...(this.feel?.juice.shakes ?? [])],
      cursor: this.cursorView?.state ?? null,
      sliding: this.groundItemView?.sliding ?? 0,
      slideProgress: this.groundItemView?.slideProgress ?? 0,
      swooshes: this.effects?.swooshes ?? 0,
      ...(this.tutorial?.state ?? NO_TUTORIAL_UI),
      // 042: the camera locks to the player; its centre and the player's sprite point, before any shake.
      camera: this.cameraUi(),
      hud: this.hud?.bottom ?? null,
      ...(this.hud?.panels ?? NO_HUD_PANELS),
      craftMenu: this.menu?.state ?? null,
      buildBar: this.buildView?.state ?? null,
      tagged: { benchStages: this.siteMenus?.stagePanel ?? null, splitFlashes: this.effects?.splitFlashes ?? 0, trails: this.arrowView?.trails ?? { count: 0, longest: 0 } },
      ...(this.enemyView?.ui ?? NO_ENEMY_UI),
      ...(this.legibility?.ui ?? NO_LEGIBILITY_UI),
    };
  }

  private cameraUi(): UiState['camera'] {
    const view = this.cameras?.main?.worldView;
    const player = this.playerView?.sprite;
    return { x: view?.centerX ?? 0, y: view?.centerY ?? 0, player: { x: player?.x ?? 0, y: player?.y ?? 0 } };
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
    this.host.afterTick(this.sim);
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
    this.followRoom(this.pending.woke);
    if (!this.fading && this.playerView) this.sceneCameras?.attuneLook(sim, this.shownRoomId, this.playerView.sprite);
    this.effects.play(this.pending, sim.player);
    if (this.pending.identifies.length > 0) this.site?.identified();
    if (this.pending.woke) this.wake?.show(this.pending.lost, sim);
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
    this.groundItemView?.update(inRoom(sim.groundItems, shown), picked, sim.player, sim);
    this.enemyView?.update(inRoom(sim.enemies, shown), sim);
    // Through a door's fade the player is already in the next room; hide them until it shows.
    this.playerView?.update(sim.player, sim.tube, sim.link, bodyLook(sim), sim.hasTube, shown === sim.roomId);
    this.arrowView?.update(inRoom(sim.arrows, shown));
    this.bombView?.update(inRoom(sim.bombs, shown));
    this.site?.update(sim, shown);
    this.siteMenus?.update(sim);
    this.menu?.update(sim);
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
    if (pointer) for (const menu of [this.siteMenus, this.picker, this.pause, this.hud]) menu?.pointAt(pointer.x, pointer.y);
    // The arrow pointer while a menu is open or over the build bar, else the crosshair (021).
    const inMenu = [this.menu, this.pause, this.picker, this.siteMenus, this.hud?.inventory, this.hud?.talents, this.legibility].some((m) => m?.isOpen) || (this.wake?.isShown ?? false);
    this.cursorView?.update(inMenu || (pointer !== undefined && [this.buildView, this.legibility].some((v) => v?.overUi(pointer.x, pointer.y))));
    const point = controls?.overWorld() ? controls.cursorPoint() : null;
    this.hover?.update(sim, shown, point, (id) => this.foundryView?.topOf(id), this.cameras.main.worldView);
    this.legibility?.update(sim, this.pause?.isOpen ? null : (pointer ?? null), controls?.shiftHeld() ?? false, this.game.loop.delta);
  }
}
