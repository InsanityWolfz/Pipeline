import { expect, test, type Page } from '@playwright/test';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { clickRow, clickView, flowIs } from './flowPage';
import { frames } from './hollowsSandbox';
import { bootSandbox } from './sandboxPage';
import { sniperAt, stepUntilThreat, toggleWarnings } from './threatsPage';

// Review screenshots for 071 (REVIEW_SHOTS=1, into docs/review/071), in the sandbox's open middle: a Sniper's arrow
// at the top edge while it paints the player from off screen; two Snipers side by side off screen, their arrows merged
// into one; Settings with Off-screen warnings off, and the same Sniper with no arrow. Under the hook the sim holds still
// between steps, so a wind-up holds; the pulse is stopped at its brightest for the shot.

const SHOTS = 'docs/review/071';

/** Snipers at `dx`, `dy` px from the player, stepped until each is an off-screen threat, then frames drawn and the pulse held. */
async function windUp(page: Page, at: readonly (readonly [number, number])[], arrows: number): Promise<void> {
  const ids: number[] = [];
  for (const [dx, dy] of at) ids.push(await sniperAt(page, dx, dy));
  for (const id of ids) await stepUntilThreat(page, id);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().threats.length)).toBe(arrows);
  // Held at the pulse's top: the counter tween runs on, so wait for it near the max, then stop the tweens.
  await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().threats[0]?.alpha ?? 0) > 0.97), { timeout: 5000 }).toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
  await frames(page);
}

test.describe('review screenshots (071)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/071');

  test('a Sniper painting the player from off screen: its arrow at the top edge', async ({ page }) => {
    await bootSandbox(page);
    await page.evaluate(() => window.__GAME__?.step(0));
    await windUp(page, [[180, -240]], 1);
    await page.screenshot({ path: `${SHOTS}/01-sniper-arrow.png` });
  });

  test('two Snipers side by side off screen: one merged arrow', async ({ page }) => {
    await bootSandbox(page);
    await page.evaluate(() => window.__GAME__?.step(0));
    await windUp(page, [[180, -240], [150, -250]], 1);
    const ids = await page.evaluate(() => window.__GAME__?.ui().threats[0]?.ids.length);
    expect(ids).toBe(2);
    await page.screenshot({ path: `${SHOTS}/02-merged-arrows.png` });
  });

  test('Off-screen warnings off: the setting, then the same Sniper with no arrow', async ({ page }) => {
    await bootSandbox(page);
    await toggleWarnings(page);
    const [, settings] = pauseRows();
    if (!settings) throw new Error('no pause rows');
    await page.keyboard.press('Escape');
    await flowIs(page, 'paused');
    await clickView(page, settings.x + 40, settings.y + 10);
    await flowIs(page, 'settings');
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.settings?.rows.find((r) => r.id === 'offscreenWarnings')?.value)).toBe('Off');
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/03-setting-off.png` });
    await clickRow(page, 'back');
    await flowIs(page, 'paused');
    await page.keyboard.press('Escape');
    await flowIs(page, 'play');
    await page.evaluate(() => window.__GAME__?.step(0));
    await stepUntilThreat(page, await sniperAt(page, 180, -240));
    const tick = (await page.evaluate(() => window.__GAME__?.getState().tick)) ?? -1;
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().drawnTick)).toBe(tick);
    expect(await page.evaluate(() => window.__GAME__?.ui().threats)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/04-setting-off-no-arrow.png` });
  });
});
