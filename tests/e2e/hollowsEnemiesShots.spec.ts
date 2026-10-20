import { expect, test } from '@playwright/test';
import { frames, sandbox, spawn, stepUntil } from './hollowsSandbox';

// Review screenshots for 035 (REVIEW_SHOTS=1, into docs/review/035): each of Region 2's
// enemies idle and mid-telegraph (the lane, the ring with the ripple, the bash arc, the
// laser tracking and locked), a champion Shardback, a mixed pack, and the rigs on the
// contact sheet. Under the hook the sim holds still between steps, so a telegraph holds.

const SHOTS = 'docs/review/035';

test.describe('review screenshots (035)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/035');

  test('the Charger idle, then pawing with its lane two thirds full', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    const id = await spawn(page, 'charger', 150, -20);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/01-charger-idle.png` });
    await stepUntil(page, id, 'windup', 30);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/02-charger-lane.png` });
  });

  test('the Burrower idle, its ripple tunnelling, then its ring growing over the still ripple', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    const id = await spawn(page, 'burrower', 120, 40);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/03-burrower-idle.png` });
    await stepUntil(page, id, 'chase', 25);
    await frames(page, 8);
    await page.screenshot({ path: `${SHOTS}/04-burrower-ripple.png` });
    await stepUntil(page, id, 'windup', 1);
    // A step aside, still inside the ring, so the ripple under it shows.
    await page.evaluate(() => window.__GAME__?.step(8, { moveX: -1 }));
    await stepUntil(page, id, 'windup', 34);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/05-burrower-ring.png` });
  });

  test('the Shardback idle, then its bash arc mid-wind-up with its crystals flaring', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    const id = await spawn(page, 'shardback', 90, 0);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/06-shardback-idle.png` });
    // It walks in and turns to face the player, then winds up.
    await stepUntil(page, id, 'windup', 28);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/07-shardback-bash-arc.png` });
  });

  test('a champion Shardback: bigger, its shield and hurtbox with it, its glow and name', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    await spawn(page, 'shardback', 110, 0, true);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().champions.length)).toBe(1);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/08-shardback-champion.png` });
  });

  test('the Sniper construct idle, its laser tracking, then locked and blinking on', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    const id = await spawn(page, 'sniper', 200, -40);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/09-sniper-idle.png` });
    await stepUntil(page, id, 'windup', 30);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.lasers[0]?.locked)).toBe(false);
    await page.screenshot({ path: `${SHOTS}/10-sniper-tracking.png` });
    await stepUntil(page, id, 'windup', 62);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.lasers[0])).toMatchObject({ locked: true, on: true });
    await page.screenshot({ path: `${SHOTS}/11-sniper-locked.png` });
  });

  test('a mixed Region 2 pack closing in: a Shardback in front, Chargers on the flanks, a Burrower going under, a Sniper hanging back', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    // Kept below the objective line and the minimap in the view's top right.
    for (const [id, dx, dy] of [
      ['shardback', 150, 10],
      ['charger', 170, -35],
      ['charger', 180, 85],
      ['burrower', 200, 40],
      ['sniper', 260, 0],
    ] as const)
      await spawn(page, id, dx, dy);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 34; t++) {
        g.step(1);
        g.setPlayerHealth(100);
      }
    });
    await frames(page, 6);
    await page.screenshot({ path: `${SHOTS}/12-mixed-pack.png` });
  });

  test('the rigs on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    for (const id of ['charger', 'burrower', 'shardback', 'sniper']) {
      await expect(row(id)).toBeVisible();
      await row(id).screenshot({ path: `${SHOTS}/sheet-${id}.png` });
    }
  });
});
