import type { Cameras, Scene } from 'phaser';
import { Input } from 'phaser';
import { SLOT_AMMOS } from '../data/tube';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';

type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'load' | 'interact' | 'menu' | 'close';

/** Number keys pick the slot's ammo in SLOT_AMMOS order: 1 for the first, and so on. */
const NUMBER_KEYS = [
  Input.Keyboard.KeyCodes.ONE,
  Input.Keyboard.KeyCodes.TWO,
  Input.Keyboard.KeyCodes.THREE,
  Input.Keyboard.KeyCodes.FOUR,
];
if (SLOT_AMMOS.length > NUMBER_KEYS.length) throw new Error(`Only ${NUMBER_KEYS.length} ammo keys for ${SLOT_AMMOS.length} slot ammo`);
const AMMO_KEYS = NUMBER_KEYS.slice(0, SLOT_AMMOS.length);

// Turns WASD, Space, R, E, 1–3 and the mouse into sim commands, and C and Esc
// into menu toggles for the scene. Presses are latched from the keys' down
// events until consumed, so a tap shorter than a frame isn't lost, a press on a
// frame that runs no ticks isn't lost, and a frame that runs several ticks only
// acts on the first.
export class Controls {
  private readonly keys: Record<Key, Input.Keyboard.Key>;
  private readonly ammoKeys: Input.Keyboard.Key[];
  private readonly pointer: Input.Pointer;
  private readonly camera: Cameras.Scene2D.Camera;
  private dodgePending = false;
  private loadPending = false;
  private interactPending = false;
  private selectPending: string | null = null;
  private menuPending = false;
  private closePending = false;
  private aimX = 0;
  private aimY = 0;

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
      load: keyboard.addKey(codes.R),
      interact: keyboard.addKey(codes.E),
      menu: keyboard.addKey(codes.C),
      close: keyboard.addKey(codes.ESC),
    };
    this.ammoKeys = AMMO_KEYS.map((code) => keyboard.addKey(code));
    this.keys.dodge.on('down', () => (this.dodgePending = true));
    this.keys.load.on('down', () => (this.loadPending = true));
    this.keys.interact.on('down', () => (this.interactPending = true));
    this.keys.menu.on('down', () => (this.menuPending = true));
    this.keys.close.on('down', () => (this.closePending = true));
    for (const [i, key] of this.ammoKeys.entries()) key.on('down', () => (this.selectPending = SLOT_AMMOS[i] ?? null));
    this.pointer = scene.input.activePointer;
    this.camera = scene.cameras.main;
  }

  /** Call once per frame before taking commands. */
  poll(): void {
    // The camera moves every frame, so the cursor's world point does too.
    const world = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    this.aimX = world.x;
    this.aimY = world.y;
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

  /** Drops game presses made while the menu is open, so none fire when it closes. */
  discardPending(): void {
    this.dodgePending = false;
    this.loadPending = false;
    this.interactPending = false;
    this.selectPending = null;
  }

  /** The command for the next tick. Consumes pending presses. */
  nextCommand(): Command {
    const axis = (neg: Input.Keyboard.Key, pos: Input.Keyboard.Key): Axis =>
      ((pos.isDown ? 1 : 0) - (neg.isDown ? 1 : 0)) as Axis;
    const command: Command = {
      ...NO_COMMAND,
      moveX: axis(this.keys.left, this.keys.right),
      moveY: axis(this.keys.up, this.keys.down),
      dodge: this.dodgePending,
      aimX: this.aimX,
      aimY: this.aimY,
      fire: this.pointer.leftButtonDown(),
      load: this.loadPending,
      interact: this.interactPending,
      selectAmmo: this.selectPending,
    };
    this.discardPending();
    return command;
  }
}
