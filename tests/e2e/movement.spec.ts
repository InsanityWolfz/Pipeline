import { expect, test, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function boot(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__ !== undefined);
  // step(0) takes the sim off the real-time loop, so nothing ticks between reads.
  await page.evaluate(() => window.__GAME__?.step(0));
}

const state = (page: Page) => page.evaluate(() => window.__GAME__?.getState());

test('walks right under a held command', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const start = await state(page);
  const after = await page.evaluate(() => window.__GAME__?.step(60, { moveX: 1 }));
  // 60 ticks at 2 px/tick, less a few px of acceleration.
  expect((after?.player.x ?? 0) - (start?.player.x ?? 0)).toBeGreaterThan(110);
  expect((after?.player.x ?? 0) - (start?.player.x ?? 0)).toBeLessThanOrEqual(120);
  expect(after?.player.y).toBe(start?.player.y);
  expect(after?.player.facing).toBe('right');
  expect(errors).toEqual([]);
});

test('rolls with invulnerability, then cools down', async ({ page }) => {
  await boot(page);
  const rolling = await page.evaluate(() => window.__GAME__?.step(1, { moveX: -1, dodge: true }));
  expect(rolling?.player).toMatchObject({ rolling: true, invulnerable: true });
  const done = await page.evaluate(() => window.__GAME__?.step(18));
  expect(done?.player.rolling).toBe(false);
  expect(done?.player.invulnerable).toBe(false);
  expect(done?.player.rollCooldown).toBeGreaterThan(0);
});

test('stops at the room wall', async ({ page }) => {
  await boot(page);
  const at500 = await page.evaluate(() => window.__GAME__?.step(500, { moveX: -1 }));
  const at600 = await page.evaluate(() => window.__GAME__?.step(100, { moveX: -1 }));
  expect(at600?.player.x).toBe(at500?.player.x);
  expect(at600?.player.vx).toBe(0);
});

test('loads straight-down from the URL and V swaps views without moving the player', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?view=top');
  const top = await page.evaluate(() => window.__GAME__?.step(30, { moveX: 1, moveY: 1 }));
  expect(top?.view).toBe('top');
  await page.keyboard.press('v');
  const swapped = await state(page);
  expect(swapped?.view).toBe('34');
  expect(swapped?.player).toEqual(top?.player);
  const back = await page.evaluate(() => window.__GAME__?.setView('top'));
  expect(back?.view).toBe('top');
  expect(errors).toEqual([]);
});
