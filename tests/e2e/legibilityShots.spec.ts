import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, cameraSettled } from './helpers';
import { screenPoint, step } from './foundryPage';
import { ui } from './intakePage';

// Review screenshots for 040 (REVIEW_SHOTS=1, into docs/review/040), each at 640×360 scaled:
// a round's summary and its breakdown (Shift), a talent's summary in the tree's info area, a
// gear piece's breakdown at the bench, the Build tab with a row's breakdown, a glossary entry,
// and an enemy's hover name with its chips. Under the hook the sim holds still between steps.

const SHOTS = 'docs/review/040';

async function hover(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.move(p.x, p.y);
}

/** ?playtest with a few talents taken, so the numbers and Linked show bonuses. */
async function withTalents(page: Page, ...ids: string[]): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate((list) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.gainXp(5000);
    for (const id of list) g.step(1, { takeTalent: id });
  }, ids);
  await step(page, 1);
}

test.describe('review screenshots (040)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/040');

  test('a round’s summary and its breakdown, from the hotbar', async ({ page }) => {
    await withTalents(page, 'a1', 'a2', 't1', 't2', 't3', 'k3', 'b1', 'b2', 'b3', 'k1');
    const cell = hotbarCells().find((c) => c.ammoId === 'arrow');
    if (!cell) throw new Error('no arrow slot');
    await hover(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
    await page.screenshot({ path: `${SHOTS}/01-round-summary.png` });
    await page.keyboard.down('Shift');
    await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('breakdown');
    await page.screenshot({ path: `${SHOTS}/02-round-breakdown.png` });
    await page.keyboard.up('Shift');
  });

  test('a talent’s summary in the tree’s info area', async ({ page }) => {
    await withTalents(page, 'b1', 'b2');
    await page.keyboard.press('t');
    await expect.poll(async () => (await ui(page))?.talents.open).toBe(true);
    const node = (await ui(page))?.talents.nodes.find((n) => n.id === 'b2');
    if (!node) throw new Error('no Wide Casing');
    await hover(page, node.x, node.y);
    await expect.poll(async () => (await ui(page))?.tip?.source.id).toBe('b2');
    await page.screenshot({ path: `${SHOTS}/03-talent-summary.png` });
  });

  test('a gear piece’s breakdown at the bench', async ({ page }) => {
    test.setTimeout(120_000);
    await withTalents(page, 's1', 's2');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      h.toFoundry();
      h.walkTo(2.3 * 32, 12.5 * 32);
      g.step(1, { identify: true });
      g.step(60);
    });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
    await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 30_000 }).toBe(true);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.open).toBe(true);
    const row = (await ui(page))?.gearPanel?.rows[0];
    if (!row) throw new Error('no gear row');
    await hover(page, row.box.x + row.box.w / 2, row.box.y + row.box.h / 2);
    await expect.poll(async () => (await ui(page))?.tip?.source.kind).toBe('gear');
    await page.keyboard.down('Shift');
    await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('breakdown');
    await page.screenshot({ path: `${SHOTS}/04-gear-breakdown.png` });
    await page.keyboard.up('Shift');
  });

  test('the Build tab with a row’s breakdown, and a glossary entry', async ({ page }) => {
    await withTalents(page, 'a1', 'b1', 'b2', 'l1', 'l3', 't3');
    await page.keyboard.press('t');
    await expect.poll(async () => (await ui(page))?.talentPanel.open).toBe(true);
    const build = (await ui(page))?.talentPanel.tabs.find((t) => t.id === 'build');
    if (!build) throw new Error('no Build tab');
    const at = await screenPoint(page, build.box.x + build.box.w / 2, build.box.y + build.box.h / 2);
    await page.mouse.click(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.talentPanel.tab).toBe('build');
    const row = (await ui(page))?.buildTab.rows.find((r) => r.round === 'bomb');
    if (!row) throw new Error('no bomb row');
    await hover(page, row.box.x + 40, row.box.y + row.box.h / 2);
    await expect.poll(async () => (await ui(page))?.tip?.source.id).toBe('bomb');
    await page.screenshot({ path: `${SHOTS}/05-build-tab.png` });
    const chip = (await ui(page))?.tip?.chipBoxes.find((c) => c.id === 'burst');
    if (!chip) throw new Error('no Burst chip');
    const c = await screenPoint(page, chip.box.x + chip.box.w / 2, chip.box.y + chip.box.h / 2);
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await ui(page))?.glossary?.keyword).toBe('burst');
    await hover(page, VIEW_WIDTH / 2, VIEW_HEIGHT - 20);
    await page.screenshot({ path: `${SHOTS}/06-glossary-burst.png` });
  });

  test('an enemy’s hover name with its trait and status chips', async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page, '?playtest');
    const at = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(1);
      for (let i = 0; i < 3; i++) g.drop('arrow+frost', s.player.x, s.player.y);
      g.step(5, { selectAmmo: 'arrow' });
      s = g.spawnEnemy('husk', s.player.x + 90, s.player.y, true);
      const id = s.enemies.at(-1)?.id ?? -1;
      g.setEnemyHealth(id, 1000);
      for (let t = 0; t < 60 && (g.getState().enemies.find((e) => e.id === id)?.chill ?? 0) < 2; t++) {
        const e = g.getState().enemies.find((en) => en.id === id);
        if (!e) break;
        g.step(1, { fire: true, aimX: e.x, aimY: e.y - 4 });
      }
      // A few ticks on, so the last hit's flash is over (its Chill lasts 2 s).
      const e = g.step(20).enemies.find((en) => en.id === id);
      return { x: e?.x ?? 0, y: e?.y ?? 0 };
    });
    await cameraSettled(page);
    const cam = (await ui(page))?.camera;
    if (!cam) throw new Error('no camera');
    await hover(page, at.x - (cam.x - VIEW_WIDTH / 2), at.y - 12 - (cam.y - VIEW_HEIGHT / 2));
    await expect.poll(async () => (await ui(page))?.hoverChips.length).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/07-enemy-chips.png` });
  });
});
