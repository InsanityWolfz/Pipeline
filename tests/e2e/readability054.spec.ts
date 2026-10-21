import { expect, test, type Page } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { frames, intoForum, sandbox, spawn, stepUntil } from './hollowsSandbox';

// 054: combat readability, as drawn. A burrowed Burrower's bar reads immune (blue, with its shield) and goes back as it
// surfaces; the Bulwark's back wave shades its area; a star shot's Shards are drawn in flight.

const barOf = (page: Page, id: number) => page.evaluate((eid) => window.__GAME__?.ui().enemyBars.find((b) => b.id === eid) ?? null, id);

test('a burrowed Burrower’s bar reads immune, and goes back once it surfaces', async ({ page }) => {
  test.setTimeout(120_000);
  await sandbox(page);
  const id = await spawn(page, 'burrower', 120, 40);
  await frames(page);
  expect(await barOf(page, id)).toMatchObject({ shown: false, immune: false });
  await stepUntil(page, id, 'chase', 5);
  expect(await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.immune, id)).toBe(true);
  await expect.poll(() => barOf(page, id)).toMatchObject({ shown: true, immune: true });
  await stepUntil(page, id, 'recover', 1);
  await frames(page);
  await expect.poll(() => barOf(page, id)).toMatchObject({ immune: false });
});

test('the Bulwark’s back wave shades its area while it builds', async ({ page }) => {
  test.setTimeout(120_000);
  await intoForum(page);
  const building = await page.evaluate((every) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < every * 3; t++) {
      const s = g.step(1);
      g.setPlayerHealth(100);
      if ((s.bosses[0]?.waveTicks ?? 0) > 4) return true;
    }
    return false;
  }, BULWARK.wave.everyTicks);
  expect(building).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.waveShades)).toBe(1);
});
