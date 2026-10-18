import type { Cameras, Scene } from 'phaser';
import { Input } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { SLOT_AMMOS } from '../data/tube';
import { rotateCw } from '../sim/direction';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';
import { BUILD_BAR, pieceDef } from '../data/pieces';
import type { Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { dragTo, release, type ConduitLay, type HeldConduit } from './dragPath';
import { AMMO_KEYS, bindKeys, type Key } from './keys';
import { MenuRequests, type UiCommand } from './menuRequests';
import { toView } from './scale';

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
export { NO_UI_COMMAND, type UiCommand } from './menuRequests';
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
  /** Choices clicked in the hopper, pylon, stash and bench menus. */
  readonly menus = new MenuRequests();
  private readonly queue: BuildAction[] = [];
  private dragTile: Tile | null = null;
  /** The conduit tile a drag is on, held back until the next tile says which way it faces (013). */
  private held: HeldConduit | null = null;
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
  /** A press that began over a menu or the HUD: fire stays off until the button comes up (015). */
  private uiPress = false;
  /** F flips a sorter's ghost to send its item left (015); sent with every place. */
  mirrored = false;

  constructor(scene: Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    this.keys = bindKeys(keyboard);
    this.ammoKeys = AMMO_KEYS.map((code) => keyboard.addKey(code));
    this.keys.dodge.on('down', () => (this.dodgePending = true));
    this.keys.rotate.on('down', () => {
      if (this.build.building) this.facing = rotateCw(this.facing);
    });
    this.keys.flip.on('down', () => {
      if (this.build.building) this.mirrored = !this.mirrored;
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
    scene.input.on('pointerup', () => this.release());
    scene.input.on('pointerupoutside', () => this.release());
    scene.input.on('wheel', (_p: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.wheelPending += Math.sign(dy);
    });
  }

  /** Call once per frame before taking commands. */
  poll(build: BuildInput): void {
    this.build = build;
    if (!build.building) {
      this.dragTile = null;
      this.held = null;
    }
    // The camera moves every frame, so the cursor's world point does too.
    const world = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    this.aimX = world.x;
    this.aimY = world.y;
  }

  /** The world point under the cursor. */
  cursorPoint(): { x: number; y: number } {
    return { x: this.aimX, y: this.aimY };
  }

  /** The world tile under the cursor. */
  cursorTile(): Tile {
    return { tx: Math.floor(this.aimX / TILE_SIZE), ty: Math.floor(this.aimY / TILE_SIZE) };
  }

  /** A pointer's position in view px (the HUD's 640×360 layout), whatever the backbuffer resolution (016). */
  private view(p: { x: number; y: number }): { x: number; y: number } {
    return toView(p.x, p.y, this.camera.zoom);
  }

  /** The cursor is over the world, not the screen's UI. */
  overWorld(): boolean {
    const v = this.view(this.pointer);
    return !this.build.overUi(v.x, v.y);
  }

  private tileUnder(p: Input.Pointer): Tile {
    const world = this.camera.getWorldPoint(p.x, p.y);
    return { tx: Math.floor(world.x / TILE_SIZE), ty: Math.floor(world.y / TILE_SIZE) };
  }

  private release(): void {
    this.uiPress = false;
    this.endDrag();
  }

  private pointerDown(p: Input.Pointer): void {
    const v = this.view(p);
    if (this.build.overUi(v.x, v.y)) {
      this.uiPress = true;
      if (p.leftButtonDown()) this.build.clickUi(v.x, v.y);
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
    const pieceId = this.build.pieceId();
    this.endDrag();
    this.dragTile = tile;
    // A conduit waits for the drag: a click lays it on release, with the ghost's facing.
    if (pieceDef(pieceId).kind === 'conduit') this.held = { tile };
    else this.queue.push({ place: { pieceId, ...tile, facing: this.facing, ...(this.mirrored ? { mirrored: true } : {}) }, pickUp: null, setAngle: null });
  }

  private lay(l: ConduitLay): void {
    this.queue.push({ place: { pieceId: this.build.pieceId(), ...l }, pickUp: null, setAngle: null });
  }

  /** Release (inside the canvas or out): the held conduit is laid. */
  private endDrag(): void {
    this.dragTile = null;
    if (this.held) this.lay(release(this.held, this.facing));
    this.held = null;
  }

  /** The conduit a drag is holding back, as it would be laid now; the ghost draws it. */
  heldLay(): ConduitLay | null {
    return this.held ? release(this.held, this.facing) : null;
  }

  /** Dragging with a conduit selected lays one on every tile the cursor crosses, however fast it moves. */
  private pointerMove(p: Input.Pointer): void {
    const drag = this.dragTile;
    const pieceId = this.build.pieceId();
    if (!drag || !this.build.building || pieceDef(pieceId).kind !== 'conduit' || !p.leftButtonDown()) return;
    const v = this.view(p);
    if (this.build.overUi(v.x, v.y)) return;
    const tile = this.tileUnder(p);
    // Each tile faces the next one, so a drag that turns lays a corner.
    const step = dragTo(this.held ?? { tile: drag }, tile);
    for (const l of step.lay) this.lay(l);
    this.held = step.held;
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
    this.menus.clear();
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
      ...this.menus.take(),
    };
    this.buildPending = false;
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
      fire: this.pointer.leftButtonDown() && !this.uiPress && !this.build.building && this.overWorld(),
      interact: this.interactPending,
      selectAmmo: this.selectPending,
      ...ui,
    };
    this.clearPresses();
    return command;
  }
}
