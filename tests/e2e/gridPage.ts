import { expect, type Page } from '@playwright/test';
import { screenPoint } from './foundryPage';

// The grid inventory (047), driven by the mouse: find a stack's slot in the grid, in an open hopper's or crate's
// own row or in the stash's grid (052), and click it (Shift for half, Ctrl for the whole stack).

/** The page point at the centre of the first shown grid slot holding `itemId` (`from: 'container'` for the hopper's or crate's row, `'stash'` for the stash's grid, 052). */
export async function slotPoint(page: Page, itemId: string, from: 'grid' | 'container' | 'stash' = 'grid'): Promise<{ x: number; y: number }> {
  const find = async () => {
    const inv = await page.evaluate(() => window.__GAME__?.ui().inventory);
    return (from === 'grid' ? inv?.slots : from === 'stash' ? inv?.stash : inv?.container)?.find((s) => s.itemId === itemId);
  };
  await expect.poll(async () => (await find()) !== undefined).toBe(true);
  const slot = await find();
  if (!slot) throw new Error(`no ${itemId} slot`);
  return screenPoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);
}

/** Clicks a page point with Shift or Ctrl held, or neither. */
export async function clickWith(page: Page, p: { x: number; y: number }, mod: 'Shift' | 'Control' | null = null): Promise<void> {
  if (mod) await page.keyboard.down(mod);
  await page.mouse.click(p.x, p.y);
  if (mod) await page.keyboard.up(mod);
}

/** Drags from one page point to another with the left button, a few steps on the way. */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}
