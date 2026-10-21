import { expect, test, type Page } from '@playwright/test';
import { fixtureDef } from '../../src/sim/fixtures';
import { ITEMS } from '../../src/data/items';
import { screenPoint, state, step } from './foundryPage';
import { clickWith, slotPoint } from './gridPage';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';

// 052 (C.3): E at the stash opens its screen, the stash's own grid (8 wide, scrolling) over the inventory, with the
// same clicks both ways (Shaun). Review shot (REVIEW_SHOTS=1): docs/review/052/04-stash-screen.png.

const SHOTS = 'docs/review/052';
const STASH = fixtureDef('stash');
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Into the foundry from `query`, standing just below the stash, its screen opened with E. */
async function stashOpen(page: Page, query: string): Promise<void> {
  await boot(page, query);
  await page.evaluate(
    ([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      if (g.step(0).room !== 'foundry') h.toFoundry();
      // Past the first walk-in's attune, which holds the player still.
      g.step(200);
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
      g.step(1);
    },
    [STASH.tx, STASH.ty] as const,
  );
  await cameraSettled(page);
  await expect
    .poll(async () => {
      if ((await ui(page))?.inventory.mode === 'stash') return true;
      await page.keyboard.press('e');
      return (await ui(page))?.inventory.mode === 'stash';
    })
    .toBe(true);
}

test('E at the stash opens its screen; a click puts one in, Shift half, Ctrl takes the stack back', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await stashOpen(page, '?start=field');
  const arrows = (await state(page)).inventory.arrow ?? 0;
  expect(arrows).toBe(30);
  expect((await ui(page))?.inventory.stash).toEqual([]);
  await clickWith(page, await slotPoint(page, 'arrow'));
  await expect.poll(async () => (await step(page, 1)).stash.arrow).toBe(1);
  await clickWith(page, await slotPoint(page, 'arrow'), 'Shift');
  await expect.poll(async () => (await step(page, 1)).stash.arrow).toBe(16);
  await expect.poll(async () => (await ui(page))?.inventory.stash.map((s) => [s.itemId, s.count])).toEqual([['arrow', 16]]);
  await clickWith(page, await slotPoint(page, 'arrow', 'stash'), 'Control');
  await expect.poll(async () => (await step(page, 1)).inventory.arrow).toBe(30);
  expect((await state(page)).stash).toEqual({});
  // Walking away closes it.
  await page.evaluate(() => window.__helpers?.walkTo(12.5 * 32, 8.5 * 32));
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(false);
  expect(errors).toEqual([]);
});

test('the stash grid scrolls by rows under the wheel, apart from the inventory', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await stashOpen(page, '?playtest');
  // Every kind carried goes in: far more stacks than its three rows show.
  await page.evaluate((ids) => {
    for (const itemId of ids) window.__GAME__?.step(1, { stashPut: { itemId, amount: 'all' } });
  }, Object.keys(ITEMS));
  await expect.poll(async () => (await ui(page))?.inventory.stashRows ?? 0).toBeGreaterThan(3);
  const first = (await ui(page))?.inventory.stash[0];
  if (!first) throw new Error('no stash slot');
  const over = await screenPoint(page, first.x + first.w / 2, first.y + first.h / 2);
  await page.mouse.move(over.x, over.y);
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => (await ui(page))?.inventory.stashScroll).toBe(1);
  expect((await ui(page))?.inventory.scroll).toBe(0);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (052)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/052');

  test('the stash screen', async ({ page }) => {
    test.setTimeout(90_000);
    await stashOpen(page, '?playtest');
    await page.evaluate(() => {
      for (const itemId of ['wood', 'stone', 'fiber', 'ley-crystal', 'husk-resin', 'shaft', 'arrowhead', 'rope', 'casing', 'fuse', 'ley-dust', 'arrow', 'bomb'])
        window.__GAME__?.step(1, { stashPut: { itemId, amount: 'all' } });
    });
    await quietScreen(page);
    const p = await slotPoint(page, 'arrow', 'stash');
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('pointer');
    await page.screenshot({ path: `${SHOTS}/04-stash-screen.png` });
  });
});
