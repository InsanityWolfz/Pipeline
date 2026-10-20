import { expect, test, type Page } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { cameraSettled } from './helpers';
import { intoForum } from './hollowsSandbox';

// Review screenshots for 043 (REVIEW_SHOTS=1, into docs/review/043): the Sunken Forum's way
// in sealed by the ley barrier while the Bulwark fights, and the reset after E at the seal
// (the player just outside, the seal gone, the Bulwark back at its start at full health).

const SHOTS = 'docs/review/043';

/** Banners played out fast on the tween clock, so none covers the shot. */
async function noBanners(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            if (window.__GAME__?.ui().landmarks.banner !== null) return false;
            await new Promise((r) => requestAnimationFrame(r));
          }
          return true;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

test.describe('review screenshots (043)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/043');

  test('the sealed door, and the reset after leaving', async ({ page }) => {
    test.setTimeout(120_000);
    await intoForum(page);
    // A step back from the door so the seal shows whole above the player.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(20, { moveY: 1 });
      g.setPlayerHealth(100);
    });
    await noBanners(page);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.seal).toBe('shut');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-sealed-door.png` });

    const left = await page.evaluate((hp) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setEnemyHealth(g.getState().bosses[0]?.id ?? -1, hp);
      // Back up to the seal, then E.
      for (let t = 0; t < 90; t++) {
        g.step(1, { moveY: -1 });
        g.setPlayerHealth(100);
      }
      const b = g.getState();
      const r = g.step(1, { interact: true });
      if (r.events.arenaLeaves.length === 0) throw new Error(JSON.stringify({ p: b.player, a: b.arenas[0]?.sealed, boss: b.bosses[0]?.mode, by: b.bosses[0]?.health }));
      return r;
    }, Math.floor(BULWARK.maxHealth * 0.6));
    expect(left.events.arenaLeaves).toEqual([{ arena: HOLLOWS.arena.id }]);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.seal, { timeout: 10_000 }).toBe('down');
    await cameraSettled(page, 20_000);
    expect((await page.evaluate(() => window.__GAME__?.getState().bosses[0]))?.health).toBe(BULWARK.maxHealth);
    await page.screenshot({ path: `${SHOTS}/02-reset-after-leaving.png` });
  });
});
