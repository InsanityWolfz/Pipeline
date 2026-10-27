// The flow screens' layout (042), view px (640×360): the menu rows they share with 020's menus, and the tablets
// for Settings, the key list, the cards (confirm, farewell), the end card and the note. Kept out of hudLayout.ts,
// which holds the in-game HUD and menus.

/** 020's menu rows (the picker, pause and site menus): 184×20. */
export const MENU_ROW_W = 184;
export const MENU_ROW_H = 20;

/** How the flow screens' rows are laid out: the label, a value at the right end, − and + steppers, a line under. */
export const FLOW_ROWS = {
  gap: 4,
  subH: 11,
  label: { x: 10, y: 6 },
  sub: { x: 10, y: 2 },
  value: { right: 176, y: 6 },
  stepper: { down: 128, up: 170, hit: 12 },
  greyAlpha: 0.45,
} as const;

/** The dim over whatever a flow screen sits on. */
export const FLOW_DIM = { color: 'ink', alpha: 0.55 } as const;

/** A tablet's padding round its rows and the title card above them. */
export const FLOW_TABLET = { pad: 10, titleH: 22, titleY: 6, noteH: 11 } as const;

/** A short notice (042: "Couldn't save…") in 031's pickup-feed style: a faint tablet with a line of text, below the feed's lines, holding then fading. */
export const NOTICE = { x: 8, y: 104, pad: 3, h: 14, textY: 4, alpha: 0.85, holdMs: 4000, fadeMs: 400 } as const;

/** The Settings tablet: centred, its rows `FLOW_ROWS` apart under a title card. The key list: two columns of rows. */
export const SETTINGS_PANEL = { y: 14, titleH: 24, titleY: 7, pad: 8 } as const;
/** 069: 13 rows a column, so the sandbox's list with the pipette (26 rows) still fits the view. */
export const BINDINGS_PANEL = { y: 22, columnGap: 16, perColumn: 13, titleH: 34, titleY: 6, noteY: 21, pad: 8 } as const;

/** The note (042): a tablet with a title, a text box (an HTML textarea over the canvas) and Save note / Cancel under it. */
export const NOTE_PANEL = { w: 360, x: 140, y: 40, pad: 10, titleY: 8, countY: 10, box: { y: 28, h: 150, padding: 3, zIndex: 10 }, buttonsGap: 8, fontPx: 8, lineHeight: 10 } as const;
