import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled, quietScreen } from './helpers';
import { openCraftTab } from './craftPage';
import { feedLines, toIntake, ui } from './intakePage';

// 047's review screenshots (REVIEW_SHOTS=1, docs/review/047): both hotbars, the grid inventory, a hopper's screen,
// and each crafting tab.

const SHOTS = 'docs/review/047';

/** Parks the pointer in the bottom-right corner, off every panel, row and world name. */
async function parkPointer(page: Page): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (box) await page.mouse.move(box.x + box.width - 6, box.y + box.height - 6);
}

test.describe('review screenshots (047)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/047');
  test.setTimeout(150_000);

  test('both hotbars: the intake bar with a volley over the carried bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await toIntake(page);
    await feedLines(page, [{ tx: 12, itemId: 'arrow', amount: 'half' }], 10);
    await page.evaluate(() => {
      window.__helpers?.toHall();
      window.__helpers?.hold('bomb');
      window.__GAME__?.step(1);
    });
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await parkPointer(page);
    await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.icons.length).toBe(1);
    await page.screenshot({ path: `${SHOTS}/01-both-hotbars.png` });
  });

  test('the grid inventory, some of it at risk', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const p = g.step(1).player;
      for (let i = 0; i < 6; i++) g.drop('wood', p.x + (i % 3) * 4, p.y);
      h.collect();
      g.step(200);
    });
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await page.keyboard.press('i');
    await expect.poll(async () => (await ui(page))?.inventory.slots.some((s) => s.atRisk > 0)).toBe(true);
    await parkPointer(page);
    await page.screenshot({ path: `${SHOTS}/02-grid-inventory.png` });
  });

  test('a hopper\'s screen: its own slots over the grid', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      g.step(1, { toggleBuild: true });
      const s = g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 5, facing: 'up' } });
      g.step(1, { toggleBuild: true });
      h.walkTo(11.5 * 32, 6.25 * 32);
      const hopper = s.foundry.pieces.find((p) => p.pieceId === 'hopper');
      if (hopper) g.step(1, { deposit: { id: hopper.id, itemId: 'arrow', amount: 'half' } });
    });
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.pickerCounts).toEqual([50]);
    await parkPointer(page);
    await page.screenshot({ path: `${SHOTS}/03-hopper-screen.png` });
  });

  test('each crafting tab, tagged rounds in their family\'s', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      window.__GAME__?.claim('shrine');
      window.__GAME__?.step(1);
    });
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    for (const [i, tab] of (['arrow', 'bomb', 'ley-bolt', 'landmine'] as const).entries()) {
      await openCraftTab(page, tab);
      await parkPointer(page);
      await page.screenshot({ path: `${SHOTS}/0${4 + i}-craft-${tab}.png` });
    }
  });
});
