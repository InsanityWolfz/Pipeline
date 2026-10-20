import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { DEPTHS } from '../../src/data/assets';
import { nodeDef } from '../../src/data/nodes';
import { craftMenuLines } from '../../src/render/craftMenuLayout';
import { boot, watchErrors } from './helpers';

// Playtest fixes (021): the menu pointer over the crafting menu, no shake on firing,
// and (with REVIEW_SHOTS=1) the review screenshots in docs/review/021.

const SHOTS = 'docs/review/021';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Opens the crafting menu and puts the mouse over the shaft recipe's row. */
async function hoverCraftRow(page: Page): Promise<void> {
  await page.keyboard.press('c');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(true);
  const row = craftMenuLines().find((l) => l.kind === 'recipe' && l.id === 'shaft');
  const box = await page.locator('canvas').boundingBox();
  if (!row || !box) throw new Error('no shaft row or canvas');
  const zoom = box.width / VIEW_WIDTH;
  await page.mouse.move(box.x + (row.x + 40) * zoom, box.y + (row.y + 10) * zoom);
}

test('the crafting menu shows the arrow pointer above everything, and the crosshair returns when it closes', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await page.evaluate(() => window.__GAME__?.step(0));
  await page.mouse.move(300, 300);
  await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('crosshair');
  await hoverCraftRow(page);
  await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('pointer');
  const cursor = (await ui(page))?.cursor;
  expect(cursor?.depth).toBe(DEPTHS.cursor);
  // Above the menu's every layer, and above anything else in the scene.
  expect(cursor?.depth).toBeGreaterThan(DEPTHS.menu + 10);
  expect(cursor?.depth).toBeGreaterThan(cursor?.topOtherDepth ?? Infinity);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(false);
  await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('crosshair');
  expect((await ui(page))?.cursor?.depth).toBe(DEPTHS.cursor);
  expect(errors).toEqual([]);
});

test('firing shakes nothing, whatever the ammo; a bomb burst still shakes', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => window.__GAME__?.step(0));
  const before = (await ui(page))?.shakes.length ?? 0;
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    const p = s.player;
    let shots = 0;
    // Arrows, then ley bolts, east into open ground.
    for (const ammo of ['arrow', 'ley-bolt'] as const) {
      g.step(1, { selectAmmo: ammo });
      for (let t = 0; t < 40; t++) shots += g.step(1, { fire: true, aimX: p.x + 200, aimY: p.y }).events.shots.length;
    }
    // Then one bomb, lobbed a few tiles away; wait for its burst.
    g.step(1, { selectAmmo: 'bomb' });
    let thrown = 0;
    for (let t = 0; t < 120 && thrown === 0; t++) {
      s = g.step(1, { fire: true, aimX: p.x + 90, aimY: p.y });
      thrown = s.events.shots.length;
    }
    shots += thrown;
    let bursts = 0;
    for (let t = 0; t < 180 && bursts === 0; t++) bursts += g.step(1).events.bursts.length;
    return { shots, bursts };
  });
  expect(result.shots).toBeGreaterThanOrEqual(4);
  expect(result.bursts).toBe(1);
  // The burst's shake reaches the log once a frame draws; the shots before it added none.
  await expect.poll(async () => (await ui(page))?.shakes.slice(before) ?? []).toContain('medium');
  const shakes = (await ui(page))?.shakes.slice(before) ?? [];
  expect(shakes).not.toContain('small');
  expect(shakes).toEqual(['medium']);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (021)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/021');

  test('the crafting menu with the pointer over a row', async ({ page }) => {
    await boot(page, '?start=field&attuned');
    await page.evaluate(() => window.__GAME__?.step(0));
    await hoverCraftRow(page);
    await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('pointer');
    await page.screenshot({ path: `${SHOTS}/01-craft-menu-pointer.png` });
  });

  test('the arrowhead icon', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    await expect(fig('item-arrowhead')).toBeVisible();
    await fig('item-arrowhead').screenshot({ path: `${SHOTS}/02-arrowhead.png` });
    // Beside it, the shaft and arrow icons it must not have changed.
    await fig('item-shaft').screenshot({ path: `${SHOTS}/02-shaft-unchanged.png` });
    await fig('icon-arrow').screenshot({ path: `${SHOTS}/02-arrow-unchanged.png` });
  });

  test('a log picked up from behind a tree slides into the player', async ({ page }) => {
    await boot(page, '?start=field');
    await page.evaluate(() => window.__GAME__?.step(0));
    // The playtest case: the player south of a tree, a log lying north of it, the tree between.
    const tree = await page.evaluate((half) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      const n = g?.getState().nodes.find((node) => node.nodeId === 'tree' && node.room === 'overworld');
      if (!g || !h || !n) throw new Error('no game or tree');
      h.walkTo(n.x, n.y + 16);
      g.drop('wood', n.x + 34, n.y - half - 4);
      return { x: n.x, y: n.y };
    }, nodeDef('tree').feetBox.h / 2);
    // The log lying behind the tree, before the tick that picks it up (for the picture only).
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/03a-log-behind-tree.png` });
    // 045: the magnet pulls it in through the tree over a few ticks, then it's picked up.
    const s = await page.evaluate(() => {
      window.__GAME__?.tweenSpeed(0.04);
      let out = window.__GAME__?.step(1);
      for (let t = 0; t < 40 && out?.events.pickups.length === 0; t++) out = window.__GAME__?.step(1);
      return out;
    });
    expect(s?.events.pickups.map((p) => p.itemId)).toEqual(['wood']);
    expect(s?.player.y).toBeGreaterThan(tree.y);
    await expect.poll(async () => (await ui(page))?.sliding).toBeGreaterThan(0);
    // Freeze it partway in (the slide is slowed 25× until then).
    await expect.poll(async () => (await ui(page))?.slideProgress ?? 0).toBeGreaterThan(0.35);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/03b-log-sliding-in.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await expect.poll(async () => (await ui(page))?.sliding).toBe(0);
  });
});
