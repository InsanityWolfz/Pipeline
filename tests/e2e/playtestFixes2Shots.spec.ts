import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { bootTitle } from './flowPage';
import { screenPoint } from './foundryPage';
import { boot, cameraSettled, quietScreen } from './helpers';

// Review screenshots for 050 (REVIEW_SHOTS=1, into docs/review/050): the wanderer facing forward (in play and on the
// contact sheet at 4×), a boulder's name tag beside its E prompt, a discovery banner at the top, the ward ring with
// its shield, the title screen, the bench's scrolling gear list, and an inventory item's name tip.

const SHOTS = 'docs/review/050';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** A clip of the view round a world point, view px either side. */
async function clipAround(page: Page, x: number, y: number, w: number, h: number): Promise<{ x: number; y: number; width: number; height: number }> {
  const u = await ui(page);
  const canvas = await page.locator('canvas').boundingBox();
  if (!u || !canvas) throw new Error('no view');
  const k = canvas.width / VIEW_WIDTH;
  const vx = x - (u.camera.x - VIEW_WIDTH / 2);
  const vy = y - (u.camera.y - VIEW_HEIGHT / 2);
  return { x: canvas.x + (vx - w / 2) * k, y: canvas.y + (vy - h / 2) * k, width: w * k, height: h * k };
}

test.describe('review screenshots (050)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/050');

  test('01 the wanderer facing forward, in play and on the contact sheet', async ({ page }) => {
    await boot(page, '?start=field&attuned');
    // The drawn facing follows the aim (the hook steps by hand, so the mouse doesn't aim): step with the aim well below
    // the player, then wait until the state reads it as facing down before the shot.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const at = g.getState().player;
      g.step(1, { moveY: 1, aimX: at.x, aimY: at.y + 80 });
      g.step(30);
    });
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const pl = window.__GAME__?.getState().player;
          return !!pl && pl.facing === 'down' && pl.aim.y - pl.y > Math.abs(pl.aim.x - pl.x);
        }),
      )
      .toBe(true);
    await quietScreen(page);
    await cameraSettled(page);
    const p = (await ui(page))?.camera.player;
    if (!p) throw new Error('no player');
    await page.screenshot({ path: `${SHOTS}/01a-wanderer-forward.png`, clip: await clipAround(page, p.x, p.y - 20, 120, 80) });
    await page.goto('/sheet.html');
    const row = page.locator('h2', { hasText: 'Wanderer: down' }).locator('xpath=following-sibling::div[1]');
    await expect(row.locator('canvas').first()).toBeVisible();
    await row.screenshot({ path: `${SHOTS}/01b-sheet-down-view.png` });
  });

  test("02 a boulder's name tag under it, its E prompt clear", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?start=field&attuned');
    const rock = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.step(1);
      const p = s.player;
      const near = s.nodes.filter((n) => n.nodeId === 'rubble' && n.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!near) throw new Error('no boulder');
      h.walkTo(near.x + 26, near.y + 4);
      return near;
    });
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    const cam = (await ui(page))?.camera;
    if (!cam) throw new Error('no camera');
    const at = await screenPoint(page, rock.x - (cam.x - VIEW_WIDTH / 2), rock.y - 6 - (cam.y - VIEW_HEIGHT / 2));
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.hoverName).toBe('Boulder');
    await page.screenshot({ path: `${SHOTS}/02a-name-tag-view.png` });
    await page.screenshot({ path: `${SHOTS}/02b-name-tag-close.png`, clip: await clipAround(page, rock.x + 10, rock.y - 10, 140, 100) });
  });

  test('03 a discovery banner at the top', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      let s = g.step(1);
      for (let x = 36 + h.ox; x >= 24 + h.ox && !s.discovered.includes('quarry'); x -= 2) {
        h.walkTo((x + 0.5) * 32, (25.5 + h.oy) * 32);
        s = g.getState();
      }
    });
    await expect.poll(async () => (await ui(page))?.landmarks.bannerAlpha).toBe(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.01));
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-banner-top.png` });
  });

  test('04 the ward ring with its shield', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1);
      h.toFoundry();
      h.walkTo(2.3 * 32, 12.5 * 32);
      const s = g.addGear({ slot: 'helm', rarity: 'relic', weight: null, baseArmor: 2, affixes: [], relic: 'wardstone-circlet', name: 'Wardstone Circlet' });
      g.step(1, { equip: { id: s.gear.at(-1)?.id ?? -1 } });
      h.walkTo(8 * 32, 9.5 * 32);
      g.step(400);
    });
    await expect.poll(async () => (await ui(page))?.relics.shield).toBe(true);
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    const p = (await ui(page))?.camera.player;
    if (!p) throw new Error('no player');
    await page.screenshot({ path: `${SHOTS}/04-ward-ring.png`, clip: await clipAround(page, p.x, p.y - 14, 100, 70) });
  });

  test('05 the title screen', async ({ page }) => {
    await bootTitle(page);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().flow.title))?.motion.crouch ?? 0).toBeGreaterThan(0.3);
    await page.screenshot({ path: `${SHOTS}/05-title.png` });
  });

  test('06 the bench: the gear list scrolled, a row’s tip; and an inventory item’s name tip', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1);
      for (let i = 0; i < 8; i++) g.addGear({ slot: 'body', rarity: i % 2 ? 'fine' : 'rare', weight: 'heavy', baseArmor: 10 + i, affixes: [{ kind: 'armor', value: 3 }], relic: null, name: `Plate ${i + 1}` });
      h.toFoundry();
      h.walkTo(2.3 * 32, 12.5 * 32);
    });
    await quietScreen(page);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.open, { timeout: 15_000 }).toBe(true);
    const row = (await ui(page))?.gearPanel?.rows[1];
    if (!row) throw new Error('no row');
    const at = await screenPoint(page, row.box.x + row.box.w / 2, row.box.y + row.box.h / 2);
    await page.mouse.move(at.x, at.y);
    for (const want of [1, 2]) {
      await page.mouse.wheel(0, 100);
      await expect.poll(async () => (await ui(page))?.gearPanel?.scroll.first).toBe(want);
    }
    await expect.poll(async () => (await ui(page))?.tip?.source.kind).toBe('gear');
    await page.screenshot({ path: `${SHOTS}/06a-gear-scrolled.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('i');
    const slot = (await ui(page))?.inventory.slots.find((s) => s.itemId === 'warden-core');
    if (!slot) throw new Error('no core');
    const p = await screenPoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.tip?.name).toBe('Warden core');
    await page.screenshot({ path: `${SHOTS}/06b-item-tip.png` });
  });
});
