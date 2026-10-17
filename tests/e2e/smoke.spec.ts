import { expect, test } from '@playwright/test';
import type {} from '../../src/render/testHook';

test('boots, exposes the test hook and steps exactly', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/?seed=123');
  await page.waitForFunction(() => window.__GAME__ !== undefined);

  // step(0) takes the sim off the real-time loop, so nothing ticks between reads.
  await page.evaluate(() => window.__GAME__?.step(0));
  const start = await page.evaluate(() => window.__GAME__?.getState());
  expect(start?.seed).toBe(123);
  expect(typeof start?.tick).toBe('number');

  const after = await page.evaluate(() => window.__GAME__?.step(60));
  expect(after?.tick).toBe((start?.tick ?? 0) + 60);

  await page.waitForTimeout(500);
  const later = await page.evaluate(() => window.__GAME__?.getState());
  expect(later?.tick).toBe(after?.tick);

  expect(errors).toEqual([]);
});
