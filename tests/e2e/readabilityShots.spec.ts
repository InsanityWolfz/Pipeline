import { expect, test, type Page } from '@playwright/test';
import { CACHE_BURST } from '../../src/data/landmarks';
import { boot, cameraSettled } from './helpers';
import { enterFoundry } from './foundryPage';
import { intoForum } from './hollowsSandbox';
import { atLeyVein, openCache } from './readabilityPage';

// Review screenshots for 045 (REVIEW_SHOTS=1, into docs/review/045): the red HP bar, the E
// prompt over a ley crystal vein, the build controls strip, a cache's loot bursting out (in
// flight, then landed with names), and the E prompt over the Bulwark's sealed door.

const SHOTS = 'docs/review/045';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Banners (a landmark's or a schematic's) played out fast on the tween clock, so none covers the shot. */
async function noBanners(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            const u = window.__GAME__?.ui();
            if (u?.landmarks.banner !== null || u.schematics.banner !== null) return false;
            await new Promise((r) => requestAnimationFrame(r));
          }
          return true;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

test.describe('review screenshots (045)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/045');

  test('the red HP bar, full and at 72', async ({ page }) => {
    await boot(page, '?start=field');
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/01-hp-bar-full.png` });
    await page.evaluate(() => window.__GAME__?.setPlayerHealth(72));
    await expect.poll(async () => (await ui(page))?.health.text).toBe('72 / 100');
    // Past the white chunk's drain.
    await expect.poll(async () => (await ui(page))?.health.chunk).toBe(0);
    const box = (await ui(page))?.health.box;
    const canvas = await page.locator('canvas').boundingBox();
    if (!box || !canvas) throw new Error('no view');
    const k = canvas.width / 640;
    await page.screenshot({ path: `${SHOTS}/02-hp-bar-72.png`, clip: { x: canvas.x + (box.x - 4) * k, y: canvas.y + (box.y - 4) * k, width: (box.w + 8) * k, height: (box.h + 8) * k } });
  });

  test('the E prompt over a ley crystal vein', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?start=field');
    await page.evaluate(() => window.__GAME__?.completeObjectives(2));
    await atLeyVein(page);
    await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('node');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-ley-vein-prompt.png` });
  });

  test('the build controls strip over the build bar', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?playtest');
    await enterFoundry(page);
    await page.keyboard.press('b');
    await page.evaluate(() => window.__GAME__?.step(1));
    await expect.poll(async () => (await ui(page))?.buildBar?.strip.shown).toBe(true);
    await noBanners(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-build-strip.png` });
  });

  test("a cache's loot bursting out, then landed with names", async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page);
    await openCache(page);
    await page.evaluate((n) => window.__GAME__?.step(n), CACHE_BURST.flightTicks / 2 + CACHE_BURST.staggerTicks);
    await noBanners(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/05-cache-burst-flight.png` });
    await page.evaluate((n) => window.__GAME__?.step(n), CACHE_BURST.flightTicks + 2 * CACHE_BURST.staggerTicks);
    await expect.poll(async () => (await ui(page))?.groundItems.filter((g) => g.name !== null).length).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/06-cache-burst-landed.png` });
  });

  test("the E prompt over the Bulwark's sealed door", async ({ page }) => {
    test.setTimeout(150_000);
    await intoForum(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 60; t++) {
        g.step(1, { moveY: -1 });
        g.setPlayerHealth(100);
      }
    });
    await noBanners(page);
    await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('arena-door');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/07-sealed-door-prompt.png` });
  });
});
