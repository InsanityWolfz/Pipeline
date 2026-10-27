import { SANDBOX } from './sandbox';
import { SOUND_MIX } from './sounds';

// Settings (042): per device, in browser storage under one versioned key (pipeline.settings), never in the save or
// the export (042.8). The defaults, the volume step, the actions a player can rebind in the order the key list shows
// them, and the default keys (today's, with feedback on F and flip moved to G, 042.4). Keys are Phaser key code names.

export const SETTINGS_VERSION = 1;

/** The actions the key list rebinds, in display order. Esc, Tab and the mouse buttons are fixed. */
export const BIND_ACTIONS = ['up', 'down', 'left', 'right', 'dodge', 'interact', 'menu', 'build', 'inventory', 'research', 'talents', 'rotate', 'flip', 'area', 'blueprints', 'pipette', 'use', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'feedback', 'sandbox'] as const;
export type BindAction = (typeof BIND_ACTIONS)[number];

export const ACTION_LABELS: Readonly<Record<BindAction, string>> = {
  up: 'Move up',
  down: 'Move down',
  left: 'Move left',
  right: 'Move right',
  dodge: 'Roll',
  interact: 'Interact',
  menu: 'Crafting menu',
  build: 'Build',
  inventory: 'Inventory',
  research: 'Research',
  talents: 'Talents',
  rotate: 'Rotate piece',
  flip: 'Flip piece',
  area: 'Area tool',
  blueprints: 'Blueprints',
  pipette: 'Pipette',
  use: 'Use carried item',
  slot1: 'Carried slot 1',
  slot2: 'Carried slot 2',
  slot3: 'Carried slot 3',
  slot4: 'Carried slot 4',
  slot5: 'Carried slot 5',
  feedback: 'Feedback note',
  sandbox: 'Sandbox panels',
};

/** Actions the key list shows only in the sandbox (044): the shipped game has no way into it. */
export const SANDBOX_ONLY: readonly BindAction[] = ['sandbox'];

/**
 * Actions added after players had stored bindings (044's sandbox panel, 063's Area tool and Blueprints list, 069's
 * pipette): one whose default key a stored binding has since taken is left with no key, rather than the clash resetting
 * every binding.
 */
export const NEWER_ACTIONS: readonly BindAction[] = ['sandbox', 'area', 'blueprints', 'pipette'];

/** The carried bar's slot actions (047), keys 1–5 in order. */
export const SLOT_ACTIONS: readonly BindAction[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

/** Inputs that aren't keys (047): the right mouse button, which only `use` can hold. */
export const MOUSE_INPUTS: readonly string[] = ['RIGHT_CLICK'];

/** Today's keys (042.4: feedback takes F, flip moves to G). */
export const DEFAULT_BINDINGS: Readonly<Record<BindAction, string>> = {
  up: 'W',
  down: 'S',
  left: 'A',
  right: 'D',
  dodge: 'SPACE',
  interact: 'E',
  menu: 'C',
  build: 'B',
  inventory: 'I',
  research: 'J',
  talents: 'T',
  rotate: 'R',
  flip: 'G',
  // 063: build mode's Area tool and Blueprints list.
  area: 'X',
  blueprints: 'P',
  // 069: build mode's pipette, as Factorio's (Q was free).
  pipette: 'Q',
  // 047: right click uses the carried bar's selected item; bound to a key, that key does instead.
  use: 'RIGHT_CLICK',
  slot1: 'ONE',
  slot2: 'TWO',
  slot3: 'THREE',
  slot4: 'FOUR',
  slot5: 'FIVE',
  feedback: 'F',
  // 044.1: the sandbox panel's key.
  sandbox: SANDBOX.panelKey,
};

/**
 * Keys that can't be bound: Esc (close and pause), Tab (the inventory's tab, 031), and the sound keys M, [ and ] (042:
 * kept as they are, so no key ever does two things).
 */
export const FIXED_KEYS: readonly string[] = ['ESC', 'TAB', 'M', 'OPEN_BRACKET', 'CLOSED_BRACKET'];

/** 074: the Graphics quality tiers, in the order the Settings row steps through them. */
export const QUALITY_TIERS = ['low', 'medium', 'high'] as const;
export type Quality = (typeof QUALITY_TIERS)[number];

export interface Settings {
  version: typeof SETTINGS_VERSION;
  /** 0..1 in 0.1 steps; the heard level is master × channel (042.9: music is the room ambience loops, effects every one-shot). */
  master: number;
  music: number;
  effects: number;
  muted: boolean;
  /** 042.10: off removes the bright flashes; telegraphs, damage numbers and the danger reds never change. */
  flashes: boolean;
  /** 074: Graphics quality, Low, Medium or High: how much light, fog and light catch the world draws. */
  quality: Quality;
  bindings: Record<BindAction, string>;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  version: SETTINGS_VERSION,
  master: SOUND_MIX.volume,
  music: 1,
  effects: 1,
  muted: false,
  flashes: true,
  quality: 'medium',
  bindings: { ...DEFAULT_BINDINGS },
};

/** Volume rows step by this much (10%). */
export const VOLUME_STEP = 0.1;

/** How a key code name reads on screen: "Space", "1", "Shift", or the letter. */
export const KEY_LABELS: Readonly<Record<string, string>> = {
  SPACE: 'Space',
  SHIFT: 'Shift',
  CTRL: 'Ctrl',
  ALT: 'Alt',
  ENTER: 'Enter',
  BACKSPACE: 'Backspace',
  ZERO: '0',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  RIGHT_CLICK: 'Right click',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  UP: 'Up',
  DOWN: 'Down',
  LEFT: 'Left',
  RIGHT: 'Right',
  COMMA: ',',
  PERIOD: '.',
  SEMICOLON: ';',
  QUOTES: "'",
  FORWARD_SLASH: '/',
  BACK_SLASH: '\\',
  MINUS: '-',
  PLUS: '=',
  BACKTICK: '`',
};

/** The Settings screen's words. */
export const SETTINGS_TEXT = {
  title: 'Settings',
  rows: {
    master: 'Master volume',
    music: 'Music volume',
    effects: 'Effects volume',
    mute: 'Mute',
    flashes: 'Flashes',
    quality: 'Graphics quality',
    keys: 'Key bindings',
    export: 'Export save',
    import: 'Import save',
    damaged: 'Export damaged save',
    back: 'Back',
  },
  quality: { low: 'Low', medium: 'Medium', high: 'High' } as Readonly<Record<Quality, string>>,
  on: 'On',
  off: 'Off',
  notes: (n: number): string => (n === 1 ? '1 feedback note stored' : `${n} feedback notes stored`),
  keysTitle: 'Key bindings',
  keysNote: 'Click an action, then press a key. Esc cancels.',
  waiting: 'Press a key…',
  reset: 'Reset to defaults',
} as const;
