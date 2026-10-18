import { Scene } from 'phaser';
import atlasImage from '../../assets/build/sprites.png?url';
import atlasData from '../../assets/build/sprites.json?url';
import { ATLAS_KEY } from '../data/assets';
import { CAMERA_LERP, DOOR_FADE_MS } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import { FOUNDRY_ROOM } from '../data/rooms';
import { advanceClock, createClock } from '../sim/clock';
import { craft } from '../sim/crafting';
import { clearEvents, createEvents, type SimEvents } from '../sim/events';
import { usableInReach } from '../sim/foundryUse';
import { cancelHarvest } from '../sim/harvest';
import type { Command } from '../sim/input';
import { pieceAt, pieceRect } from '../sim/pieces';
import { canPlace, unlockedPieces } from '../sim/placement';
import { roomById, roomSize, type SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { ArrowView } from './ArrowView';
import { BombView } from './BombView';
import { BuildView } from './BuildView';
import { Controls, type UiCommand } from './controls';
import { CraftMenuView } from './CraftMenuView';
import { EffectsView } from './EffectsView';
import { EnemyView } from './EnemyView';
import { FoundryView } from './FoundryView';
import { GroundItemView } from './GroundItemView';
import { HopperPicker } from './HopperPicker';
import { HoverReadout, machineLines, socketLines, stagerLines } from './HoverReadout';
import { HudView } from './HudView';
import { NodeView } from './NodeView';
import { PlayerView } from './PlayerView';
import { RoomView } from './room';
import { SiteMenus } from './SiteMenus';
import { SiteView } from './SiteView';

const FIRST_PIECE = BUILD_BAR[0] ?? '';

const inRoom = <T extends { roomId: string }>(list: readonly T[], roomId: string): T[] =>
  list.filter((o) => o.roomId === roomId);

// Draws the sim and drives it in real time. Holds no game rules.
export class GameScene extends Scene {
  private readonly sim: SimState;
  private readonly clock = createClock();
  private controls?: Controls;
  private roomView?: RoomView;
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
  private readout?: HoverReadout;
  private picker?: HopperPicker;
  private menu?: CraftMenuView;
  private site?: SiteView;
  private siteMenus?: SiteMenus;
  /** The room on screen. It lags the player's room through a door's fade. */
  private shownRoomId: string;
  private fading = false;
  /** Events from every tick since the last draw; the sim clears its own each tick. */
  private readonly pending: SimEvents = createEvents();
  /** Set by the test hook: the real-time loop stops advancing the sim (the menu still opens and crafts). */
  manualStepping = false;

  constructor(sim: SimState) {
    super('game');
    this.sim = sim;
    this.shownRoomId = sim.roomId;
  }

  preload(): void {
    this.load.atlas(ATLAS_KEY, atlasImage, atlasData);
  }

  create(): void {
    this.roomView = new RoomView(this);
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
    this.readout = new HoverReadout(this);
    this.picker = new HopperPicker(this);
    this.site = new SiteView(this);
    this.siteMenus = new SiteMenus(this);
    this.menu = new CraftMenuView(this, (recipeId) => this.craft(recipeId));
    this.showRoom(this.sim.roomId);
    this.draw();

    const camera = this.cameras.main;
    camera.setRoundPixels(true);
    // Start centred on the player so the first frame doesn't visibly snap.
    camera.centerOn(this.sim.player.x, this.sim.player.y);
    camera.startFollow(this.playerView.sprite, true, CAMERA_LERP, CAMERA_LERP);

    this.controls = new Controls(this);
  }

  override update(_time: number, delta: number): void {
    const controls = this.controls;
    if (controls) {
      controls.poll({
        building: this.sim.building,
        pieceId: () => this.buildView?.selected ?? FIRST_PIECE,
        overUi: (x, y) =>
          (this.buildView?.overUi(x, y) ?? false) || (this.picker?.overUi(x, y) ?? false) || (this.siteMenus?.overUi(x, y) ?? false),
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
    if (this.menuOpen || this.buildView?.click(x, y) || this.siteMenus?.click(controls, x, y)) return;
    const entry = this.picker?.entryAt(x, y);
    const hopper = this.picker?.hopperId;
    if (!entry || hopper === null || hopper === undefined) return;
    if (entry.action === 'take') controls.requestWithdraw(hopper);
    else controls.requestDeposit(hopper, entry.itemId);
    this.picker?.close();
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

  /** Build actions made with the mouse and keys since the last tick, for the test hook to merge into its steps. */
  takeUiCommand(): UiCommand {
    return (
      this.controls?.takeUiCommand() ?? {
        toggleBuild: false,
        place: null,
        pickUp: null,
        deposit: null,
        withdraw: null,
        setAngle: null,
        pylon: null,
        takeStash: null,
      }
    );
  }

  /** Steps the sim one tick and keeps its events for the next draw. The test hook steps through here too. */
  stepOnce(cmd: Command): void {
    stepSim(this.sim, cmd);
    // Hits aren't drawn from events (flashes read sim state), so they aren't kept.
    const { deaths, pickups, bursts, shots, stashDeposits, ko } = this.sim.events;
    this.pending.deaths.push(...deaths);
    this.pending.pickups.push(...pickups);
    this.pending.bursts.push(...bursts);
    this.pending.shots.push(...shots);
    this.pending.stashDeposits.push(...stashDeposits);
    this.pending.ko ||= ko;
  }

  /** Draws a room's tiles and fits the camera to it. */
  private showRoom(roomId: string): void {
    const room = roomById(roomId);
    this.shownRoomId = roomId;
    this.roomView?.show(room);
    const { width, height } = roomSize(room);
    this.cameras.main.setBounds(0, 0, width, height);
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
    camera.fadeOut(DOOR_FADE_MS, 0, 0, 0, (_cam: unknown, progress: number) => {
      if (progress < 1) return;
      this.showRoom(this.sim.roomId);
      camera.centerOn(this.sim.player.x, this.sim.player.y);
      camera.fadeIn(DOOR_FADE_MS, 0, 0, 0);
      this.fading = false;
    });
  }

  private draw(): void {
    // Before create() runs there are no views to hand events to; keep them for later.
    if (!this.effects) return;
    const sim = this.sim;
    this.followRoom(this.pending.ko);
    this.effects.play(this.pending, sim.player);
    clearEvents(this.pending);
    const shown = this.shownRoomId;
    const inFoundry = shown === FOUNDRY_ROOM;
    this.foundryView?.update(sim.foundry, inFoundry, sim.building);
    this.nodeView?.update(inRoom(sim.nodes, shown), sim.harvest);
    this.groundItemView?.update(inRoom(sim.groundItems, shown));
    this.enemyView?.update(inRoom(sim.enemies, shown));
    // Through a door's fade the player is already in the next room; hide them until it shows.
    this.playerView?.update(sim.player, sim.tube, sim.link, shown === sim.roomId);
    this.arrowView?.update(inRoom(sim.arrows, shown));
    this.bombView?.update(inRoom(sim.bombs, shown));
    this.site?.update(sim, shown);
    this.siteMenus?.update(sim);
    this.hud?.update(sim.tube, sim.inventory, sim.player, sim.link);
    this.menu?.update(sim.inventory);
    const hopper = sim.foundry.pieces.find((p) => p.id === this.picker?.hopperId);
    this.picker?.update(sim.inventory, hopper?.kind === 'hopper' ? hopper : undefined);
    const controls = this.controls;
    const cursor = controls && inFoundry && controls.overWorld() ? controls.cursorTile() : null;
    this.buildView?.update(sim.building, unlockedPieces(sim), cursor, controls?.facing ?? 'right', (...a) =>
      canPlace(sim, ...a),
    );
    const hovered = cursor ? pieceAt(sim.foundry, cursor.tx, cursor.ty) : undefined;
    const lines =
      hovered?.kind === 'machine'
        ? machineLines(hovered)
        : hovered?.kind === 'socket'
          ? socketLines(sim.link.reservoir)
          : hovered?.kind === 'stager'
            ? stagerLines(hovered.angle)
            : [];
    if (hovered && lines.length > 0) {
      const r = pieceRect(hovered);
      const top = this.foundryView?.topOf(hovered.id) ?? r.y;
      this.readout?.show(lines, r.x, top, this.cameras.main.worldView.y);
    } else this.readout?.show([], 0, 0);
  }
}
