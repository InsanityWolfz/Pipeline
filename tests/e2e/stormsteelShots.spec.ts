import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, cameraSettled, quietScreen } from './helpers';
import { openCraftTab } from './craftPage';
import { screenPoint } from './foundryPage';
import { stormsteelArrowLine } from './stormsteelPage';

// Review screenshots for 066 (REVIEW_SHOTS=1, into docs/review/066): a Tempering coil in a stormsteel arrow line, with
// its hover; a Stormsteel Frost arrow's hover summary and breakdown; a storm glass bolt in flight; the Forge build-bar
// group with its three machines; the Arrows tab's storm rows; and the new art on the contact sheet.

const SHOTS = 'docs/review/066';

/** Moves the real mouse over a world point, through the camera's view (its centre in ui()). */
async function hoverWorld(page: Page, x: number, y: number): Promise<void> {
  const cam = await page.evaluate(() => window.__GAME__?.ui().camera);
  if (!cam) throw new Error('no camera');
  const p = await screenPoint(page, x - (cam.x - VIEW_WIDTH / 2), y - (cam.y - VIEW_HEIGHT / 2));
  await page.mouse.move(p.x, p.y);
}

test.describe('review screenshots (066)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/066');

  test('a Tempering coil in a stormsteel arrow line, and its hover', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await stormsteelArrowLine(page);
    await page.mouse.move(0, 0);
    await cameraSettled(page);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/01-coil-arrow-line.png` });
    // Its hover, while it's tempering: the recipe it runs.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 300; t++) {
        const s = g.step(1);
        const coil = s.foundry.pieces.find((p) => p.pieceId === 'tempering-coil');
        if (coil?.kind === 'machine' && coil.crafting) return;
      }
      throw new Error('the coil never worked');
    });
    await hoverWorld(page, 12.5 * 32, 3.5 * 32);
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().hoverName ?? null)).toBe('Tempering coil');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/02-coil-hover.png` });
  });

  test('a Stormsteel Frost arrow’s hover summary and breakdown', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    const slot = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.step(1);
      g.drop('arrow+stormsteel+frost', s.player.x, s.player.y);
      h.collect();
      return g.step(1).hotbar.slots.indexOf('arrow+stormsteel+frost');
    });
    const cell = hotbarCells().find((c) => c.slot === slot);
    if (!cell) throw new Error('no slot');
    const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(p.x, p.y);
    const mode = async () => (await page.evaluate(() => window.__GAME__?.ui().tip))?.mode;
    await expect.poll(mode).toBe('summary');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/03-stormsteel-frost-summary.png` });
    await page.keyboard.down('Shift');
    await expect.poll(mode).toBe('breakdown');
    await page.screenshot({ path: `${SHOTS}/04-stormsteel-frost-breakdown.png` });
    await page.keyboard.up('Shift');
  });

  test('a storm glass bolt in flight', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      // Into the foundry first: the tube attunes there, then back out to open ground.
      h.toFoundry();
      h.toHall();
      let s = g.step(1);
      h.walkTo(s.player.x, s.player.y + 4 * 32);
      s = g.step(1);
      g.drop('ley-bolt+storm-glass', s.player.x, s.player.y);
      h.collect();
      h.hold('ley-bolt+storm-glass');
    });
    await quietScreen(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      s = g.step(1, { use: true, aimX: s.player.x + 300, aimY: s.player.y + 60 });
      for (let t = 0; t < 14; t++) s = g.step(1);
      if (!s.arrows.some((a) => a.ammoId === 'ley-bolt+storm-glass')) throw new Error('no storm glass bolt in flight');
    });
    await page.screenshot({ path: `${SHOTS}/05-storm-glass-bolt-in-flight.png` });
  });

  test('the Forge build-bar group with its three machines, and the coil’s tip', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => window.__helpers?.toFoundry());
    await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().buildBar))?.shown).toBe(true);
    const bar = await page.evaluate(() => window.__GAME__?.ui().buildBar);
    const cell = bar?.cells.find((c) => c.pieceId === 'tempering-coil');
    if (!cell) throw new Error('no Tempering coil cell');
    await cameraSettled(page);
    const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().buildTip)).toBe('tempering-coil');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/06-forge-build-bar.png` });
  });

  test('the Arrows tab’s storm rows, every name inside its row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let i = 0; i < 4; i++) g.craft('ley-steel');
      g.step(1);
      g.craft('stormsteel');
      g.step(2);
    });
    await quietScreen(page);
    await openCraftTab(page, 'arrow');
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftMenu))?.rows.some((r) => r.shown && r.recipeId === 'stormsteel-arrow')).toBe(true);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/07-craft-menu-storm-rows.png` });
  });

  test('the new art on the contact sheet', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/sheet.html');
    const rows: [string, RegExp][] = [
      ['08-sheet-storm-tier', /^The storm tier \(066\)/],
      ['09-sheet-tempering-coil', /^Machine: tempering-coil /],
    ];
    for (const [name, title] of rows) {
      const row = page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.screenshot({ path: `${SHOTS}/${name}.png` });
    }
  });
});
