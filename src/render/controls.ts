import type { Cameras, Scene } from 'phaser';
import { Input } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { rotateCw } from '../sim/direction';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';
import { BUILD_BAR } from '../data/pieces';
import type { Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import type { ConduitLay } from './dragPath';
import { BuildDrag } from './buildDrag';
import { clickMods, heldButtons, isLeftPress, type BuildInput } from './clickInput';
import { bindKeys, listenKeys, type Key } from './keys';
import { onSettings, settings } from './flow/settingsStore';
import { MenuRequests, type UiCommand } from './menuRequests';
import { toView } from './scale';

export type { BuildInput } from './clickInput';

/** The commands that come from build mode and the hopper menu rather than held keys. */
export { NO_UI_COMMAND, type UiCommand } from './menuRequests';
// Turns WASD, Space, R, E, B, 1–5 and the mouse (left click fires, right click uses, 047) into sim commands, and C, Esc, I and
// Tab into menu toggles for the scene. Presses are latched from the keys' down
// events until consumed, so a tap shorter than a frame isn't lost, a press on a
// frame that runs no ticks isn't lost, and a frame that runs several ticks only
// acts on the first. In build mode, R turns the ghost (it does nothing outside it),
// clicks place and pick up pieces (queued, one per tick), and
// dragging lays conduits.
export class Controls {
  private keys!: Record<Key, Input.Keyboard.Key>;
  private ammoKeys: Input.Keyboard.Key[] = [];
  /** 047: `use` bound to a key, or null while it's right click (the default). */
  private useKey: Input.Keyboard.Key | null = null;
  private readonly keyboard: Input.Keyboard.KeyboardPlugin;
  /** The bindings the keys were made from (042: rebound from Settings). */
  private bound = '';
  private readonly pointer: Input.Pointer;
  private readonly camera: Cameras.Scene2D.Camera;
  private dodgePending = false;
  private interactPending = false;
  private interactPress = false;
  private selectPending: number | null = null;
  /** C, Esc, I or Tab (031), J (033) and T (037), latched until the scene takes them. */
  private readonly menuKeys = { menu: false, close: false, inventory: false, research: false, talents: false, sandbox: false };
  private buildPending = false;
  private wheelPending = 0;
  /** Choices clicked in the hopper, pylon, stash and bench menus. */
  readonly menus = new MenuRequests();
  /** Build mode's mouse: places, pick-ups and conduit drags (src/render/buildDrag.ts). */
  private readonly drag = new BuildDrag();
  private build: BuildInput = {
    building: false,
    pieceId: () => BUILD_BAR[0] ?? '',
    overUi: () => false,
    clickUi: () => undefined,
  };
  private aimX = 0;
  private aimY = 0;
  /** The ghost's facing, sent with every place. */
  facing: Facing = 'right';
  /** A press that began over a menu or the HUD: fire stays off until the button comes up (015). */
  private uiPress = false;
  /** That press was a left one (047: only a left press's release reaches the UI). */
  private leftUiPress = false;
  /** Flip (G since 042, F before) turns a sorter's ghost to send its item left (015); sent with every place. */
  mirrored = false;

  /** 044: in the sandbox only, the panel's key is bound (the shipped game never captures it). */
  private readonly sandbox: boolean;

  constructor(scene: Scene, sandbox = false) {
    this.sandbox = sandbox;
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    this.keyboard = keyboard;
    this.bindAll();
    // 042: a rebind in Settings takes effect at once.
    const off = onSettings(() => this.bindAll());
    scene.events.once('shutdown', off);
    this.pointer = scene.input.activePointer;
    this.camera = scene.cameras.main;
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Input.Pointer) => this.pointerDown(p));
    scene.input.on('pointermove', (p: Input.Pointer) => this.pointerMove(p));
    scene.input.on('pointerup', (p: Input.Pointer) => this.release(p));
    scene.input.on('pointerupoutside', (p: Input.Pointer) => this.release(p));
    scene.input.on('wheel', (_p: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.wheelPending += Math.sign(dy);
    });
  }

  /** Makes the keys from the settings' bindings (again, after a rebind), with their listeners. */
  private bindAll(): void {
    const bindings = settings().bindings;
    const key = JSON.stringify(bindings);
    if (key === this.bound) return;
    this.bound = key;
    this.keyboard.removeAllKeys(true);
    const { keys, ammo, use, sandbox } = bindKeys(this.keyboard, bindings, this.sandbox);
    this.keys = keys;
    this.ammoKeys = ammo;
    this.useKey = use;
    listenKeys(keys, ammo, {
      dodge: () => (this.dodgePending = true),
      // R and G only turn and flip the ghost in build mode.
      rotate: () => void (this.build.building && (this.facing = rotateCw(this.facing))),
      flip: () => void (this.build.building && (this.mirrored = !this.mirrored)),
      interact: () => (this.interactPending = this.interactPress = true),
      menu: (key) => (this.menuKeys[key] = true),
      build: () => (this.buildPending = true),
      ammo: (i) => (this.selectPending = i),
    }, sandbox);
  }

  /** Call once per frame before taking commands. */
  poll(build: BuildInput): void {
    this.build = build;
    if (!build.building) {
      this.drag.reset();
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

  /** The cursor in view px (020: for menu rows lighting under it). */
  viewPointer(): { x: number; y: number } {
    return this.view(this.pointer);
  }

  /** Shift is held (040: a tip shows its breakdown). */
  shiftHeld(): boolean {
    return this.keys.shift.isDown;
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

  private release(p?: Input.Pointer): void {
    // 047: a press that began on the UI ends there too: the grid's click, or a stack dropped on the carried bar.
    if (this.uiPress && p && this.leftUiPress) {
      const v = this.view(p);
      this.build.releaseUi?.(v.x, v.y);
    }
    this.uiPress = false;
    this.leftUiPress = false;
    this.endDrag();
  }

  private pointerDown(p: Input.Pointer): void {
    const v = this.view(p);
    const mods = clickMods(p.event);
    // Ctrl+click is a game input (022: all of a hopper stack), never a browser shortcut.
    if (mods.ctrl) p.event.preventDefault();
    if (this.build.overUi(v.x, v.y)) {
      this.uiPress = true;
      // On macOS Phaser calls Ctrl+left-click a right click; the DOM event knows better.
      if (isLeftPress(p.event, p.leftButtonDown())) {
        this.leftUiPress = true;
        this.build.clickUi(v.x, v.y, mods);
      }
      return;
    }
    if (!this.build.building) return;
    const tile = this.tileUnder(p);
    if (p.rightButtonDown()) this.drag.pickUp(tile);
    else if (p.leftButtonDown()) this.drag.press(tile, this.build.pieceId(), this.facing, this.mirrored);
  }

  /** Release (inside the canvas or out): the held conduit is laid. */
  private endDrag(): void {
    this.drag.end(this.build.pieceId(), this.facing);
  }

  /** The conduit a drag is holding back, as it would be laid now; the ghost draws it. */
  heldLay(): ConduitLay | null {
    return this.drag.heldLay(this.facing);
  }

  /** Dragging with a conduit selected lays one on every tile the cursor crosses, however fast it moves. */
  private pointerMove(p: Input.Pointer): void {
    if (!this.drag.dragging || !this.build.building || !p.leftButtonDown()) return;
    const v = this.view(p);
    if (this.build.overUi(v.x, v.y)) return;
    this.drag.move(this.tileUnder(p), this.build.pieceId());
  }

  /** C (`menu`), Esc (`close`), I or Tab (`inventory`, 031), or J (`research`, 033) was pressed since the last call. */
  takeMenuKey(key: keyof Controls['menuKeys']): boolean {
    const pressed = this.menuKeys[key];
    this.menuKeys[key] = false;
    return pressed;
  }

  /** E was pressed since the last call (for the scene's picker; the sim gets its own copy). */
  takeInteractPress(): boolean {
    const pressed = this.interactPress;
    this.interactPress = false;
    return pressed;
  }

  /** Drops this frame's E before it reaches the sim (050: an E that closes a screen mustn't also harvest or claim). */
  dropInteract(): void {
    this.interactPending = false;
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
    this.drag.queue.length = 0;
  }

  /** Drops everything latched, menu keys and the wheel too (042: a flow screen is over the game). */
  drain(): void {
    this.discardPending();
    for (const k of Object.keys(this.menuKeys) as (keyof Controls['menuKeys'])[]) this.menuKeys[k] = false;
    this.interactPress = false;
    this.wheelPending = 0;
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
    const action = this.drag.queue.shift();
    const ui = {
      toggleBuild: this.buildPending,
      place: action?.place ?? null,
      pickUp: action?.pickUp ?? null,
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
    // 047: a Mac's Ctrl+left-click is a left click (the volley), never the carried item.
    const held = heldButtons(this.pointer.event as MouseEvent | undefined, this.pointer.leftButtonDown(), this.pointer.rightButtonDown());
    const command: Command = {
      ...NO_COMMAND,
      moveX: axis(this.keys.left, this.keys.right),
      moveY: axis(this.keys.up, this.keys.down),
      dodge: this.dodgePending,
      aimX: this.aimX,
      aimY: this.aimY,
      fire: held.left && !this.uiPress && !this.build.building && this.overWorld(),
      // 047: right click (or the key `use` is bound to) uses the carried bar's selected item.
      use: (this.useKey ? this.useKey.isDown : held.right && !this.uiPress && this.overWorld()) && !this.build.building,
      interact: this.interactPending,
      selectSlot: this.selectPending,
      ...ui,
    };
    this.clearPresses();
    return command;
  }
}
