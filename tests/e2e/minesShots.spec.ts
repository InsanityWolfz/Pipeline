import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled } from './helpers';
import { ui } from './intakePage';

// Review screenshots for 038 (REVIEW_SHOTS=1, into docs/review/038): armed mines with their
// arm rings (one fresh, one in its red last second) and key 4 lit on the hotbar, a mine's
// burst, a cluster bomb's bomblets in the air and bursting, the crafting menu's two columns
// with the Landmines group, the new machines working in a line, and the art on the contact
// sheet. Under the hook the sim holds still between steps; flashes are held by slowing tweens.

const SHOTS = 'docs/review/038';

/** `?playtest` on open ground, every enemy gone, the camera still. */
async function field(page: Page): Promise<{ x: number; y: number }> {
  await boot(page, '?playtest');
  const p = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    return g.step(1).player;
  });
  await cameraSettled(page, 20_000);
  return { x: p.x, y: p.y };
}

test.describe('review screenshots (038)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/038');

  test('armed mines with their arm rings, and key 4 on the hotbar', async ({ page }) => {
    test.setTimeout(120_000);
    const p = await field(page);
    await page.evaluate((at) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { selectAmmo: 'landmine' });
      // The first is thrown 200 ticks before the second, so it shows in its red last second as the second fills.
      g.step(1, { fire: true, aimX: at.x + 90, aimY: at.y - 30 });
      g.step(200);
      g.step(1, { fire: true, aimX: at.x - 90, aimY: at.y + 20 });
      g.step(75);
    }, p);
    await expect.poll(async () => (await ui(page))?.mines.armed.length).toBe(2);
    const armed = (await ui(page))?.mines.armed ?? [];
    expect(armed.some((m) => m.late)).toBe(true);
    expect(armed.some((m) => !m.late && m.progress > 0.1)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/01-armed-mines.png` });
  });

  test("a mine's burst", async ({ page }) => {
    test.setTimeout(120_000);
    const p = await field(page);
    await page.evaluate((at) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { selectAmmo: 'landmine' });
      g.step(1, { fire: true, aimX: at.x + 80, aimY: at.y });
      g.tweenSpeed(0.03);
      let s = g.step(1);
      for (let t = 0; t < 400 && s.events.mineBursts.length === 0; t++) s = g.step(1);
    }, p);
    await expect.poll(async () => (await ui(page))?.mines.mineFlashes).toBe(1);
    await page.screenshot({ path: `${SHOTS}/02-mine-burst.png` });
  });

  test("a cluster bomb's bomblets in the air, then bursting", async ({ page }) => {
    test.setTimeout(120_000);
    const p = await field(page);
    await page.evaluate((at) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      // The playtest carries no tagged rounds: a cluster bomb laid at the player's feet is picked up.
      g.step(1, { selectAmmo: 'bomb' });
      g.drop('bomb+cluster', at.x, at.y);
      let s = g.step(1);
      for (let t = 0; t < 60 && !s.inventory['bomb+cluster']; t++) s = g.step(1);
      g.tweenSpeed(0.03);
      s = g.step(1, { fire: true, aimX: at.x + 110, aimY: at.y });
      for (let t = 0; t < 120 && s.events.bursts.length === 0; t++) s = g.step(1);
      g.step(6);
    }, p);
    await expect.poll(async () => (await ui(page))?.mines.bomblets).toBe(4);
    await page.screenshot({ path: `${SHOTS}/03-cluster-bomblets-out.png` });
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(1);
      for (let t = 0; t < 20 && s.events.bombletBursts.length === 0; t++) s = g.step(1);
    });
    await expect.poll(async () => (await ui(page))?.mines.bombletFlashes).toBe(4);
    await page.screenshot({ path: `${SHOTS}/04-cluster-burst.png` });
  });

  test("the crafting menu's two columns, with the Landmines group", async ({ page }) => {
    test.setTimeout(60_000);
    await field(page);
    await page.keyboard.press('c');
    await expect.poll(async () => (await ui(page))?.craftOpen).toBe(true);
    const rows = (await ui(page))?.craftMenu?.rows.filter((r) => r.shown).map((r) => r.recipeId) ?? [];
    expect(rows).toEqual(expect.arrayContaining(['iron-plate', 'landmine']));
    await page.screenshot({ path: `${SHOTS}/05-crafting-menu.png` });
  });

  test('the plate press, mine packer and Cluster die working in the foundry', async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page, '?playtest');
    const working = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      h.toFoundry();
      h.walkTo(9.5 * 32, 8.5 * 32);
      const place = (pieceId: string, tx: number, ty: number, facing: 'up' | 'down' | 'left' | 'right') => g.step(1, { place: { pieceId, tx, ty, facing } });
      // ley-iron → plate press → conduit → mine packer (3 tiles down its back) ← fuses, shards; crate out front.
      place('hopper', 6, 5, 'right');
      place('plate-press', 7, 5, 'right');
      place('conduit', 8, 5, 'right');
      place('mine-packer', 9, 6, 'right');
      place('hopper', 8, 6, 'right');
      place('hopper', 8, 7, 'right');
      place('crate', 10, 6, 'right');
      // bombs → Cluster die ← ley-iron from above; crate out front.
      place('hopper', 6, 10, 'right');
      place('cluster-die', 7, 10, 'right');
      place('hopper', 7, 9, 'down');
      let s = place('crate', 8, 10, 'right');
      const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
      const fill = (tx: number, ty: number, itemId: string, from: [number, number]) => {
        h.walkTo(from[0] * 32, from[1] * 32);
        const piece = at(tx, ty);
        if (!piece) throw new Error(`nothing at ${tx},${ty}: ${JSON.stringify(s.events.placeFails)}`);
        s = g.step(1, { deposit: { id: piece.id, itemId, amount: 'half' } });
      };
      fill(6, 5, 'ley-iron', [5.5, 5.5]);
      fill(8, 6, 'fuse', [8.5, 5.5]);
      fill(8, 7, 'ley-dust', [8.5, 8.5]);
      fill(6, 10, 'bomb', [5.5, 10.5]);
      fill(7, 9, 'ley-iron', [6.5, 9.5]);
      h.walkTo(12.5 * 32, 8.5 * 32);
      const busy = new Set<string>();
      for (let t = 0; t < 900 && busy.size < 3; t++) {
        s = g.step(1);
        for (const p of s.foundry.pieces) if (p.kind === 'machine' && p.status === 'working') busy.add(p.pieceId);
      }
      // Stop with all three mid-batch if the timing allows; the shot shows what's working now.
      return [...busy];
    });
    expect(working.sort()).toEqual(['mine-packer', 'plate-press', 'cluster-die']);
    // The schematic banners from banking on the way in, played out fast so none covers the line.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
    await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 20_000 }).toBe(true);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/06-machines.png` });
  });

  test('the new art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Landmines and cluster bombs (038)')).toBeVisible();
    await row('Landmines and cluster bombs (038)').screenshot({ path: `${SHOTS}/07-sheet-mines.png` });
    for (const [i, id] of ['plate-press', 'mine-packer', 'cluster-die'].entries()) await row(`Machine: ${id} `).screenshot({ path: `${SHOTS}/${String(8 + i).padStart(2, '0')}-sheet-${id}.png` });
  });
});
