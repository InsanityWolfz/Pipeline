import { Input } from 'phaser';
import { DEFAULT_BINDINGS, MOUSE_INPUTS, SLOT_ACTIONS, type BindAction } from '../data/settings';

// The keyboard's bindings: what each key does is in controls.ts. 042: the rebindable keys come from the settings
// (src/data/settings.ts has today's defaults); Esc, Tab and Shift-for-tips are fixed.

export type Key = 'up' | 'down' | 'left' | 'right' | 'dodge' | 'rotate' | 'flip' | 'area' | 'interact' | 'menu' | 'close' | 'build' | 'inventory' | 'inventoryTab' | 'research' | 'talents' | 'shift';


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
export function bindKeys(
  keyboard: Input.Keyboard.KeyboardPlugin,
  bindings: Readonly<Record<BindAction, string>>,
  sandbox = false,
): { keys: Record<Key, Input.Keyboard.Key>; ammo: Input.Keyboard.Key[]; use: Input.Keyboard.Key | null; sandbox: Input.Keyboard.Key | null } {
  const codes = Input.Keyboard.KeyCodes;
  // An action left with no key ('', 063: a newer action whose default a stored binding took) gets code 0, which no key sends.
  const add = (action: BindAction): Input.Keyboard.Key => keyboard.addKey(bindings[action] === '' ? 0 : (codeOf(bindings[action]) ?? codeOf(DEFAULT_BINDINGS[action]) ?? 0));
  const keys: Record<Key, Input.Keyboard.Key> = {
    up: add('up'),
    down: add('down'),
    left: add('left'),
    right: add('right'),
    dodge: add('dodge'),
    rotate: add('rotate'),
    flip: add('flip'),
    area: add('area'),
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
  // 044: the sandbox panel's key, only in the sandbox (the shipped game never captures it); unbound ('') it has none.
  const panel = sandbox ? codeOf(bindings.sandbox) : null;
  // 047: `use` is right click by default (the pointer's, read in controls.ts); bound to a key, that key.
  const use = MOUSE_INPUTS.includes(bindings.use) ? null : codeOf(bindings.use);
  return { keys, ammo: SLOT_ACTIONS.map(add), use: use === null ? null : keyboard.addKey(use), sandbox: panel === null ? null : keyboard.addKey(panel) };
}

/** What each key's press does (042: wired here so Controls can rebind them in one call). */
export interface KeyHandlers {
  dodge(): void;
  rotate(): void;
  flip(): void;
  /** 063: the Area tool, in build mode. */
  area(): void;
  interact(): void;
  /** C, Esc, I or Tab, J and T, and the sandbox panel's key (044): the menu keys the scene takes. */
  menu(key: 'menu' | 'close' | 'inventory' | 'research' | 'talents' | 'sandbox'): void;
  build(): void;
  /** Keys 1–5 (047): a carried bar slot, by index. */
  ammo(slot: number): void;
}

/** Wires each key's down event to its handler. */
export function listenKeys(keys: Record<Key, Input.Keyboard.Key>, ammo: readonly Input.Keyboard.Key[], h: KeyHandlers, sandbox: Input.Keyboard.Key | null = null): void {
  sandbox?.on('down', () => h.menu('sandbox'));
  keys.dodge.on('down', () => h.dodge());
  keys.rotate.on('down', () => h.rotate());
  keys.flip.on('down', () => h.flip());
  keys.area.on('down', () => h.area());
  keys.interact.on('down', () => h.interact());
  for (const m of ['menu', 'close', 'research', 'talents'] as const) keys[m].on('down', () => h.menu(m));
  for (const k of [keys.inventory, keys.inventoryTab]) k.on('down', () => h.menu('inventory'));
  keys.build.on('down', () => h.build());
  for (const [i, k] of ammo.entries()) k.on('down', () => h.ammo(i));
}
