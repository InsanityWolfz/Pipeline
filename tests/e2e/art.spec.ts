import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import type {} from '../../src/render/testHook';

// 016: the game draws at the device's resolution with vector art, and the tube is heavy.

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function boot(page: Page, query = '?start=field'): Promise<void> {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__ !== undefined);
  await page.evaluate(() => window.__GAME__?.step(0));
}

test('boots with vector textures, no console errors, and a backbuffer at the device resolution', async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(30, { fire: true, moveX: 1 }));
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { width: c.width, css: c.getBoundingClientRect().width } : null;
  });
  // A whole-number CSS zoom of the 640-wide view, drawn at that many device pixels per view pixel.
  expect(canvas?.css).toBe(VIEW_WIDTH * 2);
  expect(canvas?.width).toBe(VIEW_WIDTH * 2 * (await page.evaluate(() => window.devicePixelRatio)));
  expect(errors).toEqual([]);
});

test('walking while firing covers less ground than walking', async ({ page }) => {
  await boot(page);
  const walked = (fire: boolean) =>
    page.evaluate((fire) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const before = g.getState().player;
      const after = g.step(40, { moveX: 1, fire, aimX: before.x + 300, aimY: before.y }).player;
      g.step(40, { moveX: -1 });
      return after.x - before.x;
    }, fire);
  const plain = await walked(false);
  const firing = await walked(true);
  expect(firing).toBeLessThan(plain * 0.8);
  expect(firing).toBeGreaterThan(plain * 0.4);
});
