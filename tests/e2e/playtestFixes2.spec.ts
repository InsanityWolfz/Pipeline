import { expect, test, type Page } from '@playwright/test';
import { centre, enterFoundry, pieceAt, standStill, state, step, toggleBuild } from './foundryPage';
import { boot, watchErrors } from './helpers';

// 050: Shaun's live-playtest fixes (docs/specs/050-playtest-fixes-2.md), checked in the running game.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('E opens the hopper under the cursor within 3 tiles, not the nearest; E closes its screen and the inventory (050 A.8, A.9)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  // Beside the player (STAND is 11,8), and two tiles off to the right.
  await toggleBuild(page);
  await step(page, 1, { place: { pieceId: 'hopper', tx: 12, ty: 8, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'hopper', tx: 13, ty: 10, facing: 'down' } });
  const s = await toggleBuild(page);
  const near = pieceAt(s, 12, 8);
  const far = pieceAt(s, 13, 10);
  if (near?.kind !== 'hopper' || far?.kind !== 'hopper') throw new Error('no hoppers');
  await step(page, 1, { deposit: { id: far.id, itemId: 'arrow', amount: 'one' } });
  expect(pieceAt(await state(page), 13, 10)).toMatchObject({ item: 'arrow', count: 1 });

  // The cursor on the far hopper: E opens its screen (its one arrow), not the near one's (empty).
  const aim = centre(13, 10);
  await step(page, 1, { aimX: aim.x, aimY: aim.y });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerCounts).toEqual([1]);
  // E again closes it, as Esc does.
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(false);

  // The cursor on nothing: E falls back to the nearest (the empty one).
  const off = centre(8, 12);
  await step(page, 1, { aimX: off.x, aimY: off.y });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  expect((await ui(page))?.pickerCounts).toEqual([]);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(false);

  // The plain inventory: E closes it too.
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(false);
  expect(errors).toEqual([]);
});
