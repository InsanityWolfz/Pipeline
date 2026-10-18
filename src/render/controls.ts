import type { Cameras, Scene } from 'phaser';
import { Input } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { SLOT_AMMOS } from '../data/tube';
import { rotateCw } from '../sim/direction';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';
import { BUILD_BAR, pieceDef } from '../data/pieces';
import { tilesBetween, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';

type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'rotate' | 'interact' | 'menu' | 'close' | 'build';

/** Number keys pick the slot's ammo in SLOT_AMMOS order: 1 for the first, and so on. */
const NUMBER_KEYS = [
  Input.Keyboard.KeyCodes.ONE,
  Input.Keyboard.KeyCodes.TWO,
  Input.Keyboard.KeyCodes.THREE,
  Input.Keyboard.KeyCodes.FOUR,
];
if (SLOT_AMMOS.length > NUMBER_KEYS.length) throw new Error(`Only ${NUMBER_KEYS.length} ammo keys for ${SLOT_AMMOS.length} slot ammo`);
const AMMO_KEYS = NUMBER_KEYS.slice(0, SLOT_AMMOS.length);

/** What the scene tells the controls each frame about build mode and the screen's UI. */
export interface BuildInput {
  building: boolean;
  /** The piece selected on the build bar, read at click time (a bar click can land in the same frame). */
  pieceId: () => string;
  /** True over the build bar or the hopper picker, where clicks don't reach the world. */
  overUi: (x: number, y: number) => boolean;
  /** Handles a left click on that UI at once, so a world click in the same frame sees its result. */
  clickUi: (x: number, y: number) => void;
  /** The id of the gravity stager on a tile, if any: a left click there turns it rather than placing. */
  stagerAt: (tile: Tile) => number | null;
}

type BuildAction = Pick<Command, 'place' | 'pickUp' | 'setAngle'>;

/** The commands that come from build mode and the hopper menu rather than held keys. */
export type UiCommand = Pick<Command, 'toggleBuild' | 'place' | 'pickUp' | 'deposit' | 'withdraw' | 'setAngle'>;

// Turns WASD, Space, R, E, B, 1–3 and the mouse into sim commands, and C and Esc
// into menu toggles for the scene. Presses are latched from the keys' down
// events until consumed, so a tap shorter than a frame isn't lost, a press on a
// frame that runs no ticks isn't lost, and a frame that runs several ticks only
// acts on the first. In build mode, R turns the ghost (it does nothing outside it),
// clicks place and pick up pieces or turn a stager (queued, one per tick), and
// dragging lays conduits.
export class Controls {
  private readonly keys: Record<Key, Input.Keyboard.Key>;
  private readonly ammoKeys: Input.Keyboard.Key[];
  private readonly pointer: Input.Pointer;
  private readonly camera: Cameras.Scene2D.Camera;
  private dodgePending = false;
  private interactPending = false;
  private interactPress = false;
  private selectPending: string | null = null;
  private menuPending = false;
  private closePending = false;
  private buildPending = false;
  private wheelPending = 0;
  private depositPending: Command['deposit'] = null;
  private withdrawPending: Command['withdraw'] = null;
  private readonly queue: BuildAction[] = [];
  private dragTile: Tile | null = null;
  private build: BuildInput = {
    building: false,
    pieceId: () => BUILD_BAR[0] ?? '',
    overUi: () => false,
    clickUi: () => undefined,
    stagerAt: () => null,
  };
  private aimX = 0;
  private aimY = 0;
  /** The ghost's facing, sent with every place. */
  facing: Facing = 'right';

  constructor(scene: Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    const codes = Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(codes.W),
      down: keyboard.addKey(codes.S),
      left: keyboard.addKey(codes.A),
      right: keyboard.addKey(codes.D),
      dodge: keyboard.addKey(codes.SPACE),
      rotate: keyboard.addKey(codes.R),
      interact: keyboard.addKey(codes.E),
      menu: keyboard.addKey(codes.C),
      close: keyboard.addKey(codes.ESC),
      build: keyboard.addKey(codes.B),
    };
    this.ammoKeys = AMMO_KEYS.map((code) => keyboard.addKey(code));
    this.keys.dodge.on('down', () => (this.dodgePending = true));
    this.keys.rotate.on('down', () => {
      if (this.build.building) this.facing = rotateCw(this.facing);
    });
    this.keys.interact.on('down', () => {
      this.interactPending = true;
      this.interactPress = true;
    });
    this.keys.menu.on('down', () => (this.menuPending = true));
    this.keys.close.on('down', () => (this.closePending = true));
    this.keys.build.on('down', () => (this.buildPending = true));
    for (const [i, key] of this.ammoKeys.entries()) key.on('down', () => (this.selectPending = SLOT_AMMOS[i] ?? null));
    this.pointer = scene.input.activePointer;
    this.camera = scene.cameras.main;
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Input.Pointer) => this.pointerDown(p));
    scene.input.on('pointermove', (p: Input.Pointer) => this.pointerMove(p));
    scene.input.on('pointerup', () => (this.dragTile = null));
    scene.input.on('wheel', (_p: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.wheelPending += Math.sign(dy);
    });
  }

  /** Call once per frame before taking commands. */
  poll(build: BuildInput): void {
    this.build = build;
    if (!build.building) this.dragTile = null;
    // The camera moves every frame, so the cursor's world point does too.
    const world = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    this.aimX = world.x;
    this.aimY = world.y;
  }

  /** The world tile under the cursor. */
  cursorTile(): Tile {
    return { tx: Math.floor(this.aimX / TILE_SIZE), ty: Math.floor(this.aimY / TILE_SIZE) };
  }

  /** The cursor is over the world, not the screen's UI. */
  overWorld(): boolean {
    return !this.build.overUi(this.pointer.x, this.pointer.y);
  }

  private tileUnder(p: Input.Pointer): Tile {
    const world = this.camera.getWorldPoint(p.x, p.y);
    return { tx: Math.floor(world.x / TILE_SIZE), ty: Math.floor(world.y / TILE_SIZE) };
  }

  private pointerDown(p: Input.Pointer): void {
    if (this.build.overUi(p.x, p.y)) {
      if (p.leftButtonDown()) this.build.clickUi(p.x, p.y);
      return;
    }
    if (!this.build.building) return;
    const tile = this.tileUnder(p);
    if (p.rightButtonDown()) {
      this.queue.push({ place: null, pickUp: tile, setAngle: null });
      return;
    }
    if (!p.leftButtonDown()) return;
    const stager = this.build.stagerAt(tile);
    if (stager !== null) {
      this.queue.push({ place: null, pickUp: null, setAngle: { id: stager } });
      return;
    }
    this.queue.push({ place: { pieceId: this.build.pieceId(), ...tile, facing: this.facing }, pickUp: null, setAngle: null });
    this.dragTile = tile;
  }

  /** Dragging with a conduit selected lays one on every tile the cursor crosses, however fast it moves. */
  private pointerMove(p: Input.Pointer): void {
    const drag = this.dragTile;
    const pieceId = this.build.pieceId();
    if (!drag || !this.build.building || pieceDef(pieceId).kind !== 'conduit' || !p.leftButtonDown()) return;
    if (this.build.overUi(p.x, p.y)) return;
    const tile = this.tileUnder(p);
    for (const t of tilesBetween(drag, tile)) {
      this.queue.push({ place: { pieceId, ...t, facing: this.facing }, pickUp: null, setAngle: null });
    }
    this.dragTile = tile;
  }

  /** C was pressed since the last call. */
  takeMenuToggle(): boolean {
    const pressed = this.menuPending;
    this.menuPending = false;
    return pressed;
  }

  /** Esc was pressed since the last call. */
  takeMenuClose(): boolean {
    const pressed = this.closePending;
    this.closePending = false;
    return pressed;
  }

  /** E was pressed since the last call (for the scene's picker; the sim gets its own copy). */
  takeInteractPress(): boolean {
    const pressed = this.interactPress;
    this.interactPress = false;
    return pressed;
  }

  /** Wheel notches since the last call: positive scrolls down. */
  takeWheel(): number {
    const n = this.wheelPending;
    this.wheelPending = 0;
    return n;
  }

  /** Toggles build mode on the next tick, as B does (Esc uses this to leave it). */
  requestBuildToggle(): void {
    this.buildPending = true;
  }

  /** Fills a hopper on the next tick (the hopper menu's choice). */
  requestDeposit(id: number, itemId: string): void {
    this.depositPending = { id, itemId };
  }

  /** Empties a hopper into the inventory on the next tick (the hopper menu's choice). */
  requestWithdraw(id: number): void {
    this.withdrawPending = { id };
  }

  /** Drops game presses and queued build actions made while the menu is open, so none fire when it closes. */
  discardPending(): void {
    this.clearPresses();
    this.queue.length = 0;
  }

  private clearPresses(): void {
    this.dodgePending = false;
    this.interactPending = false;
    this.selectPending = null;
    this.buildPending = false;
    this.depositPending = null;
    this.withdrawPending = null;
  }

  /**
   * The build toggle, one queued place or pick-up, and a picker deposit, consumed.
   * The test hook merges these into its own commands, so mouse building works under it.
   */
  takeUiCommand(): UiCommand {
    const action = this.queue.shift();
    const ui = {
      toggleBuild: this.buildPending,
      place: action?.place ?? null,
      pickUp: action?.pickUp ?? null,
      setAngle: action?.setAngle ?? null,
      deposit: this.depositPending,
      withdraw: this.withdrawPending,
    };
    this.buildPending = false;
    this.depositPending = null;
    this.withdrawPending = null;
    return ui;
  }

  /** The command for the next tick. Consumes pending presses and one queued build action. */
  nextCommand(): Command {
    const axis = (neg: Input.Keyboard.Key, pos: Input.Keyboard.Key): Axis =>
      ((pos.isDown ? 1 : 0) - (neg.isDown ? 1 : 0)) as Axis;
    const ui = this.takeUiCommand();
    const command: Command = {
      ...NO_COMMAND,
      moveX: axis(this.keys.left, this.keys.right),
      moveY: axis(this.keys.up, this.keys.down),
      dodge: this.dodgePending,
      aimX: this.aimX,
      aimY: this.aimY,
      fire: this.pointer.leftButtonDown() && !this.build.building && this.overWorld(),
      interact: this.interactPending,
      selectAmmo: this.selectPending,
      ...ui,
    };
    this.clearPresses();
    return command;
  }
}
