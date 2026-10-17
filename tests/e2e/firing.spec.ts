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
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__ !== undefined);
  // step(0) takes the sim off the real-time loop, so nothing ticks between reads.
  await page.evaluate(() => window.__GAME__?.step(0));
}

/** Taps load and waits until the tube is full. */
async function loadFull(page: Page) {
  await page.evaluate(() => window.__GAME__?.step(1, { load: true }));
  return page.evaluate(() => window.__GAME__?.step(90));
}

/** Holds fire for `frames` ticks, aimed `dx, dy` px from the player's feet. */
function fire(page: Page, frames: number, dx: number, dy: number) {
  return page.evaluate(
    ({ frames, dx, dy }) => {
      const p = window.__GAME__?.getState().player;
      if (!p) throw new Error('no game');
      return window.__GAME__?.step(frames, { fire: true, aimX: p.x + dx, aimY: p.y + dy });
    },
    { frames, dx, dy },
  );
}

test('loads the tube from the inventory', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const start = await page.evaluate(() => window.__GAME__?.getState());
  expect(start?.tube).toMatchObject({ loaded: 0, capacity: 6 });
  expect(start?.inventory.arrow).toBe(30);
  const full = await loadFull(page);
  expect(full?.tube).toMatchObject({ loaded: 6, loading: false });
  expect(full?.inventory.arrow).toBe(24);
  expect(errors).toEqual([]);
});

test('fires an arrow that flies toward the aim', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await loadFull(page);
  const shot = await fire(page, 1, 200, 0);
  expect(shot?.arrows).toHaveLength(1);
  expect(shot?.tube.loaded).toBe(5);
  expect(shot?.player.facing).toBe('right');
  const x0 = shot?.arrows[0]?.x ?? 0;
  const later = await page.evaluate(() => window.__GAME__?.step(10));
  expect((later?.arrows[0]?.x ?? 0) - x0).toBe(80);
  expect(later?.arrows[0]?.y).toBe(shot?.arrows[0]?.y);
  expect(errors).toEqual([]);
});

test('arrows stop at a ruin block before their range', async ({ page }) => {
  await boot(page);
  await loadFull(page);
  // The ruin blocks at tiles (12-13, 20) sit about 220 px left of and below the spawn.
  const shot = await page.evaluate(() => window.__GAME__?.step(1, { fire: true, aimX: 416, aimY: 656 }));
  expect(shot?.arrows).toHaveLength(1);
  let ticks = 0;
  for (; ticks < 40; ticks++) {
    const s = await page.evaluate(() => window.__GAME__?.step(1));
    if (s?.arrows.length === 0) break;
  }
  expect(ticks).toBeLessThan(35);
});

test('an empty tube dry-fires', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await loadFull(page);
  const emptied = await fire(page, 15 * 5 + 1, 0, 100);
  expect(emptied?.tube.loaded).toBe(0);
  const dry = await fire(page, 15, 0, 100);
  expect(dry?.tube).toMatchObject({ loaded: 0, dryFire: true, loading: false });
  expect(dry?.inventory.arrow).toBe(24);
  expect(errors).toEqual([]);
});
