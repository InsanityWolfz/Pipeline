import { Scene } from 'phaser';
import { CAMERA_LERP } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import { SOUNDS } from '../data/sounds';
import { FOUNDRY_ROOM } from '../data/rooms';
import { advanceClock, createClock } from '../sim/clock';
import { craft } from '../sim/crafting';
import { clearEvents, createEvents, type SimEvents } from '../sim/events';
import type { Command } from '../sim/input';
import { roomById, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { ArrowView } from './ArrowView';
import { BombView } from './BombView';
import { BuildView } from './BuildView';
import { Controls, NO_UI_COMMAND, type UiCommand } from './controls';
import { CraftMenuView } from './CraftMenuView';
import { EffectsView } from './EffectsView';
import { EnemyView } from './EnemyView';
import { FoundryView } from './FoundryView';
import { GroundItemView } from './GroundItemView';
import { HoverView } from './HoverView';
import { HudView } from './HudView';
import { NodeView } from './NodeView';
import { bodyLook, PlayerView } from './PlayerView';
import { SiteMenus } from './SiteMenus';
import { SiteView } from './SiteView';
import { WakeView } from './WakeView';
import { mergeEvents } from './eventLog';
import { FeelView } from './FeelView';
import { TutorialUi } from './TutorialUi';
import { currentFit, type ScreenFit } from './scale';
import { bakeVectors } from './vector/textures';
import type { GameUiState } from './testHook';
import { gameUi } from './gameUi';
import { RoomViews } from './RoomViews';
import { MENU_HOVER_EVENT } from './menuFeedback';
import { MenuRouter } from './MenuRouter';
import { PauseMenuView } from './PauseMenuView';
import { SceneCameras } from './SceneCameras';
import { CursorView } from './CursorView';
import { Legibility } from './Legibility';
import { IDLE_HOST, type GameHost } from './flow/host';
import { SandboxPanel } from './SandboxPanel';
import { bossLookTarget } from './bossLook';
import { TunnelView } from './TunnelView';
import { drawPointerUi } from './pointerUi';
import { RoomFollow } from './roomFollow';
import { BlueprintUi } from './BlueprintUi';

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
  roomViews?: RoomViews;
  playerView?: PlayerView;
  arrowView?: ArrowView;
  hud?: HudView;
  enemyView?: EnemyView;
  groundItemView?: GroundItemView;
  effects?: EffectsView;
  nodeView?: NodeView;
  private bombView?: BombView;
  private foundryView?: FoundryView;
  buildView?: BuildView;
  /** 063: the Tools group, the area box and its menu. */
  blueprintUi?: BlueprintUi;
  /** 052: the underground pair's tunnels and reach on the floor. */
  tunnelView?: TunnelView;
  hover?: HoverView;
  menu?: CraftMenuView;
  pause?: PauseMenuView;
  private router?: MenuRouter;
  private site?: SiteView;
  siteMenus?: SiteMenus;
  private wake?: WakeView;
  tutorial?: TutorialUi;
  feel?: FeelView;
  cursorView?: CursorView;
  /** 040: hover tips (Shift for the breakdown) and the glossary; the test hook measures its summaries. */
  legibility?: Legibility;
  /** 044: the Sandbox panel (056, 057: the sandbox's controls, pop-outs there, and only there). */
  sandboxPanel?: SandboxPanel;
  /** The room on screen. It lags the player's room through a door's fade (roomFollow.ts). */
  private readonly room: RoomFollow;
  /** Events from every tick since the last draw; the sim clears its own each tick. */
  private readonly pending: SimEvents = createEvents();
  /** Set by the test hook: the real-time loop stops advancing the sim (the menu still opens and crafts). */
  manualStepping = false;
  /** The page's `data-game` is set (fix-playtest-ui). */
  private marked = false;
  /** The sim tick the last drawn frame showed, or -1 before the first (for ui().drawnTick: tests wait on it, not on time). */
  drawnTick = -1;
  /** The screen fit (016): cameras zoom by its scale so the same 640×360 of the world fills a full-resolution backbuffer. */
  private fit: ScreenFit = currentFit();
  private sceneCameras?: SceneCameras;

  constructor(sim: SimState, host: GameHost = IDLE_HOST) {
    super('game');
    this.sim = sim;
    this.host = host;
    this.room = new RoomFollow(sim.roomId, {
      playerRoom: () => this.sim.roomId,
      show: (roomId) => this.roomViews?.show(roomById(roomId)),
      fadeThrough: (atDark) => this.sceneCameras?.fadeThrough(atDark),
      centreOnPlayer: () => this.cameras.main.centerOn(this.sim.player.x, this.sim.player.y),
    });
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
    this.effects = new EffectsView(this, this.playerView.sprite, (atDark, ms, rgb) => this.sceneCameras?.fadeThrough(atDark, ms, rgb));
    this.arrowView = new ArrowView(this);
    this.bombView = new BombView(this);
    this.hud = new HudView(this);
    this.buildView = new BuildView(this);
    this.blueprintUi = new BlueprintUi(this);
    this.tunnelView = new TunnelView(this);
    this.hover = new HoverView(this);
    this.site = new SiteView(this);
    this.siteMenus = new SiteMenus(this);
    this.wake = new WakeView(this);
    this.tutorial = new TutorialUi(this);
    this.menu = new CraftMenuView(this, (recipeId) => this.craft(recipeId));
    this.pause = new PauseMenuView(this);
    this.sandboxPanel = new SandboxPanel(this);
    this.legibility = new Legibility(this, [this.hud, this.siteMenus, this.buildView]);
    this.cursorView = new CursorView(this);
    this.feel = new FeelView(this, (id) => this.foundryView?.dropIn(id), (id, ms) => this.enemyView?.freeze(id, ms));
    this.room.show(this.sim.roomId);
    this.draw();

    const camera = this.cameras.main;
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.controls = new Controls(this, this.sim.sandbox !== undefined);
    if (this.menu && this.pause && this.siteMenus && this.buildView && this.feel && this.hud && this.wake && this.legibility && this.sandboxPanel && this.blueprintUi)
      this.router = new MenuRouter(this.sim, { blueprints: this.blueprintUi, craft: this.menu, pause: this.pause, site: this.siteMenus, carriedSlotAt: (x, y) => this.hud?.carriedSlotAt(x, y) ?? null, build: this.buildView, sound: this.feel.sound, inventory: this.hud.inventory, research: this.hud.research, talents: this.hud.talents, wake: this.wake, legibility: this.legibility, host: this.host, sandbox: this.sandboxPanel });
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
        overUi: (x, y) => this.host.covered || [this.pause, this.menu, this.buildView, this.blueprintUi, this.siteMenus, this.hud, this.tutorial, this.legibility, this.sandboxPanel].some((v) => v?.overUi(x, y)),
        clickUi: (x, y, mods) => void (this.host.covered || this.router?.click(controls, x, y, mods)),
        releaseUi: (x, y) => void (this.host.covered || this.router?.release(controls, x, y)),
      });
      this.pause?.setOpen(this.host.paused);
      if (this.host.covered) {
        controls.drain();
        // 056.10: under a flow screen the sandbox's controls step aside; the router brings them back after.
        this.sandboxPanel?.setCovered(true);
      } else this.router?.handle(controls);
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
    // fix-playtest-ui: once a frame has drawn, the page says which game runs, for the production build's smoke test (tests/prod).
    if (!this.marked) {
      this.marked = true;
      document.getElementById('game')?.setAttribute('data-game', this.sim.sandbox ? 'sandbox' : 'play');
    }
  }

  /** What the render shows, for the test hook (015; gameUi.ts). */
  hoverText(): GameUiState {
    return gameUi(this);
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
    // fix-build-inventory-respawn: a move key held through the death doesn't carry the player out of the foundry.
    if (this.sim.events.woke) this.controls?.holdMoveThroughWake();
    mergeEvents(this.pending, this.sim.events);
    this.host.afterTick(this.sim);
  }

  private draw(): void {
    // Before create() runs there are no views to hand events to; keep them for later.
    if (!this.effects) return;
    const sim = this.sim;
    this.room.follow(this.pending.woke);
    if (!this.room.fading && this.playerView) this.sceneCameras?.attuneLook(sim, this.room.shownRoomId, this.playerView.sprite);
    this.sceneCameras?.bossLook(bossLookTarget(sim), this.game.loop.delta);
    this.effects.play(this.pending, sim.player);
    if (this.pending.identifies.length > 0) this.site?.identified();
    if (this.pending.woke) this.wake?.show(this.pending.lost, sim);
    const shown = this.room.shownRoomId;
    this.feel?.update(sim, this.pending, shown, this.game.loop.delta);
    this.roomViews?.update(sim, this.pending, shown, this.game.loop.delta);
    // 051: the fixed HUD boxes the waypoint arrow keeps clear of.
    const mapBox = this.roomViews?.mapBox;
    const hudBoxes = [...(this.hud?.fixedBoxes ?? []), ...(mapBox ? [mapBox] : [])];
    this.tutorial?.update(sim, shown, this.pending, this.game.loop.delta * this.tweens.timeScale, (id) => this.foundryView?.topOf(id), hudBoxes);
    const picked = new Set(this.pending.pickups.map((p) => p.id));
    // 057: the sandbox's panels slide first, so the pickup feed beside the Loadout tab follows it this frame.
    this.sandboxPanel?.update(sim, this.game.loop.delta);
    this.hud?.update(sim, this.pending, this.game.loop.delta, this.sandboxPanel?.loadoutOut ?? 0);
    // 063: a stamp's pieces don't switch the bar's tunnel end.
    if (this.pending.stamps.length === 0) this.buildView?.placed(this.pending.places.map((p) => p.pieceId));
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
    const topOf = (id: number) => this.foundryView?.topOf(id);
    drawPointerUi(this, sim, { controls: this.controls, topOf, wakeShown: () => this.wake?.isShown ?? false, shown, inFoundry });
    this.drawnTick = sim.tick;
  }
}
