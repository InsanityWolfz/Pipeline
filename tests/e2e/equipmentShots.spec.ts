import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HUD_HEALTH_LAYOUT } from '../../src/data/hudPanels';
import { PLAYTEST_GEAR } from '../../src/data/playtest';
import { LAST_EMBER } from '../../src/data/relics';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 036 (REVIEW_SHOTS=1, into docs/review/036): the bench's gear
// panel with all four slots filled and a relic row (047 removed the Stages panel beside it),
// the HP bar's armor value, the Wardstone's shimmer, Last Ember's flash, a relic's flare
// over the bench, and the new sprites on the contact sheet. Short effects are held on
// the tween clock for their shot.

const SHOTS = 'docs/review/036';
const BENCH_STAND = { x: 2.3 * 32, y: 12.5 * 32 };

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** ?playtest, in the foundry beside the bench. */
async function atBench(page: Page): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate((at) => {
    window.__GAME__?.step(1);
    window.__helpers?.toFoundry();
    window.__helpers?.walkTo(at.x, at.y);
  }, BENCH_STAND);
  // The playtest's schematics bank on the way in: let their banners play out (fast) so they cover nothing.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

/** Wears pieces by id at the bench. */
async function wear(page: Page, ids: number[]): Promise<void> {
  await page.evaluate((list) => {
    for (const id of list) window.__GAME__?.step(1, { equip: { id } });
  }, ids);
}

test.describe('review screenshots (036)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/036');

  test('the bench with all four slots filled and a relic row; the HP bar’s armor', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    // The Wardstone in the helm slot, the Rare body, boots and trinket; three more identified.
    const relic = PLAYTEST_GEAR.find((p) => p.relic !== null);
    const rest = PLAYTEST_GEAR.filter((p) => p.rarity === 'rare' && p.slot !== 'helm');
    if (!relic) throw new Error('no relic');
    await page.evaluate(() => window.__GAME__?.step(1, { identify: true }));
    await wear(page, [relic.id, ...rest.map((p) => p.id)]);
    await page.evaluate(() => window.__GAME__?.step(120));
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.open).toBe(true);
    const helmTab = (await ui(page))?.gearPanel?.tabs.find((t) => t.slot === 'helm')?.box;
    if (!helmTab) throw new Error('no helm tab');
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const zoom = canvas.width / VIEW_WIDTH;
    await page.mouse.click(canvas.x + (helmTab.x + helmTab.w / 2) * zoom, canvas.y + (helmTab.y + helmTab.h / 2) * zoom);
    await expect.poll(async () => (await ui(page))?.gearPanel?.rows.some((r) => r.texts.length === 4)).toBe(true);
    await expect.poll(async () => (await ui(page))?.gearPanel?.cells.every((c) => c.worn !== null)).toBe(true);
    await page.mouse.move(canvas.x + 4, canvas.y + 4);
    await page.screenshot({ path: `${SHOTS}/01-bench-four-slots-relic-row.png` });
    // 047: the bench's Stages panel is gone (tagged rounds are crafted in C), so 02-bench-beside-stages is no longer taken.
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await ui(page))?.gearPanel ?? null).toBeNull();
    // The HP bar's armor value: the total of every worn piece.
    const box = (await ui(page))?.health.box;
    if (!box) throw new Error('no HP block');
    expect(box.y + box.h).toBe(VIEW_HEIGHT - HUD_LAYOUT.margin);
    await page.screenshot({ path: `${SHOTS}/03-hp-bar-armor.png`, clip: { x: canvas.x, y: canvas.y + (box.y - 6) * zoom, width: (box.w + 40) * zoom, height: (HUD_HEALTH_LAYOUT.frame.h + 12) * zoom } });
  });

  test('the Wardstone’s shimmer once it’s ready, and its burst on a block', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    const relic = PLAYTEST_GEAR.find((p) => p.relic !== null);
    if (!relic) throw new Error('no relic');
    await wear(page, [relic.id]);
    await page.evaluate(() => {
      window.__helpers?.walkTo(10 * 32, 9.5 * 32);
      window.__GAME__?.step(380);
    });
    await expect.poll(async () => (await ui(page))?.relics.shimmer ?? 0).toBeGreaterThan(0);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-ward-shimmer.png` });
    // A Husk's swing on the ready ward: held on the tween clock as it bursts.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.15));
    const blocked = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      g.spawnEnemy('husk', p.x + 22, p.y);
      for (let t = 0; t < 200; t++) if (g.step(1).events.wardBlocks.length > 0) return true;
      return false;
    });
    expect(blocked).toBe(true);
    await expect.poll(async () => (await ui(page))?.relics.wardBreaks).toBe(1);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/05-ward-break.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('Last Ember’s flash as it saves the player on 1 HP', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    const id = await page.evaluate((def) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const s = g.addGear({ slot: def.slot, rarity: 'relic', weight: null, baseArmor: 0, relic: def.id, name: def.name, affixes: [{ kind: 'regen', value: 0.4 }, { kind: 'max-health', value: 12 }] });
      return s.gear[s.gear.length - 1]?.id ?? -1;
    }, { slot: LAST_EMBER.slot, id: LAST_EMBER.id, name: LAST_EMBER.name });
    await wear(page, [id]);
    await page.evaluate(() => window.__helpers?.walkTo(10 * 32, 9.5 * 32));
    await cameraSettled(page, 20_000);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.1));
    const saved = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.setPlayerHealth(4).player;
      g.spawnEnemy('husk', p.x + 22, p.y);
      for (let t = 0; t < 200; t++) {
        const s = g.step(1);
        if (s.events.emberSaves.length > 0) return s.player.health;
        g.setPlayerHealth(Math.min(4, s.player.health));
      }
      return null;
    });
    expect(saved).toBe(1);
    await expect.poll(async () => (await ui(page))?.relics.emberFlashes).toBe(1);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/06-ember-flash.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('a relic flaring over the bench as it’s identified', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    // Enough pieces that one rolls a relic (3% each), on the seeded RNG.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const p = g.step(1).player;
      for (let i = 0; i < 120; i++) g.drop('unidentified-armor', p.x, p.y);
      h.collect();
    });
    // A frame first, so the long collect's frame time doesn't run the flare out on the slowed clock.
    await cameraSettled(page, 20_000);
    const relics = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.tweenSpeed(0.1);
      return g.step(1, { identify: true }).events.identifies.filter((piece) => piece.relic !== null).length;
    });
    expect(relics).toBeGreaterThan(0);
    await expect.poll(async () => (await ui(page))?.relics.benchFlares).toBe(1);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/07-relic-flare.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('the new sprites on the contact sheet', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    const names = ['gear-helm', 'gear-boots', 'gear-trinket', 'gear-frame-common', 'gear-frame-fine', 'gear-frame-rare', 'gear-frame-relic', 'relic-rollbreaker', 'relic-wardstone', 'relic-featherplate', 'relic-ember', 'ward-shimmer', 'ember-flash', 'relic-flare'];
    for (const [i, name] of names.entries()) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/sheet-${String(i + 1).padStart(2, '0')}-${name}.png` });
    }
  });
});
