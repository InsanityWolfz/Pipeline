import { OVERWORLD } from '../../src/data/overworld';
import { expect, test } from '@playwright/test';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 030 (REVIEW_SHOTS=1, into docs/review/030): each Ley Spring,
// the player healing in a spring with the motes rising, healing in the claimed shrine's
// safe zone with the thread to the pylon, the foundry's shimmer, and the spring on the
// contact sheet. Under the hook the sim holds still between steps, so the healing flag
// (and every effect it drives) stays on while the camera settles.

const SHOTS = 'docs/review/030';
/**
 * The motes and the shimmer advance by a frame's step each drawn frame, so on a slow machine (software rendering, a
 * busy runner) they build up slower than in real time: more than the default 5 s to wait for.
 */
const MOTES_WAIT = { timeout: 20_000 };

test.describe('review screenshots (030)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/030');

  test('each Ley Spring', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    for (const [id, file] of [
      ['west-spring', '01-west-spring'],
      ['south-east-spring', '02-south-east-spring'],
      ['north-spring', '03-north-spring'],
    ] as const) {
      await page.evaluate((springId) => {
        const g = window.__GAME__;
        const h = window.__helpers;
        if (!g || !h) throw new Error('no game');
        const s = g.getState().springs.find((x) => x.id === springId);
        if (!s) throw new Error(`no ${springId}`);
        // Just below the pool, at full health, so the spring shows as it rests.
        h.walkTo((s.tx + 0.5) * 32, (s.ty + 3.2) * 32);
      }, id);
      await cameraSettled(page, 20_000);
      await page.screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });

  test('healing in a spring, motes rising', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.getState().springs.find((x) => x.id === 'west-spring');
      if (!s) throw new Error('no west spring');
      g.setPlayerHealth(30);
      h.walkTo((s.tx + 0.5) * 32, (s.ty + 0.7) * 32);
      if (g.step(10).player.healing !== 'spring') throw new Error('not healing in the spring');
    });
    await cameraSettled(page, 20_000);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.motes ?? 0, MOTES_WAIT).toBeGreaterThan(6);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.poolGlow).toBe('west-spring');
    await page.screenshot({ path: `${SHOTS}/04-healing-in-spring.png` });
  });

  test("healing in the shrine's safe zone, with the thread to the pylon", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate((pylon) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      g.setPlayerHealth(30);
      // Inside the site (055: in by its door), a few tiles down and right of the pylon, on open flagstones.
      h.enterArena('shrine');
      h.walkTo((pylon.tx + 2.5) * 32, (pylon.ty + 3.5) * 32);
      if (g.step(10).player.healing !== 'pylon') throw new Error('not healing in the safe zone');
    }, OVERWORLD.shrine.pylon);
    await cameraSettled(page, 20_000);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.thread).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.motes ?? 0, MOTES_WAIT).toBeGreaterThan(6);
    await page.screenshot({ path: `${SHOTS}/05-healing-in-safe-zone.png` });
  });

  test("the foundry's shimmer", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      // A few tiles in from the door, so the camera isn't against the wall; hurt once there.
      h.walkTo(19.5 * 32, 8.5 * 32);
      g.setPlayerHealth(10);
      if (g.step(1).player.healing !== 'foundry') throw new Error('not healing in the foundry');
    });
    await cameraSettled(page, 20_000);
    // Caught near the middle of its loop, where it's brightest.
    await expect
      .poll(async () => {
        const at = (await page.evaluate(() => window.__GAME__?.ui().healing))?.shimmer ?? null;
        return at !== null && at > 0.35 && at < 0.6;
      }, { intervals: [10], ...MOTES_WAIT })
      .toBe(true);
    await page.screenshot({ path: `${SHOTS}/06-foundry-shimmer.png` });
  });

  test('the Ley Spring on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    await expect(fig('ley-spring')).toBeVisible();
    await fig('ley-spring').screenshot({ path: `${SHOTS}/07-sheet-ley-spring.png` });
  });
});
