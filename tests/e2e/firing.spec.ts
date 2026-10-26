import { expect, test, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';
import { MELEE } from '../../src/data/combat';

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
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  // step(0) takes the sim off the real-time loop, so nothing ticks between reads.
  await page.evaluate(() => window.__GAME__?.step(0));
}

/** Holds right click (047: the carried bar's selected item) for `frames` ticks, aimed `dx, dy` px from the player's feet; `left` holds left click instead. */
function fire(page: Page, frames: number, dx: number, dy: number, left = false) {
  return page.evaluate(
    ({ frames, dx, dy, left }) => {
      const p = window.__GAME__?.getState().player;
      if (!p) throw new Error('no game');
      return window.__GAME__?.step(frames, { [left ? 'fire' : 'use']: true, aimX: p.x + dx, aimY: p.y + dy });
    },
    { frames, dx, dy, left },
  );
}

test('fires carried arrows straight from the inventory', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const start = await page.evaluate(() => window.__GAME__?.getState());
  expect(start?.inventory.arrow).toBe(30);
  expect(start?.link).toMatchObject({ attuned: false });
  expect(start?.intake.entrances.map((e) => e.count)).toEqual([0, 0, 0, 0, 0]);
  const shot = await fire(page, 1, 200, 0);
  expect(shot?.inventory.arrow).toBe(29);
  expect(shot?.tube.fromReservoir).toBe(false);
  expect(errors).toEqual([]);
});

test('fires an arrow that flies toward the aim', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const shot = await fire(page, 1, 200, 0);
  expect(shot?.arrows).toHaveLength(1);
  expect(shot?.inventory.arrow).toBe(29);
  expect(shot?.player.facing).toBe('right');
  const x0 = shot?.arrows[0]?.x ?? 0;
  const later = await page.evaluate(() => window.__GAME__?.step(10));
  expect((later?.arrows[0]?.x ?? 0) - x0).toBe(80);
  expect(later?.arrows[0]?.y).toBe(shot?.arrows[0]?.y);
  expect(errors).toEqual([]);
});

test('arrows stop at a wall before their range', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  // Walk to the overworld's west edge (017), then fire into its border trees.
  await page.evaluate(() => window.__GAME__?.step(700, { moveX: -1 }));
  await page.evaluate(() => window.__GAME__?.step(10));
  const shot = await fire(page, 1, -100, 0);
  expect(shot?.arrows).toHaveLength(1);
  let ticks = 0;
  for (; ticks < 40; ticks++) {
    const s = await page.evaluate(() => window.__GAME__?.step(1));
    if (s?.arrows.length === 0) break;
  }
  expect(ticks).toBeLessThan(35);
  expect(errors).toEqual([]);
});

test('left click punches with the intake dry once the carried arrows run out (023, 047)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const emptied = await fire(page, 15 * 29 + 1, 0, 100);
  expect(emptied?.inventory.arrow).toBe(0);
  // The punch waits out the last shot's interval, then lands on the 15th tick.
  const punched = await fire(page, 15, 0, 100, true);
  expect(punched?.events.melees).toHaveLength(1);
  expect(punched?.events.shots).toHaveLength(0);
  expect(punched?.tube).toMatchObject({ meleeCooldown: MELEE.cooldownTicks, firing: false });
  expect(punched?.inventory.arrow).toBe(0);
  expect(errors).toEqual([]);
});
