import { expect, test, type Page } from '@playwright/test';
import { enterFoundry, pieceAt, standStill, state, step, toggleBuild } from './foundryPage';
import { slotPoint } from './gridPage';
import { boot, watchErrors } from './helpers';

// 022, 047: in a hopper's screen (its own row over the grid inventory) a click moves one,
// Shift+click half (rounded up) and Ctrl+click the whole stack, in and out; the screen stays
// open with live counts, and never prints those controls (Shaun). With REVIEW_SHOTS=1 it
// captures docs/review/022.

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

/** Clicks the arrows' stack, in the grid (put) or the hopper's own row (take), as the screen lays it out now, holding the modifiers. */
async function clickRow(page: Page, action: 'take' | 'put', mods: Modifier[] = []): Promise<void> {
  const p = await slotPoint(page, 'arrow', action === 'take' ? 'container' : 'grid');
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

test('a click moves one, Shift+click half and Ctrl+click the stack, in and out, with the hopper\'s screen open throughout', async ({ page }) => {
  // About 25 s alone (the walk into the foundry and a dozen clicks): room for parallel workers.
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await hopperBeside(page);
  const arrows = (await state(page)).inventory.arrow ?? 0;
  expect(arrows).toBe(30);

  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  // No controls printed (Shaun: "don't show those controls on the menu it looks bad").
  expect((await ui(page))?.pickerHint).toBeNull();
  // Only what's in the hopper: nothing yet, though arrows are carried.
  expect((await ui(page))?.pickerCounts).toEqual([]);

  // In: 1, then half of 29 (15), then the other 14.
  await clickRow(page, 'put');
  await expectHopper(page, 1);
  expect((await ui(page))?.pickerOpen).toBe(true);
  // The hopper's row follows: its one stack of 1; the grid's arrows show 29.
  await expect.poll(async () => (await ui(page))?.pickerCounts).toEqual([1]);
  await expect.poll(async () => (await ui(page))?.inventory.slots.find((sl) => sl.itemId === 'arrow')?.count).toBe(29);
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

test('Ctrl+click on the hopper\'s screen is kept from the browser, and the canvas has no context menu', async ({ page }) => {
  test.setTimeout(60_000);
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

  test('the hopper\'s screen (047), after one went in', async ({ page }) => {
    const id = await hopperBeside(page);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
    // Put one in through the hook rather than a click, so no press flash is fading in the picture.
    await step(page, 1, { deposit: { id, itemId: 'arrow', amount: 'one' } });
    await expect.poll(async () => (await ui(page))?.pickerCounts).toEqual([1]);
    const p = await slotPoint(page, 'arrow');
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('pointer');
    await page.screenshot({ path: `${SHOTS}/01-picker-hint.png` });
  });
});
