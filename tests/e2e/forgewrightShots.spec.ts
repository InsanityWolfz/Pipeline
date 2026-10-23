import { expect, test } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { cameraSettled } from './helpers';
import { fanUntilVent, intoHall } from './forgePage';

// Review screenshots for 060's Forgewright (REVIEW_SHOTS=1, into docs/review/060), in the sandbox's Anvil Hall: plated
// (a fan's middle lane ringing off its body, its boss bar blue, its heat gauge filling), venting with both bellows
// broken (its core aglow through the open plating), and the Forge Flood's pools over the half the player stood in.

const SHOTS = 'docs/review/060';

test.describe('review screenshots (060, the Forgewright)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/060');

  test('the Forgewright plated', async ({ page }) => {
    test.setTimeout(120_000);
    await intoHall(page);
    // A volley or two in flight, its plating sparking, then the sparks held still for the capture.
    const blocks = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let n = 0;
      for (let t = 0; t < 40; t++) {
        const f = g.getState().enemies.find((e) => e.enemyId === 'forgewright');
        n += g.step(1, { fire: true, aimX: f?.x ?? 0, aimY: (f?.y ?? 0) - 24 }).events.blocked.length;
      }
      return n;
    });
    expect(blocks).toBeGreaterThan(0);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/07-forgewright-plated.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('venting with both bellows broken', async ({ page }) => {
    test.setTimeout(120_000);
    await intoHall(page);
    expect(await fanUntilVent(page)).toBeGreaterThan(0);
    await page.evaluate(() => window.__GAME__?.step(20));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.forge).toMatchObject({ core: true, bellows: ['broken', 'broken'] });
    await cameraSettled(page, 20_000);
    // Lets the vent's burst of embers fade so the open core shows (a pause for the picture, not proof of anything).
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/08-forgewright-venting.png` });
  });

  test('the Forge Flood', async ({ page }) => {
    test.setTimeout(180_000);
    await intoHall(page);
    // Its heat fills over 30 s while the player waits on the west half, by the middle; as its hammer rises over that half,
    // the player steps over to the east half, and the pools spread behind them.
    const mid = (ANVIL_ARENA.inside.x0 + ANVIL_ARENA.inside.x1 + 1) / 2;
    const flooded = await page.evaluate(
      ([west, east]) => {
        const g = window.__GAME__;
        const h = window.__helpers;
        if (!g || !h) throw new Error('no game');
        h.walkTo(west.x, west.y);
        let started = false;
        for (let t = 0; t < 4000 && !started; t++) started = g.step(1).events.floodStarts.length > 0;
        h.walkTo(east.x, east.y);
        for (let t = 0; t < 200; t++) if (g.step(1).events.floods.length > 0) return true;
        return g.getState().floodPools.length > 0;
      },
      [
        { x: (mid - 1.5) * 32, y: (ANVIL_ARENA.start.ty + 3.5) * 32 },
        { x: (mid + 2) * 32, y: (ANVIL_ARENA.start.ty + 3.5) * 32 },
      ] as const,
    );
    expect(flooded).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.forge.pools).toBe(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/09-forge-flood.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });
});
