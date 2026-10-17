import type { Scene } from 'phaser';
import { Input } from 'phaser';
import type { Axis, Command } from '../sim/input';

// Turns WASD and Space into sim commands. A Space press is latched until a
// tick consumes it, so a press on a frame that runs no ticks isn't lost and
// a frame that runs several ticks only dodges on the first.
export class KeyboardInput {
  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'dodge', Input.Keyboard.Key>;
  private dodgePending = false;

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
    };
  }

  /** Call once per frame before taking commands. */
  poll(): void {
    if (Input.Keyboard.JustDown(this.keys.dodge)) this.dodgePending = true;
  }

  /** The command for the next tick. Consumes a pending dodge press. */
  nextCommand(): Command {
    const axis = (neg: Input.Keyboard.Key, pos: Input.Keyboard.Key): Axis =>
      ((pos.isDown ? 1 : 0) - (neg.isDown ? 1 : 0)) as Axis;
    const command: Command = {
      moveX: axis(this.keys.left, this.keys.right),
      moveY: axis(this.keys.up, this.keys.down),
      dodge: this.dodgePending,
    };
    this.dodgePending = false;
    return command;
  }
}
