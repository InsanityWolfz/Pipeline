import type { Scene } from 'phaser';
import { Input } from 'phaser';
import { rotateCw } from '../sim/direction';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';
import type { Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import type { ConduitLay } from './dragPath';
import type { BuildInput } from './clickInput';
import { bindKeys, listenKeys, type Key } from './keys';
import { onSettings, settings } from './flow/settingsStore';
import { MenuRequests, type UiCommand } from './menuRequests';
import { PointerInput } from './pointerInput';
import { BlueprintInput } from './blueprintInput';

export type { BuildInput } from './clickInput';

/** The commands that come from build mode and the hopper menu rather than held keys. */
export { NO_UI_COMMAND, type UiCommand } from './menuRequests';
// Turns WASD, Space, R, E, B, 1–5 and the mouse (left click fires, right click uses, 047) into sim commands, and C, Esc, I and
// Tab into menu toggles for the scene. Presses are latched from the keys' down
// events until consumed, so a tap shorter than a frame isn't lost, a press on a
// frame that runs no ticks isn't lost, and a frame that runs several ticks only
// acts on the first. In build mode, R turns the ghost (it does nothing outside it),
// clicks place and pick up pieces (queued, one per tick), and
// dragging lays conduits (the mouse is in src/render/pointerInput.ts).
export class Controls {
  private keys!: Record<Key, Input.Keyboard.Key>;
  private ammoKeys: Input.Keyboard.Key[] = [];
  /** 047: `use` bound to a key, or null while it's right click (the default). */
  private useKey: Input.Keyboard.Key | null = null;
  private readonly keyboard: Input.Keyboard.KeyboardPlugin;
  /** The bindings the keys were made from (042: rebound from Settings). */
  private bound = '';
  /** The mouse: aim, UI presses and build mode's clicks and drags. */
  private readonly mouse: PointerInput;
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
  /** The ghost's facing, sent with every place. */
  facing: Facing = 'right';
  /** Flip (G since 042, F before) turns a splitter's ghost to send items out its left (033); sent with every place. */
  mirrored = false;
  /** 063: build mode's tools: the Area tool's box and the blueprint ghost. */
  readonly tools = new BlueprintInput();

  /** 044: in the sandbox only, the panel's key is bound (the shipped game never captures it). */
  private readonly sandbox: boolean;

  constructor(scene: Scene, sandbox = false) {
    this.sandbox = sandbox;
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    this.keyboard = keyboard;
    this.mouse = new PointerInput(scene, this, this.tools);
    this.bindAll();
    // 042: a rebind in Settings takes effect at once.
    const off = onSettings(() => this.bindAll());
    scene.events.once('shutdown', off);
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
      // R and G only turn and flip the ghost in build mode (063: the blueprint ghost, while one is held).
      rotate: () => void (this.mouse.build.building && (this.tools.ghost ? this.tools.turn() : (this.facing = rotateCw(this.facing)))),
      flip: () => void (this.mouse.build.building && (this.tools.ghost ? this.tools.mirror() : (this.mirrored = !this.mirrored))),
      area: () => void (this.mouse.build.building && this.tools.toggleArea()),
      blueprints: () => void (this.mouse.build.building && this.tools.toggleList()),
      interact: () => (this.interactPending = this.interactPress = true),
      menu: (key) => (this.menuKeys[key] = true),
      build: () => (this.buildPending = true),
      ammo: (i) => (this.selectPending = i),
    }, sandbox);
  }

  /** Call once per frame before taking commands. */
  poll(build: BuildInput): void {
    this.mouse.poll(build);
  }

  /** The world point under the cursor. */
  cursorPoint(): { x: number; y: number } {
    return this.mouse.cursorPoint();
  }

  /** The world tile under the cursor. */
  cursorTile(): Tile {
    return this.mouse.cursorTile();
  }

  /** The cursor in view px (020: for menu rows lighting under it). */
  viewPointer(): { x: number; y: number } {
    return this.mouse.viewPointer();
  }

  /** Shift is held (040: a tip shows its breakdown). */
  shiftHeld(): boolean {
    return this.keys.shift.isDown;
  }

  /** The cursor is over the world, not the screen's UI. */
  overWorld(): boolean {
    return this.mouse.overWorld();
  }

  /** The conduit a drag is holding back, as it would be laid now; the ghost draws it. */
  heldLay(): ConduitLay | null {
    return this.mouse.heldLay();
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
    this.mouse.drag.queue.length = 0;
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
    const action = this.mouse.drag.queue.shift();
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
    const held = this.mouse.held();
    const { x: aimX, y: aimY } = this.mouse.cursorPoint();
    const building = this.mouse.build.building;
    const uiPress = this.mouse.uiPress;
    const command: Command = {
      ...NO_COMMAND,
      moveX: axis(this.keys.left, this.keys.right),
      moveY: axis(this.keys.up, this.keys.down),
      dodge: this.dodgePending,
      aimX,
      aimY,
      fire: held.left && !uiPress && !building && this.overWorld(),
      // 047: right click (or the key `use` is bound to) uses the carried bar's selected item.
      use: (this.useKey ? this.useKey.isDown : held.right && !uiPress && this.overWorld()) && !building,
      interact: this.interactPending,
      selectSlot: this.selectPending,
      ...ui,
    };
    this.clearPresses();
    return command;
  }
}
