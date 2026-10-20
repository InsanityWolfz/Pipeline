import { Input } from 'phaser';
import { SLOT_AMMOS } from '../data/tube';
import { DEFAULT_BINDINGS, type BindAction } from '../data/settings';

// The keyboard's bindings: what each key does is in controls.ts. 042: the rebindable keys come from the settings
// (src/data/settings.ts has today's defaults); Esc, Tab and Shift-for-tips are fixed.

export type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'rotate' | 'flip' | 'interact' | 'menu' | 'close' | 'build' | 'inventory' | 'inventoryTab' | 'research' | 'talents' | 'shift';

/** The ammo slot actions, in SLOT_AMMOS order: the first key picks the first slot's ammo, and so on. */
const AMMO_ACTIONS: readonly BindAction[] = ['ammo1', 'ammo2', 'ammo3', 'ammo4'];
if (SLOT_AMMOS.length > AMMO_ACTIONS.length) throw new Error(`Only ${AMMO_ACTIONS.length} ammo keys for ${SLOT_AMMOS.length} slot ammo`);

/** A key code name ("W", "SPACE") as its code; unknown names fall back to none (the action has no key). */
export function codeOf(name: string): number | null {
  const code = (Input.Keyboard.KeyCodes as Record<string, number>)[name];
  return typeof code === 'number' ? code : null;
}

/** A key code's name ("W", "SPACE"), for binding the key a player pressed; null for a key Phaser doesn't name. */
export function nameOf(code: number): string | null {
  for (const [name, c] of Object.entries(Input.Keyboard.KeyCodes as Record<string, number>)) if (c === code) return name;
  return null;
}

/**
 * Binds the keys: the rebindable ones from `bindings`, plus Esc, I's twin Tab (031) and Shift held for a tip's
 * breakdown (040). Every key is captured (Phaser's default), so Tab never moves the browser's focus; Shift isn't, so
 * Shift+click (022) keeps working as the page sees it.
 */
export function bindKeys(keyboard: Input.Keyboard.KeyboardPlugin, bindings: Readonly<Record<BindAction, string>>): { keys: Record<Key, Input.Keyboard.Key>; ammo: Input.Keyboard.Key[] } {
  const codes = Input.Keyboard.KeyCodes;
  const add = (action: BindAction): Input.Keyboard.Key => keyboard.addKey(codeOf(bindings[action]) ?? codeOf(DEFAULT_BINDINGS[action]) ?? 0);
  const keys: Record<Key, Input.Keyboard.Key> = {
    up: add('up'),
    down: add('down'),
    left: add('left'),
    right: add('right'),
    dodge: add('dodge'),
    rotate: add('rotate'),
    flip: add('flip'),
    interact: add('interact'),
    menu: add('menu'),
    close: keyboard.addKey(codes.ESC),
    build: add('build'),
    inventory: add('inventory'),
    inventoryTab: keyboard.addKey(codes.TAB, true),
    research: add('research'),
    talents: add('talents'),
    shift: keyboard.addKey(codes.SHIFT, false),
  };
  return { keys, ammo: AMMO_ACTIONS.slice(0, SLOT_AMMOS.length).map(add) };
}

/** What each key's press does (042: wired here so Controls can rebind them in one call). */
export interface KeyHandlers {
  dodge(): void;
  rotate(): void;
  flip(): void;
  interact(): void;
  /** C, Esc, I or Tab, J and T: the menu keys the scene takes. */
  menu(key: 'menu' | 'close' | 'inventory' | 'research' | 'talents'): void;
  build(): void;
  ammo(slot: number): void;
}

/** Wires each key's down event to its handler. */
export function listenKeys(keys: Record<Key, Input.Keyboard.Key>, ammo: readonly Input.Keyboard.Key[], h: KeyHandlers): void {
  keys.dodge.on('down', () => h.dodge());
  keys.rotate.on('down', () => h.rotate());
  keys.flip.on('down', () => h.flip());
  keys.interact.on('down', () => h.interact());
  for (const m of ['menu', 'close', 'research', 'talents'] as const) keys[m].on('down', () => h.menu(m));
  for (const k of [keys.inventory, keys.inventoryTab]) k.on('down', () => h.menu('inventory'));
  keys.build.on('down', () => h.build());
  for (const [i, k] of ammo.entries()) k.on('down', () => h.ammo(i));
}
