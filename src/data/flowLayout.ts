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
