import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { OBJECTIVES } from '../../src/data/objectives';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HEALTH_BLOCK_HEIGHT } from '../../src/data/hudPanels';
import { OVERWORLD } from '../../src/data/overworld';
import { PICKUP_RADIUS } from '../../src/data/player';
import { FOUNDRY_STEPS } from '../fixtures/foundrySteps';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 031 (REVIEW_SHOTS=1, into docs/review/031): the HUD at full
// HP with armor worn, low HP with the red edges, a damage chunk mid-hold, the healing
// glow in a pylon's zone, the inventory panel with safe and at-risk rows in every group,
// the pickup feed after a mixed burst, two "+ part" popups, the casing beside the bomb,
// and build mode with every piece unlocked. The HUD's motion runs on tween time, so a
// tween speed of 0 holds a chunk, a feed or a pulse still for its shot.

const SHOTS = 'docs/review/031';
const PYLON = OVERWORLD.shrine.pylon;
/** Open flagstones inside the shrine's safe zone, a few tiles down and right of its pylon (030's shots stand here). */
const SAFE_SPOT = { x: (PYLON.tx + 2.5) * TILE_SIZE, y: (PYLON.ty + 3.5) * TILE_SIZE };
/** The HP block's top at rest (bottom-left, margin px up): raised in build mode, it sits above this. */
// The block's resting top: the frame and 037's XP row under it, margin px off the bottom.
const RESTING_TOP = VIEW_HEIGHT - HUD_LAYOUT.margin - HEALTH_BLOCK_HEIGHT;
const CUTTER_STEP = OBJECTIVES.findIndex((o) => o.text === FOUNDRY_STEPS[2]);

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Lays items at the player's feet and collects them, in one batch so the feed merges them. */
async function pickUp(page: Page, items: [string, number][]): Promise<void> {
  await page.evaluate((list) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.step(1).player;
    for (const [id, n] of list) for (let i = 0; i < n; i++) g.drop(id, p.x, p.y);
    h.collect();
  }, items);
}

test.describe('review screenshots (031)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/031');

  test('armor worn at full HP, and the inventory panel with safe and at-risk rows in every group', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?start=field&attuned');
    // Some of the haul goes home from the claimed shrine pylon (the panel's "home N")...
    await page.evaluate(([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
    }, [PYLON.tx, PYLON.ty] as const);
    await pickUp(page, [['wood', 5], ['arrowhead', 4], ['ley-crystal', 2]]);
    await page.evaluate(() => window.__GAME__?.step(1, { pylon: 'deposit' }));
    // ...more is carried to the foundry by pylon travel, which banks it...
    await pickUp(page, [['wood', 10], ['ley-crystal', 4], ['arrowhead', 6], ['casing', 3], ['bomb', 4], ['unidentified-armor', 3], ['warden-core', 1]]);
    const worn = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1, { pylon: 'travel' });
      h.walkTo(2.3 * 32, 12.5 * 32);
      const s = g.step(1, { identify: true });
      const piece = s.gear[0];
      if (!piece) throw new Error('nothing identified');
      return g.step(1, { equip: { id: piece.id } }).equipped[piece.slot];
    });
    expect(worn).not.toBeNull();
    await page.evaluate(() => window.__helpers?.walkTo(8.5 * 32, 10.5 * 32));
    await cameraSettled(page, 20_000);
    // The feed's hold and fade run on game time, which runs behind the wall clock on a slow headless frame rate.
    await expect.poll(async () => (await ui(page))?.pickupFeed.length, { timeout: 30_000 }).toBe(0);
    await expect.poll(async () => (await ui(page))?.health.text).toBe('100 / 100');
    await page.screenshot({ path: `${SHOTS}/01-hud-full-hp-armor-worn.png` });

    // ...and a last few are picked up there, unbanked: at risk (beyond the banked counts: the 3 identified pieces still count as banked).
    await pickUp(page, [['wood', 3], ['rime-shard', 2], ['fuse', 2], ['arrow+frost', 4], ['unidentified-armor', 4], ['warden-core', 1]]);
    await page.keyboard.press('i');
    await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
    const groups = (await ui(page))?.inventory.groups ?? [];
    for (const g of groups) {
      expect(g.rows.some((r) => r.atRisk < r.count), `${g.id} has a safe row`).toBe(true);
      expect(g.rows.some((r) => r.atRisk > 0), `${g.id} has an at-risk row`).toBe(true);
    }
    expect(groups.find((g) => g.id === 'raw')?.rows.find((r) => r.itemId === 'wood')).toEqual({ itemId: 'wood', count: 13, atRisk: 3, home: 5 });
    await page.screenshot({ path: `${SHOTS}/05-inventory-panel.png` });
  });

  test('low HP with the red edges, and a damage chunk mid-hold', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    await page.evaluate(() => {
      window.__GAME__?.tweenSpeed(0);
      window.__GAME__?.setPlayerHealth(55);
    });
    await expect.poll(async () => (await ui(page))?.health.chunk).toBe(45);
    await page.screenshot({ path: `${SHOTS}/03-damage-chunk.png` });
    await page.evaluate(() => {
      window.__GAME__?.tweenSpeed(1);
      window.__GAME__?.setPlayerHealth(18);
    });
    await expect.poll(async () => (await ui(page))?.health.low).toBe(true);
    await expect.poll(async () => (await ui(page))?.health.chunk).toBe(0);
    await page.screenshot({ path: `${SHOTS}/02-low-hp-edge-tint.png` });
  });

  test("the healing glow in the shrine pylon's safe zone", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate((zone) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      g.setPlayerHealth(40);
      h.walkTo(zone.x, zone.y);
      if (g.step(10).player.healing !== 'pylon') throw new Error('not healing in the safe zone');
    }, SAFE_SPOT);
    await expect.poll(async () => (await ui(page))?.health.healing).toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-healing-glow.png` });
  });

  test('the pickup feed after a burst of mixed pickups', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await pickUp(page, [['wood', 3], ['stone', 2], ['fiber', 4], ['ley-crystal', 1], ['husk-resin', 2], ['wood', 4]]);
    // Five lines, one per item, the two wood pickups merged into one line.
    await expect.poll(async () => (await ui(page))?.pickupFeed.map((l) => `${l.itemId} ${l.count}`).sort()).toEqual(['fiber 4', 'husk-resin 2', 'ley-crystal 1', 'stone 2', 'wood 7']);
    await page.screenshot({ path: `${SHOTS}/06-pickup-feed.png` });
  });

  test('two "+ part" popups at once', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    await page.evaluate((cutterStep) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.completeObjectives(cutterStep);
      h.toFoundry();
      g.step(1, { toggleBuild: true });
      g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 5, facing: 'up' } });
      g.step(1, { place: { pieceId: 'hopper', tx: 12, ty: 5, facing: 'up' } });
      for (const [tx, item] of [[11, 'wood'], [12, 'stone']] as const) {
        h.walkTo((tx + 0.5) * 32, 6.25 * 32);
        const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
        if (!hopper) throw new Error('no hopper');
        g.step(1, { deposit: { id: hopper.id, itemId: item, amount: 'all' } });
      }
      h.walkTo(14.5 * 32, 7.5 * 32);
      g.step(1, { toggleBuild: true });
    }, CUTTER_STEP);
    await expect.poll(async () => Object.keys((await ui(page))?.nodes ?? { x: 1 }).length).toBe(0);
    await cameraSettled(page, 20_000);
    // The machines go down and are drawn (so each popup starts over its machine's drawn top) before any tick runs them.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { toggleBuild: true });
      g.step(1, { place: { pieceId: 'cutter', tx: 11, ty: 4, facing: 'up' } });
      g.step(1, { place: { pieceId: 'knapper', tx: 12, ty: 4, facing: 'up' } });
      g.step(1, { toggleBuild: true });
    });
    await cameraSettled(page, 20_000);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await page.evaluate((cutterStep) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(1);
      for (let t = 0; t < 600 && (s.objective.index ?? 0) <= cutterStep + 1; t++) s = g.step(1);
    }, CUTTER_STEP);
    await expect.poll(async () => (await ui(page))?.madePopups.length).toBe(2);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/07-two-made-popups.png` });
  });

  test('the casing beside the bomb, on the ground and on the contact sheet', async ({ page }) => {
    await boot(page);
    const p = await page.evaluate((reach) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const at = g.step(1).player;
      // Laid out of pickup reach to the player's right, and no tick runs after, so they stay on the ground.
      g.drop('casing', at.x + reach + 30, at.y);
      g.drop('bomb', at.x + reach + 50, at.y);
      return at;
    }, PICKUP_RADIUS);
    await cameraSettled(page);
    const view = await ui(page);
    const canvas = await page.locator('canvas').boundingBox();
    if (!view || !canvas) throw new Error('no view');
    const zoom = canvas.width / VIEW_WIDTH;
    const left = view.camera.x - VIEW_WIDTH / 2;
    const top = view.camera.y - VIEW_HEIGHT / 2;
    await page.screenshot({
      path: `${SHOTS}/08-casing-and-bomb.png`,
      clip: { x: canvas.x + (p.x + PICKUP_RADIUS + 16 - left) * zoom, y: canvas.y + (p.y - 22 - top) * zoom, width: 48 * zoom, height: 32 * zoom },
    });
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [name, file] of [['item-casing', '08a-sheet-casing'], ['icon-bomb', '08b-sheet-bomb'], ['hud-health', '10-sheet-hp-frame'], ['hud-shield', '11-sheet-shield'], ['hud-warn', '12-sheet-warn'], ['inventory-title', '13-sheet-title-card']] as const) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });

  test('build mode with every piece unlocked: the HP block clear of the build bar', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      h.walkTo(12.5 * 32, 8.5 * 32);
      g.step(1, { toggleBuild: true });
    });
    await expect.poll(async () => (await ui(page))?.buildBar?.shown).toBe(true);
    await expect.poll(async () => (await ui(page))?.health.box.y).toBeLessThan(RESTING_TOP);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/09-build-mode-every-piece.png` });
  });
});
