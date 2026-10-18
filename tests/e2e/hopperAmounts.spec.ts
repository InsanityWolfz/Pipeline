import { expect, test, type Page } from '@playwright/test';
import { PICKER_LAYOUT } from '../../src/data/hudLayout';
import { pickerEntries, pickerRows } from '../../src/render/foundryLayout';
import { enterFoundry, pieceAt, screenPoint, standStill, state, step, toggleBuild } from './foundryPage';
import { boot, watchErrors } from './helpers';

// 022: in the hopper picker a click moves one, Shift+click half (rounded up) and
// Ctrl+click the whole stack, in and out; the picker stays open with live counts
// and a hint line. With REVIEW_SHOTS=1 it captures docs/review/022.

const SHOTS = 'docs/review/022';
const HOPPER = { tx: 12, ty: 8 } as const;
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

type Modifier = 'Shift' | 'Control';

/** The foundry with a hopper beside the player (out of build mode), and its piece id. */
async function hopperBeside(page: Page): Promise<number> {
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  await toggleBuild(page);
  await step(page, 1, { place: { pieceId: 'hopper', ...HOPPER, facing: 'down' } });
  const s = await toggleBuild(page);
  expect(s.building).toBe(false);
  const h = pieceAt(s, HOPPER.tx, HOPPER.ty);
  if (h?.kind !== 'hopper') throw new Error('no hopper');
  return h.id;
}

/** The hopper's item and count. */
async function hopper(page: Page): Promise<{ item: string | null; count: number }> {
  const h = pieceAt(await state(page), HOPPER.tx, HOPPER.ty);
  if (h?.kind !== 'hopper') throw new Error('no hopper');
  return { item: h.item, count: h.count };
}

/** Clicks the picker's row for an action on arrows, as the menu lays it out now, holding the modifiers. */
async function clickRow(page: Page, action: 'take' | 'put', mods: Modifier[] = []): Promise<void> {
  const s = await state(page);
  const row = pickerRows(pickerEntries(await hopper(page), s.inventory)).find((r) => r.action === action && r.itemId === 'arrow');
  if (!row) throw new Error(`no ${action} row`);
  const p = await screenPoint(page, row.x + 40, row.y + row.h / 2);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.click(p.x, p.y);
  for (const m of mods) await page.keyboard.up(m);
}

/** Ticks until the hopper holds `count` (the click's choice reaches the sim on the next tick). */
async function expectHopper(page: Page, count: number): Promise<void> {
  await expect
    .poll(async () => {
      await step(page, 1);
      return (await hopper(page)).count;
    })
    .toBe(count);
}

test('a click moves one, Shift+click half and Ctrl+click all, in and out, with the picker open throughout', async ({ page }) => {
  const errors = watchErrors(page);
  await hopperBeside(page);
  const arrows = (await state(page)).inventory.arrow ?? 0;
  expect(arrows).toBe(30);

  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  expect((await ui(page))?.pickerHint).toBe('Click 1 · Shift half · Ctrl all');
  expect(PICKER_LAYOUT.hint.text).toBe('Click 1 · Shift half · Ctrl all');

  // In: 1, then half of 29 (15), then the other 14.
  await clickRow(page, 'put');
  await expectHopper(page, 1);
  expect((await ui(page))?.pickerOpen).toBe(true);
  await clickRow(page, 'put', ['Shift']);
  await expectHopper(page, 16);
  expect((await state(page)).inventory.arrow).toBe(14);
  await clickRow(page, 'put', ['Control']);
  await expectHopper(page, 30);
  expect((await state(page)).inventory.arrow ?? 0).toBe(0);
  expect((await ui(page))?.pickerOpen).toBe(true);

  // Out: 1, then half of 29 (15), then Ctrl+Shift (Ctrl wins) the other 14, and the hopper forgets arrows.
  await clickRow(page, 'take');
  await expectHopper(page, 29);
  await clickRow(page, 'take', ['Shift']);
  await expectHopper(page, 14);
  expect(await hopper(page)).toEqual({ item: 'arrow', count: 14 });
  await clickRow(page, 'take', ['Control', 'Shift']);
  await expectHopper(page, 0);
  expect(await hopper(page)).toEqual({ item: null, count: 0 });
  expect((await state(page)).inventory.arrow).toBe(30);
  expect((await ui(page))?.pickerOpen).toBe(true);
  expect(errors).toEqual([]);
});

test('Ctrl+click on the picker is kept from the browser, and the canvas has no context menu', async ({ page }) => {
  const errors = watchErrors(page);
  await hopperBeside(page);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  // Record, after the game's own handlers, whether each Ctrl mouse press (the event the game reads, and
  // whose default a browser acts on) and each context menu was default-prevented.
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { __presses: string[] }).__presses = log;
    for (const type of ['mousedown', 'contextmenu'])
      window.addEventListener(type, (e) => {
        if ((e as MouseEvent).ctrlKey || type === 'contextmenu') log.push(`${type}:${e.defaultPrevented}`);
      });
  });
  await clickRow(page, 'put', ['Control']);
  await expectHopper(page, 30);
  // A right click (and a Mac's Ctrl+click) opens a context menu by default: the canvas refuses it.
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  await page.keyboard.down('Control');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await page.keyboard.up('Control');
  const presses = await page.evaluate(() => (window as unknown as { __presses: string[] }).__presses);
  expect(presses).toEqual(['mousedown:true', 'mousedown:true', 'contextmenu:true']);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (022)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/022');

  test('the hopper picker with its hint, after a click put one in', async ({ page }) => {
    await hopperBeside(page);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
    await clickRow(page, 'put');
    await expectHopper(page, 1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/01-picker-hint.png` });
  });
});
