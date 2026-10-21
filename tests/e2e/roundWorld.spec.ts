import { expect, test } from '@playwright/test';
import { itemDef } from '../../src/data/items';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, watchErrors } from './helpers';

// The round world (053) in the game: a claimed pylon's haul runs home along its ley line as the icons of its raws
// (D.4), and the overworld builds only the ground near the camera.

test("a claimed shrine's ley line carries its raws home as their icons", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.claim('shrine');
    g.step(1);
  });
  // The ports' first push sends one haul per raw the shrine supplies; each shows as its raw's icon once it leaves.
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.__GAME__?.step(20));
        const flying = (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight ?? [];
        return flying.filter((m) => m.site === 'shrine' && m.iconShown).length;
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);
  const flying = (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight ?? [];
  for (const m of flying) expect(m.icon, m.itemId).toBe(itemDef(m.itemId).icon);
  expect(OVERWORLD.leyLines.shrine.length).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});

test('the overworld builds its ground near the camera only, and builds it again where the player goes', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const chunks = () => page.evaluate(() => window.__GAME__?.ui().overworldChunks ?? 0);
  await expect.poll(chunks).toBeGreaterThan(0);
  // The whole world is 9 × 9 chunks; a view and its margin is far fewer.
  expect(await chunks()).toBeLessThan(30);
  await page.evaluate(() => window.__helpers?.walkTo(82 * 32, 128 * 32));
  await expect.poll(chunks).toBeGreaterThan(0);
  expect(await chunks()).toBeLessThan(30);
  expect(errors).toEqual([]);
});
