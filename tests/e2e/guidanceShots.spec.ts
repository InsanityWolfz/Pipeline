import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, quietScreen } from './helpers';

// Review screenshots for 051 (REVIEW_SHOTS=1, into docs/review/051): an edge arrow, (until 067) the arrow over a hopper
// with its raw's icon, the bomb goal's sub-lines with icons, a glowing node, the fogged minimap, the foundry minimap and the
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

  // 02 (the arrow over each refill hopper with its raw) went with 067: the refill goal and the example line's hoppers
  // are gone, so docs/review/051/02-hopper-arrows.png stays as it was taken and can't be retaken.

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
    }, goal('Craft bombs (C)'));
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
      h.walkTo((40.5 + h.ox) * 32, (34.5 + h.oy) * 32);
      g.step(1, { interact: true });
      for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
      // 067: the shrine's claim opens the foundry's stairs.
      g.claim('shrine');
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

  test('07 the mouse beside the carried bar, and the slot swap as the attune ends', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?start=field');
    await quietScreen(page);
    await expect.poll(async () => (await ui(page))?.hud?.carriedHint.shown).toBe(true);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const bottom = { x: canvas.x + canvas.width * 0.3, y: canvas.y + canvas.height * 0.72, width: canvas.width * 0.4, height: canvas.height * 0.28 };
    await page.screenshot({ path: `${SHOTS}/07a-mouse-icon.png`, clip: bottom });
    const pulse = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      return g.step(1).link.attunePulse;
    });
    await quietScreen(page);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await page.evaluate((t) => window.__GAME__?.step(t), pulse);
    await expect.poll(async () => (await ui(page))?.hud?.carriedHint.swapping).toBe(true);
    // Half way through the shrink (the tweens slowed to a twentieth), then held still for the shot.
    await expect.poll(async () => (await ui(page))?.hud?.carriedHint.progress ?? 0, { timeout: 30_000, intervals: [50] }).toBeGreaterThanOrEqual(0.5);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/07b-slot-swap.png`, clip: bottom });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });
});
