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
