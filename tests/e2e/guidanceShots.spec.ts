import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
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

  test('04 a harvestable node glows; a used-up one does not', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?start=field&attuned');
    // The meadow's first two trees (018), four tiles apart: the second cut down, the first still standing.
    const rock = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.step(1);
      const [lit, spent] = s.nodes;
      if (!spent || !lit) throw new Error('no trees');
      h.harvest(1, 3);
      h.walkTo((spent.x + lit.x) / 2 + 120, (spent.y + lit.y) / 2 + 10);
      return { spent: spent.id, lit: lit.id, x: (spent.x + lit.x) / 2, y: (spent.y + lit.y) / 2 };
    });
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    await expect.poll(async () => (await ui(page))?.nodeGlow.includes(rock.lit)).toBe(true);
    expect((await ui(page))?.nodeGlow).not.toContain(rock.spent);
    await page.screenshot({ path: `${SHOTS}/04-node-glow.png`, clip: await clipAround(page, rock.x + 40, rock.y - 20, 300, 200) });
  });

  test('05 the fogged minimap, the foundry named on hover', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?start=field');
    // Up to the stairs and round the ruin field, so a patch of the map is revealed.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const p = g.getState().player;
      h.walkTo(p.x, p.y - 5 * 32);
      h.walkTo(p.x + 12 * 32, p.y - 5 * 32);
      h.walkTo(p.x, p.y);
    });
    await quietScreen(page);
    const foundry = (await ui(page))?.minimap.markers.find((m) => m.kind === 'entrance');
    if (!foundry) throw new Error('no foundry icon');
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const k = canvas.width / VIEW_WIDTH;
    await page.mouse.move(canvas.x + foundry.x * k, canvas.y + foundry.y * k);
    await expect.poll(async () => (await ui(page))?.minimap.hover).toBe('Foundry');
    await page.screenshot({ path: `${SHOTS}/05-fogged-minimap.png`, clip: { x: canvas.x + canvas.width * 0.55, y: canvas.y, width: canvas.width * 0.45, height: canvas.height * 0.32 } });
  });

  test('06 the foundry minimap', async ({ page }) => {
    await boot(page, '?start=tutorial');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo((40.5 + h.ox) * 32, 34.5 * 32);
      g.step(1, { interact: true });
      for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
      g.step(2);
      h.toFoundry();
      g.step(400);
      g.claim('quarry');
      h.walkTo(17.5 * 32, 9.5 * 32);
    });
    await quietScreen(page);
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.foundryMap.shown).toBe(true);
    await page.screenshot({ path: `${SHOTS}/06a-foundry-minimap.png` });
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    await page.screenshot({ path: `${SHOTS}/06b-foundry-minimap-close.png`, clip: { x: canvas.x + canvas.width * 0.66, y: canvas.y, width: canvas.width * 0.34, height: canvas.height * 0.3 } });
  });
});
