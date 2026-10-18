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

async function boot(page: Page): Promise<void> {
  await page.goto('/?start=field');
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
  // The overworld's west edge (017) is about 600 ticks' walk from the start.
  const at700 = await page.evaluate(() => window.__GAME__?.step(700, { moveX: -1 }));
  const at800 = await page.evaluate(() => window.__GAME__?.step(100, { moveX: -1 }));
  expect(at800?.player.x).toBe(at700?.player.x);
  expect(at800?.player.vx).toBe(0);
});
