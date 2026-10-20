// Reading a mouse press off its DOM event (022). Pure, so Vitest can check it.

/** The modifier keys held with a click (022: Shift and Ctrl pick how many a hopper click moves). */
export interface ClickMods {
  shift: boolean;
  ctrl: boolean;
}

/** The modifiers on a press's DOM event. */
export function clickMods(event: { shiftKey: boolean; ctrlKey: boolean }): ClickMods {
  return { shift: event.shiftKey, ctrl: event.ctrlKey };
}

/**
 * Whether a press is a left click. On macOS Phaser reports Ctrl+left-click as a
 * right click, so with Ctrl held the DOM event's button decides; otherwise (and
 * for a touch, which has no button) Phaser's own `leftDown` does.
 */
export function isLeftPress(event: { button?: number; ctrlKey: boolean }, leftDown: boolean): boolean {
  if (event.ctrlKey && typeof event.button === 'number') return event.button === 0;
  return leftDown;
}

/** What the scene tells the controls each frame about build mode and the screen's UI. */
export interface BuildInput {
  building: boolean;
  /** The piece selected on the build bar, read at click time (a bar click can land in the same frame). */
  pieceId: () => string;
  /** True over the build bar, the menus or the grid inventory, where clicks don't reach the world. */
  overUi: (x: number, y: number) => boolean;
  /** Handles a left click on that UI at once, so a world click in the same frame sees its result; with the held modifiers (022). */
  clickUi: (x: number, y: number, mods: ClickMods) => void;
  /** The left button came up after a press on the UI (047: a grid slot's click, or a stack dropped on the carried bar). */
  releaseUi?: (x: number, y: number) => void;
}
