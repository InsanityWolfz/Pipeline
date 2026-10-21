import { VIEW_HEIGHT } from './config';

// The title screen (042): the painted scene's layout, the logo, the menu rows and their words, the Continue line,
// and the confirm and farewell cards' texts. View px (640×360). The scene, logo and rows are pending Shaun's approval
// by eye; the words are his to rewrite.

export const TITLE_ROWS = ['newGame', 'continue', 'settings', 'quit'] as const;
export type TitleRow = (typeof TITLE_ROWS)[number];

export const TITLE_SCREEN = {
  /** The logo in the display font, scaled up, centred on `cx`; a soft cyan glow behind it. */
  logo: {
    text: 'Pipeline',
    cx: 500,
    // 050 (F, Shaun: "make the pipeline text bigger"): 6.4 (from 5), its middle where it was (about y 54).
    y: 38,
    scale: 6.4,
    glow: { color: 'cyan', rx: 143, ry: 38, rings: 6, alpha: 0.09, dy: 15 },
  },
  /**
   * The menu column's top-left and scale: 020's 184×20 rows (flowLayout.ts). 050 (F, "the buttons bigger… they're
   * fine where they're at"): 1.25 times (230×25), centred on the same point as before (x 500, y about 182).
   */
  menu: { x: 385, y: 124, scale: 1.25 },
  rows: { newGame: 'New game', continue: 'Continue', settings: 'Settings', quit: 'Quit' } satisfies Record<TitleRow, string>,
  /** The posed wanderer on the ridge: feet at (x, y), drawn this many times its world size, facing the ruin. */
  wanderer: { x: 148, y: 244, scale: 2.4, aim: 0.18, glow: 0.95 },
  /**
   * 050 (F, Shaun: "a tad more movement"): the wanderer breathes (the hips dip `crouch` style px and back, once per
   * `breathMs`), the cloak sways `flap` radians and the hose `hose` px in the wind (once per `swayMs`), and the tube's
   * glow pulses between `muzzle` strengths (and the face glow between `glow`) once per `glowMs`. Redrawn every `frameMs`.
   */
  motion: { breathMs: 3600, crouch: 1, swayMs: 2700, flap: 0.12, hose: 2.5, glowMs: 2200, muzzle: [0.25, 1] as const, glow: [0.8, 1] as const, frameMs: 33 },
  /** The intake pipe's glow over the ruin, breathing slowly (019's cyan): its centre, size and alpha range over a period. */
  pipeGlow: { x: 392, y: 240, rx: 15, ry: 22, rings: 5, color: 'cyan', alpha: [0.18, 0.5] as const, periodMs: 3600 },
  /**
   * Ley motes drifting across the scene (014's ambient motes, slower): count, speed px/s, size px, colour and alpha.
   * They start between `band` (y, px) and drift right and up; past the view's right edge (by `wrap`) a mote comes
   * back at the left, and above `band[0]` it comes back at `band[1]`.
   */
  motes: { count: 26, speed: [3, 8] as const, rise: [1, 4] as const, size: [0.6, 1.3] as const, color: 'cyan-glow', alpha: [0.25, 0.7] as const, twinkleMs: 2400, band: [20, VIEW_HEIGHT - 20] as const, wrap: 4 },
} as const;

/** The Continue row's line under it (042): "Level 8 · 3 pylons · Bulwark · saved 19 Oct, 21:40". */
export const CONTINUE_LINE = {
  level: (n: number): string => `Level ${n}`,
  pylons: (n: number): string => (n === 1 ? '1 pylon' : `${n} pylons`),
  saved: (when: string): string => `saved ${when}`,
  join: ' · ',
  /** Boss ids to the names the line shows. */
  bosses: { bulwark: 'Bulwark' } as Readonly<Record<string, string>>,
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const,
  /** Why Continue is greyed out with a save that can't be loaded. */
  corrupt: "Your save couldn't be read.",
  newer: 'This save is from a newer version of the game.',
} as const;

/** The confirm cards (042): their question and the two buttons. */
export const CONFIRMS = {
  newGame: { text: 'Start a new game? Your saved game will be replaced.', yes: 'Start new game', no: 'Cancel' },
  quitInFoundry: { text: 'Quit to the title?', yes: 'Quit to title', no: 'Cancel' },
  quitOutside: { text: "Quit to the title? Anything you've picked up since you last entered the foundry will be lost.", yes: 'Quit to title', no: 'Cancel' },
  importSave: { text: 'Replace your saved game with this one?', yes: 'Replace', no: 'Cancel' },
} as const;
export type ConfirmKind = keyof typeof CONFIRMS;

/** The farewell card (042.13): the page can't close a tab the player opened, so it says so. */
export const FAREWELL = { text: 'Thanks for playing. You can close this tab now.', back: 'Back to title' } as const;

/** The card tablets (confirm, farewell, notices): width, padding, line gap, button row. View px. */
export const CARD = { w: 300, pad: 12, lineGap: 2, buttonGap: 8 } as const;
