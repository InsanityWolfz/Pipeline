import { expect, test, type Page } from '@playwright/test';
import { DOOR_FADE_MS } from '../../src/data/config';
import { boot, cameraSettled } from './helpers';
import { screenPoint } from './foundryPage';
import { ui } from './intakePage';

// Review screenshots for 039 (REVIEW_SHOTS=1, into docs/review/039): a Frost bomb and a
// Frost ley bolt in flight, a Cold Burst, the bench's Stages rows with a hovered row's
// generated line, the talent hover's generated lines, a gear row and the totals with the
// new labels, the inventory's three columns, and the new rounds' icons on the contact
// sheet. Under the hook the sim holds still between steps; flashes are held by slowing tweens.

const SHOTS = 'docs/review/039';

/** ?playtest at the bench with the shrine claimed, every Frost round crafted once (047: in C; bombs and ley bolts carried). */
async function atBench(page: Page): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    h.walkTo(21.7 * 32, 9.5 * 32);
    for (const row of ['frost-rune-bomb', 'frost-rune-bomb', 'frost-rune-ley-bolt', 'frost-rune-ley-bolt', 'frost-rune-landmine', 'cluster-die-bomb']) g.craft(row);
  });
  // The playtest's schematics bank on the way in: let their banners play out (fast) so they cover nothing.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

/** Out to the meadow with a pack of Husks ahead, `slot` selected. */
async function toMeadow(page: Page, slot: string): Promise<void> {
  await page.evaluate((s) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    // South of the ruin field (017), on open ground.
    h.walkTo((44.5 + h.ox) * 32, (19.5 + h.oy) * 32);
    window.__helpers?.hold(s);
    g.spawnChampionPack(['husk', 'husk', 'husk'], null);
    g.step(20);
  }, slot);
  await cameraSettled(page);
  // The door's fade back in runs on real time (not the sim): let it finish before a capture. Timing only, never proof.
  await page.waitForTimeout(10 * DOOR_FADE_MS);
}

test.describe('review screenshots (039)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/039');

  test('a Frost bomb and a Frost ley bolt in flight, and a Cold Burst', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    await toMeadow(page, 'bomb+frost');
    const flying = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.step(0).player;
      g.step(1, { use: true, aimX: p.x + 150, aimY: p.y - 20 });
      return g.step(14).bombs.map((b) => b.keywords);
    });
    expect(flying[0]).toEqual(['bomb', 'lob', 'burst', 'cold']);
    await page.screenshot({ path: `${SHOTS}/01-frost-bomb-in-flight.png` });
    // Its Burst, the flash slowed so the capture catches it, the Husks round it chilled.
    const burst = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.tweenSpeed(0.03);
      let s = g.step(0);
      for (let t = 0; t < 120 && s.events.bursts.length === 0; t++) s = g.step(1);
      return s.events.bursts[0]?.damageType;
    });
    expect(burst).toBe('cold');
    await page.evaluate(() => window.__GAME__?.step(2));
    await page.screenshot({ path: `${SHOTS}/02-cold-burst.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    const bolt = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      window.__helpers?.hold('ley-bolt+frost');
      g.step(60);
      const p = g.step(0).player;
      g.step(1, { use: true, aimX: p.x + 200, aimY: p.y + 60 });
      return g.step(5).arrows.map((a) => a.ammoId);
    });
    expect(bolt).toContain('ley-bolt+frost');
    await page.screenshot({ path: `${SHOTS}/03-frost-ley-bolt-in-flight.png` });
  });

  test('a gear row with the new labels', async ({ page }) => {
    test.setTimeout(120_000);
    await atBench(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { identify: true });
      const s = g.step(1);
      // The Wardstone and the Rare boots and body: relic, roll and regen affixes in their new words.
      for (const p of s.gear.filter((x) => x.relic !== null || x.slot === 'boots' || x.slot === 'body')) g.step(1, { equip: { id: p.id } });
      g.step(120);
    });
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.open).toBe(true);
    // 047: the bench's Stages rows are gone (tagged rounds are crafted in C), so 04-bench-stages-rows is no longer taken.
    const totals = (await ui(page))?.gearPanel?.totals ?? [];
    expect(totals[0]).toMatch(/^Armor \d+ · Max health \d+ · Field regen \d+\.\d HP\/s$/);
    expect(totals[1]).toMatch(/^Move speed \d+% · Roll cooldown \d\.\d s · Roll distance \d+%$/);
    // The worn relic's row (the Wardstone, a helm): its rule as a generated line under its affixes.
    const tab = (await ui(page))?.gearPanel?.tabs.find((t) => t.slot === 'helm');
    if (!tab) throw new Error('no helm tab');
    const at = await screenPoint(page, tab.box.x + tab.box.w / 2, tab.box.y + tab.box.h / 2);
    await page.mouse.click(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.gearPanel?.tab).toBe('helm');
    await expect.poll(async () => (await ui(page))?.gearPanel?.rows.find((r) => r.worn)?.texts[3] ?? '').toBe('After 6.0 s unhit, the next hit is blocked');
    await page.mouse.move(at.x, at.y - 200);
    await page.screenshot({ path: `${SHOTS}/05-gear-rows-and-totals.png` });
  });

  test('the talent hover’s generated lines', async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page, '?playtest');
    await page.keyboard.press('t');
    await expect.poll(async () => (await ui(page))?.talents.open).toBe(true);
    const k1 = (await ui(page))?.talents.nodes.find((n) => n.id === 'k1');
    if (!k1) throw new Error('no Blastfletch');
    const at = await screenPoint(page, k1.x, k1.y);
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.talents.hover?.text).toBe('Bomb: each Burst leaves a Pool for 0.3 s · Arrow: through a Pool, its next hit deals ×1.5 damage and Bursts');
    await page.screenshot({ path: `${SHOTS}/06-talent-hover-blastfletch.png` });
    const b2 = (await ui(page))?.talents.nodes.find((n) => n.id === 'b2');
    if (!b2) throw new Error('no Wide Casing');
    const at2 = await screenPoint(page, b2.x, b2.y);
    await page.mouse.move(at2.x, at2.y);
    await expect.poll(async () => (await ui(page))?.talents.hover?.text).toBe('Burst: +15% radius');
    await page.screenshot({ path: `${SHOTS}/07-talent-hover-wide-casing.png` });
  });

  test('the inventory’s three columns with the new rounds', async ({ page }) => {
    test.setTimeout(60_000);
    await atBench(page);
    await page.keyboard.press('i');
    await expect.poll(async () => (await ui(page))?.inventory?.open).toBe(true);
    // The panel fades in on real time: let it finish before the capture. Timing only, never proof.
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/08-inventory-three-columns.png` });
  });

  test('the new rounds’ icons on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Frost rounds on every family (039)')).toBeVisible();
    await row('Frost rounds on every family (039)').screenshot({ path: `${SHOTS}/09-sheet-frost-rounds.png` });
  });
});
