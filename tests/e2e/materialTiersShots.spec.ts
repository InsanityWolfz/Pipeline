import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, cameraSettled, quietScreen } from './helpers';
import { screenPoint } from './foundryPage';
import { steelArrowLine } from './tierPage';

// Review screenshots for 062 (REVIEW_SHOTS=1, into docs/review/062): a Smelter feeding a knapper in an arrow line; a
// mixed line making both kinds, the knapper's hover showing the steel recipe it runs; a Steel Frost arrow's hover
// summary and breakdown; a glass bolt in flight; the Forge build-bar group; and the new art on the contact sheet.

const SHOTS = 'docs/review/062';

/** Moves the real mouse over a world point, through the camera's view (its centre in ui()). */
async function hoverWorld(page: Page, x: number, y: number): Promise<void> {
  const cam = await page.evaluate(() => window.__GAME__?.ui().camera);
  if (!cam) throw new Error('no camera');
  const p = await screenPoint(page, x - (cam.x - VIEW_WIDTH / 2), y - (cam.y - VIEW_HEIGHT / 2));
  await page.mouse.move(p.x, p.y);
}

test.describe('review screenshots (062)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/062');

  test('a Smelter feeding a knapper in an arrow line, and a mixed line beside it', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await steelArrowLine(page);
    await page.mouse.move(0, 0);
    await cameraSettled(page);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/01-smelter-arrow-line.png` });

    // A mixed line: a knapper fed stone from behind and ley-steel from below, out into a crate. It takes turns,
    // so both arrowheads come out; the shot waits for it to be working its steel set.
    const knapper = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const [pieceId, tx, ty, facing] of [['hopper', 15, 7, 'right'], ['knapper', 16, 7, 'right'], ['crate', 17, 7, 'right'], ['hopper', 16, 8, 'up']] as const) g.step(1, { place: { pieceId, tx, ty, facing } });
      let s = g.step(1);
      const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
      // The kit carries ley-iron and cinderite, not ley-steel (062): smelted by hand first.
      for (let i = 0; i < 10; i++) g.craft('ley-steel');
      h.walkTo(14.2 * 32, 7.5 * 32);
      s = g.step(1, { deposit: { id: at(15, 7)?.id ?? -1, itemId: 'stone', amount: 'half' } });
      h.walkTo(15.2 * 32, 8.5 * 32);
      s = g.step(1, { deposit: { id: at(16, 8)?.id ?? -1, itemId: 'ley-steel', amount: 'half' } });
      h.walkTo(8.5 * 32, 5.5 * 32);
      const made = new Set<string>();
      const steelNow = (): boolean => {
        const k = at(16, 7);
        return k?.kind === 'machine' && k.made === 'steel-arrowhead' && k.crafting;
      };
      for (let t = 0; t < 900 && !(made.size === 2 && steelNow()); t++) {
        s = g.step(1);
        for (const m of s.events.made) if (m.pieceId === 'knapper') made.add(m.itemId);
      }
      if (made.size !== 2) throw new Error(`the knapper made ${[...made].join(', ')}`);
      const k = at(16, 7);
      return { x: ((k?.tx ?? 0) + 0.5) * 32, y: ((k?.ty ?? 0) + 0.5) * 32 };
    });
    await cameraSettled(page);
    await hoverWorld(page, knapper.x, knapper.y);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/02-mixed-line-hover.png` });
  });

  test('a Steel Frost arrow’s hover summary and breakdown', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    const slot = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.step(1);
      g.drop('arrow+steel+frost', s.player.x, s.player.y);
      h.collect();
      return g.step(1).hotbar.slots.indexOf('arrow+steel+frost');
    });
    const cell = hotbarCells().find((c) => c.slot === slot);
    if (!cell) throw new Error('no slot');
    const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(p.x, p.y);
    const mode = async () => (await page.evaluate(() => window.__GAME__?.ui().tip))?.mode;
    await expect.poll(mode).toBe('summary');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/03-steel-frost-summary.png` });
    await page.keyboard.down('Shift');
    await expect.poll(mode).toBe('breakdown');
    await page.screenshot({ path: `${SHOTS}/04-steel-frost-breakdown.png` });
    await page.keyboard.up('Shift');
  });

  test('a glass bolt in flight', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      // Into the foundry first: the tube attunes there, then back out to open ground.
      h.toFoundry();
      h.toHall();
      // Out onto the open ground below the gatehouse.
      let s = g.step(1);
      h.walkTo(s.player.x, s.player.y + 4 * 32);
      s = g.step(1);
      g.drop('ley-bolt+glass', s.player.x, s.player.y);
      h.collect();
      h.hold('ley-bolt+glass');
    });
    // The banners from banking schematics in the foundry, played out first.
    await quietScreen(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      s = g.step(1, { use: true, aimX: s.player.x + 300, aimY: s.player.y + 60 });
      for (let t = 0; t < 14; t++) s = g.step(1);
      if (!s.arrows.some((a) => a.ammoId === 'ley-bolt+glass')) throw new Error('no glass bolt in flight');
    });
    await page.screenshot({ path: `${SHOTS}/05-glass-bolt-in-flight.png` });
  });

  test('the Forge build-bar group, and the Smelter’s tip', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => window.__helpers?.toFoundry());
    await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().buildBar))?.shown).toBe(true);
    const bar = await page.evaluate(() => window.__GAME__?.ui().buildBar);
    const cell = bar?.cells.find((c) => c.pieceId === 'smelter');
    if (!cell) throw new Error('no Smelter cell');
    await cameraSettled(page);
    const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().buildTip)).toBe('smelter');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/06-forge-build-bar.png` });
  });

  test('the new art on the contact sheet', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/sheet.html');
    const rows: [string, RegExp][] = [
      ['07-sheet-tiers', /^Material tiers \(062\)/],
      ['08-sheet-smelter', /^Machine: smelter /],
      ['09-sheet-kiln', /^Machine: kiln /],
    ];
    for (const [name, title] of rows) {
      const row = page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.screenshot({ path: `${SHOTS}/${name}.png` });
    }
  });
});
