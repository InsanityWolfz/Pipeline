import { Input } from 'phaser';
import { SLOT_AMMOS } from '../data/tube';

// The keyboard's bindings: what each key does is in controls.ts.

export type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'rotate' | 'flip' | 'interact' | 'menu' | 'close' | 'build';

/** Number keys pick the slot's ammo in SLOT_AMMOS order: 1 for the first, and so on. */
const NUMBER_KEYS = [
  Input.Keyboard.KeyCodes.ONE,
  Input.Keyboard.KeyCodes.TWO,
  Input.Keyboard.KeyCodes.THREE,
  Input.Keyboard.KeyCodes.FOUR,
];
if (SLOT_AMMOS.length > NUMBER_KEYS.length) throw new Error(`Only ${NUMBER_KEYS.length} ammo keys for ${SLOT_AMMOS.length} slot ammo`);
export const AMMO_KEYS = NUMBER_KEYS.slice(0, SLOT_AMMOS.length);

/** WASD to move, Space to roll, R and F to turn and flip a piece, E, C, Esc and B. */
export function bindKeys(keyboard: Input.Keyboard.KeyboardPlugin): Record<Key, Input.Keyboard.Key> {
  const codes = Input.Keyboard.KeyCodes;
  return {
    up: keyboard.addKey(codes.W),
    down: keyboard.addKey(codes.S),
    left: keyboard.addKey(codes.A),
    right: keyboard.addKey(codes.D),
    dodge: keyboard.addKey(codes.SPACE),
    rotate: keyboard.addKey(codes.R),
    flip: keyboard.addKey(codes.F),
    interact: keyboard.addKey(codes.E),
    menu: keyboard.addKey(codes.C),
    close: keyboard.addKey(codes.ESC),
    build: keyboard.addKey(codes.B),
  };
}
