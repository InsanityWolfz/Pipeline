import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { bootTitle, clickRow, flowIs } from './flowPage';

// 042: the shipped game boots to the title; New game reaches play; Quit's farewell card; the camera locks to the player.

test('the plain URL shows the title, Continue greyed with clean storage, and New game reaches play', async ({ page }) => {
  const errors = watchErrors(page);
  await bootTitle(page);
  const title = await page.evaluate(() => window.__GAME__?.ui().flow.title);
  expect(title?.rows.map((r) => r.label)).toEqual(['New game', 'Continue', 'Settings', 'Quit']);
  expect(title?.rows.find((r) => r.id === 'continue')?.usable).toBe(false);
  expect(await page.evaluate(() => window.__GAME__?.getState())).toBeNull();
  await clickRow(page, 'newGame');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  // The real start (012): waking by the tube's stone without the tube.
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  expect(s?.hasTube).toBe(false);
  expect(await page.evaluate(() => window.__GAME__?.ui().flow.title)).toBeNull();
  expect(errors).toEqual([]);
});

test("Quit shows the farewell card, and Back returns to the title", async ({ page }) => {
  await bootTitle(page);
  await clickRow(page, 'quit');
  await flowIs(page, 'farewell');
  const card = await page.evaluate(() => window.__GAME__?.ui().flow.card);
  expect(card?.lines).toEqual(['Thanks for playing. You can close this tab now.']);
  await clickRow(page, 'farewellBack');
  await flowIs(page, 'title');
});

test('the camera locks to the player: walking, rolling and firing for 120 frames', async ({ page }) => {
  // 240 real animation frames: about 4 s at 60 fps, but about 17 s on a machine whose browser draws 14 fps
  // (measured 2026-10-20 in a fresh cloud container). The default 30 s left no room for the boot.
  test.setTimeout(90_000);
  await boot(page, '?start=field&attuned');
  const off = await page.evaluate(async () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    let worst = 0;
    for (let i = 0; i < 120; i++) {
      g.step(1, { moveX: i < 60 ? 1 : -1, moveY: i % 40 < 20 ? 1 : 0, fire: true, dodge: i === 30, aimX: g.getState().player.x + 50, aimY: g.getState().player.y });
      // The camera follows on the next render: wait a frame, then compare its centre with the player's sprite point.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const cam = g.ui().camera;
      worst = Math.max(worst, Math.hypot(cam.x - cam.player.x, cam.y - cam.player.y));
    }
    return worst;
  });
  expect(off).toBeLessThan(1);
});
