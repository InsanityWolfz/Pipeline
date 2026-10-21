import { expect, test, type Page } from '@playwright/test';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, quietScreen } from './helpers';

// Review screenshots for 051 (REVIEW_SHOTS=1, into docs/review/051): an edge arrow, the arrow over a hopper with its
// raw's icon, the bomb goal's sub-lines with icons, a glowing node, the fogged minimap, the foundry minimap and the
// right-click mouse icon beside the carried bar.

const SHOTS = 'docs/review/051';
const T = 32;
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
const goal = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);

test.describe('review screenshots (051)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/051');

  test('01 an edge arrow toward an off-screen goal', async ({ page }) => {
    await boot(page, '?start=tutorial');
    await page.evaluate((x) => {
      const h = window.__helpers;
      const g = window.__GAME__;
      if (!h || !g) throw new Error('no game');
      h.walkTo(x, g.getState().player.y);
    }, (OVERWORLD.startStone.tx + 15.5) * T);
    await quietScreen(page);
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.waypoint?.mode).toBe('edge');
    await page.screenshot({ path: `${SHOTS}/01-edge-arrow.png` });
  });

  test('02 the arrow over each hopper with its raw', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    await page.evaluate((n) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo((40.5 + h.ox) * 32, 34.5 * 32);
      g.step(1, { interact: true });
      for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
      g.step(2);
      g.completeObjectives(n);
      h.toFoundry();
      g.step(400);
      // Out in the field, the tube fires until the example line has sent up its last arrow (046).
      h.toHall();
      let x = g.step(1);
      for (let t = 0; t < 20000 && !x.lineRanDry; t++) {
        if (t % 60 === 0) g.setPlayerHealth(100);
        x = g.step(1, { fire: true, aimX: x.player.x + 200, aimY: x.player.y });
      }
      h.toFoundry();
      h.walkTo(12.5 * 32, 8.5 * 32);
    }, goal('Refill the hoppers with wood, stone and fiber (E)'));
    await quietScreen(page);
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.waypoint?.icons.length ?? 0, { timeout: 20_000 }).toBe(3);
    await page.screenshot({ path: `${SHOTS}/02-hopper-arrows.png` });
  });

  test('03 the bomb goal with its sub-lines', async ({ page }) => {
    await boot(page, '?start=tutorial');
    await page.evaluate((n) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.completeObjectives(n);
      g.step(2);
      g.drop('stone', g.getState().player.x + 4, g.getState().player.y);
      h.collect();
      g.step(2);
    }, goal('Craft bombs and ley bolts (C)'));
    await quietScreen(page);
    await expect.poll(async () => (await ui(page))?.objective.subSteps.some((s) => s.done)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/03-sub-steps.png` });
  });
});
