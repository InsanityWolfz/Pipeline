import type { Cameras, Scene } from 'phaser';
import { Input } from 'phaser';
import { NO_COMMAND, type Axis, type Command } from '../sim/input';

type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'load';

// Turns WASD, Space, R and the mouse into sim commands. Space and R presses are
// latched until a tick consumes them, so a press on a frame that runs no ticks
// isn't lost and a frame that runs several ticks only acts on the first.
export class Controls {
  private readonly keys: Record<Key, Input.Keyboard.Key>;
  private readonly pointer: Input.Pointer;
  private readonly camera: Cameras.Scene2D.Camera;
  private dodgePending = false;
  private loadPending = false;
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
    };
    this.pointer = scene.input.activePointer;
    this.camera = scene.cameras.main;
  }

  /** Call once per frame before taking commands. */
  poll(): void {
    if (Input.Keyboard.JustDown(this.keys.dodge)) this.dodgePending = true;
    if (Input.Keyboard.JustDown(this.keys.load)) this.loadPending = true;
    // The camera moves every frame, so the cursor's world point does too.
    const world = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    this.aimX = world.x;
    this.aimY = world.y;
  }

  /** The command for the next tick. Consumes pending dodge and load presses. */
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
    };
    this.dodgePending = false;
    this.loadPending = false;
    return command;
  }
}
