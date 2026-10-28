import { expect, test, type Page } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { TILE_SIZE } from '../../src/data/config';
import { fixtureDef } from '../../src/sim/fixtures';
import { boot, cameraSettled, quietScreen } from './helpers';
import { craftRow, openCrafting } from './craftPage';
import { screenPoint, step } from './foundryPage';
import { buildAtStand } from './blueprintPage';
import { bootTitle, clickRow, flowIs } from './flowPage';
import { frames, openWorld, setLook, toRegion } from './lightingPage';
import { bootSandbox, hidePanel } from './sandboxPage';
import { pauseRows } from '../../src/render/craftMenuLayout';

// Review screenshots for 081 (REVIEW_SHOTS=1, into docs/review/081): the polished HUD in Region 1 and the Stormcrown on
// High, the boss bar with the Forgewright's heat gauge, every menu open, a hovered and a pressed row (the flash held
// with its tween stopped), a hover card and a recipe card. The icons and the motion strips are captured at real speed
// by the scripts the spec's Results name.

const SHOTS = 'docs/review/081';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Waits until the last menu's open has settled and a couple of frames are drawn. */
async function menuSettled(page: Page): Promise<void> {
  await expect.poll(async () => (await ui(page))?.menuMotion.running).toBe(false);
  await frames(page, 3);
}

test.describe('review screenshots (081)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/081');

  test('the HUD in Region 1 and in the Stormcrown on High', async ({ page }) => {
    test.setTimeout(420_000);
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    for (const [region, name] of [
      ['region1', '01-hud-region1-high'],
      ['stormcrown', '02-hud-stormcrown-high'],
    ] as const) {
      await toRegion(page, region);
      await page.evaluate(() => {
        window.__GAME__?.setPlayerHealth(72);
        window.__GAME__?.step(30);
      });
      await quietScreen(page);
      await frames(page, 4);
      await page.screenshot({ path: `${SHOTS}/${name}.png` });
    }
  });

  test('the boss bar in its frame, with the Forgewright’s heat gauge', async ({ page }) => {
    test.setTimeout(150_000);
    await bootSandbox(page);
    await hidePanel(page);
    const boss = { x: (ANVIL_ARENA.start.tx + 0.5) * TILE_SIZE, y: (ANVIL_ARENA.start.ty + 0.5) * TILE_SIZE };
    await page.evaluate((b) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1, { sandbox: { kind: 'god', on: true } });
      h.enterArena('anvil-hall');
      h.walkTo(b.x, b.y + 5 * 32);
    }, boss);
    await expect.poll(async () => (await ui(page))?.bossBar?.name, { timeout: 15_000 }).toBe('Forgewright');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const f = g?.getState().enemies.find((e) => e.enemyId === 'forgewright');
      if (!g || !f) throw new Error('no boss');
      g.setEnemyHealth(f.id, Math.round(f.health * 0.6));
      g.step(240);
    });
    await cameraSettled(page, 20_000);
    await frames(page, 3);
    await page.screenshot({ path: `${SHOTS}/03-boss-bar-forgewright.png` });
    const top = await screenPoint(page, 180, 0);
    const end = await screenPoint(page, 460, 40);
    await page.screenshot({ path: `${SHOTS}/04-boss-bar-close.png`, clip: { x: top.x, y: top.y, width: end.x - top.x, height: end.y - top.y } });
  });

  test('crafting, a hovered row and a pressed row; the inventory and talents', async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page, '?playtest');
    await page.evaluate(() => window.__GAME__?.step(1));
    await openCrafting(page);
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/05-crafting.png` });
    // A hovered row: its rim faded in.
    const rows = (await ui(page))?.craftMenu?.rows.filter((r) => r.shown) ?? [];
    const affordable = rows[0];
    if (!affordable) throw new Error('no row');
    const p = await screenPoint(page, affordable.x + affordable.w / 2, affordable.y + affordable.h / 2);
    const hovers = (await ui(page))?.menuMotion.hovers ?? 0;
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.menuMotion.hovers ?? 0).toBeGreaterThan(hovers);
    await frames(page, 12);
    await page.screenshot({ path: `${SHOTS}/06-row-hover.png` });
    // A pressed row: the brass flash held with the tweens stopped.
    const row = await craftRow(page, affordable.recipeId);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.mouse.click(p.x, p.y);
    await frames(page, 3);
    await page.screenshot({ path: `${SHOTS}/07-row-press.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    expect(row.shown).toBe(true);
    await page.keyboard.press('Escape');
    await page.mouse.move(5, 5);
    await page.keyboard.press('i');
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/08-inventory.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('t');
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/09-talents.png` });
  });

  test('the gear panel at the bench, and the stash', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      window.__GAME__?.step(1);
      window.__helpers?.toFoundry();
      window.__helpers?.walkTo(21.7 * 32, 9.5 * 32);
    });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
    await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 30_000 }).toBe(true);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await page.evaluate(() => window.__GAME__?.step(1, { identify: true }));
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.open).toBe(true);
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/10-gear-panel.png` });
    await page.keyboard.press('Escape');
    const stash = fixtureDef('stash');
    await page.evaluate((s) => {
      window.__helpers?.walkTo((s.tx + 0.5) * 32, (s.ty + 1.5) * 32);
      window.__GAME__?.step(1);
    }, stash);
    await cameraSettled(page);
    await expect
      .poll(async () => {
        if ((await ui(page))?.inventory.mode === 'stash') return true;
        await page.keyboard.press('e');
        return (await ui(page))?.inventory.mode === 'stash';
      })
      .toBe(true);
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/11-stash.png` });
  });

  test('pause, Settings and the title’s menu', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=field');
    await page.keyboard.press('Escape');
    await flowIs(page, 'paused');
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/12-pause.png` });
    const settings = pauseRows()[1];
    if (!settings) throw new Error('no settings row');
    const s = await screenPoint(page, settings.x + 40, settings.y + 10);
    await page.mouse.click(s.x, s.y);
    await flowIs(page, 'settings');
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/13-settings.png` });
    await bootTitle(page);
    await menuSettled(page);
    await page.screenshot({ path: `${SHOTS}/14-title-menu.png` });
    await clickRow(page, 'settings').catch(() => undefined);
  });

  test('a hover card and a recipe card', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=field&attuned');
    await page.evaluate(() => window.__GAME__?.step(1));
    const bar = (await ui(page))?.hud?.hotbar;
    if (!bar) throw new Error('no carried bar');
    const c = await screenPoint(page, bar.x + 12, bar.y + 14);
    await page.mouse.move(c.x, c.y);
    await expect.poll(async () => (await ui(page))?.tip?.lines.length ?? 0).toBeGreaterThan(0);
    await frames(page, 3);
    await page.screenshot({ path: `${SHOTS}/15-hover-card.png` });
    await buildAtStand(page);
    const cell = (await ui(page))?.buildBar?.cells.find((x) => x.pieceId === 'cutter');
    if (!cell) throw new Error('no cutter cell');
    const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.tip?.lines[0]).toBe('1 wood → 2 shafts · 1.0 s');
    await step(page, 1);
    await frames(page, 3);
    await page.screenshot({ path: `${SHOTS}/16-recipe-card.png` });
  });
});
