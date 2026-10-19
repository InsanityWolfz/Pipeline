import { expect, test, type Page } from '@playwright/test';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, watchErrors } from './helpers';
import { screenPoint, step } from './foundryPage';

// The legibility UI (040): with ?playtest, a hover summary on the arrow's hotbar slot, the
// breakdown while Shift is held, a talent's bonus showing in the numbers, the Build tab's
// rows and their breakdown, a chip opening its glossary entry without firing, no breakdown
// anywhere without Shift, and an enemy's status chips on its hover name.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Moves the real mouse to a view point. */
async function hover(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.move(p.x, p.y);
}

/** The arrow's hotbar slot, view px. */
function arrowSlot(): { x: number; y: number; w: number; h: number } {
  const cell = hotbarCells().find((c) => c.ammoId === 'arrow');
  if (!cell) throw new Error('no arrow slot');
  return cell;
}

test('hovering the arrow’s hotbar slot shows its summary; Shift shows the breakdown, releasing it the summary again', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await step(page, 1);
  const slot = arrowSlot();
  await hover(page, slot.x + slot.w / 2, slot.y + slot.h / 2);
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
  let tip = (await ui(page))?.tip;
  expect(tip?.source).toEqual({ kind: 'round', id: 'arrow' });
  expect(tip?.chips).toEqual(['arrow', 'shot', 'pierce', 'knockback', 'physical']);
  expect(tip?.lines[0]).toMatch(/^\d+(\.\d)? dmg · \d\.\d\/s$/);
  // It sits above the slot, inside the view.
  expect((tip?.box.y ?? 0) + (tip?.box.h ?? 0)).toBeLessThanOrEqual(slot.y);
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('breakdown');
  tip = (await ui(page))?.tip;
  expect(tip?.lines[0]).toMatch(/^Damage 10/);
  expect(tip?.lines.some((l) => l.startsWith('Linked:'))).toBe(true);
  expect(tip?.box.w).toBeLessThanOrEqual(280);
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
  expect(errors).toEqual([]);
});
