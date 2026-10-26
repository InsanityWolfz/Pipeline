import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { landmarkDef } from '../../src/data/landmarks';
import { OVERWORLD } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { roomById } from '../../src/sim/state';
import { boot, cameraSettled, quietScreen } from './helpers';
import { craftRow, openCraftTab } from './craftPage';
import { screenPoint } from './foundryPage';

// Review screenshots for 070 (REVIEW_SHOTS=1, into docs/review/070): hold-E harvesting, craft max, the empty-tube card,
// greyed slots, the silhouette behind a ruin block, and a grove's glows.

const SHOTS = 'docs/review/070';
const T = 32;
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

/** The bottom HUD's clip: the card and the carried bar, view px. */
async function hudClip(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const a = await screenPoint(page, VIEW_WIDTH / 2 - 120, VIEW_HEIGHT - 80);
  const b = await screenPoint(page, VIEW_WIDTH / 2 + 120, VIEW_HEIGHT);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

async function nearestTree(page: Page) {
  const tree = await page.evaluate(() => {
    const s = window.__GAME__?.step(0);
    if (!s) throw new Error('no game');
    const p = s.player;
    return s.nodes.filter((n) => n.nodeId === 'tree' && n.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  });
  if (!tree) throw new Error('no tree');
  return tree;
}

function spendArrows(page: Page) {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.step(0);
    const aim = { aimX: s.player.x + 100, aimY: s.player.y - 20 };
    for (let t = 0; t < 2000 && (s.inventory.arrow ?? 0) > 0; t++) s = g.step(1, { use: true, ...aim });
    return g.step(1, aim);
  });
}

test.describe('review screenshots (070)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/070');

  test('01 hold E: the second channel on the same tree, one use already cut', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=field');
    const tree = await nearestTree(page);
    await page.evaluate((t) => {
      const g = window.__GAME__;
      window.__helpers?.walkTo(t.x, t.y + 16);
      g?.step(1, { interact: true, interactHeld: true, aimX: t.x, aimY: t.y });
      g?.step(30 + 18, { interactHeld: true });
    }, tree);
    const s = await page.evaluate(() => window.__GAME__?.step(0));
    expect(s?.harvest?.nodeId).toBe(tree.id);
    expect(s?.nodes.find((n) => n.id === tree.id)?.uses).toBe(2);
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-hold-e.png`, clip: await clipAround(page, tree.x, tree.y - 20, 220, 150) });
  });

  test('02 craft max: one Shift-click made every arrow the parts allow, one feed line', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=field');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const p = g.step(0).player;
      for (const [i, id] of ['shaft', 'arrowhead', 'rope'].entries()) for (let k = 0; k < 4; k++) g.drop(id, p.x + 30 + k * 10, p.y + 20 + i * 12);
      h.collect();
      g.step(1);
    });
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await openCraftTab(page, 'arrow');
    const row = await craftRow(page, 'arrow');
    const at = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.keyboard.down('Shift');
    await page.mouse.click(at.x, at.y);
    await page.keyboard.up('Shift');
    await expect.poll(async () => (await ui(page))?.pickupFeed.find((l) => l.itemId === 'arrow')?.count).toBe(32);
    await page.screenshot({ path: `${SHOTS}/02-craft-max.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('03 the empty tube card: right click fires carried', async ({ page }) => {
    await boot(page, '?start=field&attuned');
    await page.evaluate(() => window.__GAME__?.step(1));
    await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.labels).toEqual(['Tube empty · RMB fires carried']);
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/03-empty-tube-card.png`, clip: await hudClip(page) });
  });

  test('04 greyed slots: the arrows spent, a bomb slot run dry', async ({ page }) => {
    await boot(page, '?start=field&attuned');
    await page.evaluate(() => window.__GAME__?.step(1, { assignSlot: { slot: 2, itemId: 'bomb' } }));
    await spendArrows(page);
    await expect.poll(async () => (await ui(page))?.hud?.hotbar.slots.filter((s) => s.greyed).length).toBe(2);
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/04-greyed-slots.png`, clip: await hudClip(page) });
  });

  test('05 the silhouette behind a ruin block', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=field');
    const start = await page.evaluate(() => window.__GAME__?.step(0).player);
    if (!start) throw new Error('no player');
    const rows = roomById(OVERWORLD.id).rows;
    const sx = Math.floor(start.x / T);
    const sy = Math.floor(start.y / T);
    let block: { tx: number; ty: number; d: number } | null = null;
    for (let ty = sy - 20; ty < sy + 20; ty++) {
      for (let tx = sx - 25; tx < sx + 25; tx++) {
        const lone = rows[ty]?.[tx] === TILE.ruinBlock && [rows[ty - 1]?.[tx], rows[ty]?.[tx - 1], rows[ty]?.[tx + 1], rows[ty + 1]?.[tx]].every((t) => t === TILE.floor);
        const d = Math.abs(tx - sx) + Math.abs(ty - sy);
        if (lone && (!block || d < block.d)) block = { tx, ty, d };
      }
    }
    if (!block) throw new Error('no lone ruin block');
    await page.evaluate((b) => {
      const g = window.__GAME__;
      window.__helpers?.walkTo((b.tx + 0.5) * 32, (b.ty - 0.5) * 32);
      for (let i = 0; i < 20; i++) g?.step(1, { moveY: 1 });
      g?.step(1, { aimX: (b.tx + 3) * 32, aimY: (b.ty + 1) * 32 });
    }, block);
    await expect.poll(async () => (await ui(page))?.silhouette).toBe(true);
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/05-silhouette.png`, clip: await clipAround(page, (block.tx + 0.5) * T, block.ty * T, 200, 140) });
  });

  test("06 the Old Grove: every harvestable tree glows, a cut one doesn't", async ({ page }) => {
    test.setTimeout(240_000);
    await boot(page, '?start=field');
    const grove = landmarkDef('old-grove').area;
    const trees = await page.evaluate((a) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const inArea = (x: number, y: number) => x >= a.x0 * 32 && x < (a.x1 + 1) * 32 && y >= a.y0 * 32 && y < (a.y1 + 1) * 32;
      const s = g.step(0);
      const ids = s.nodes.filter((n) => n.nodeId === 'tree' && inArea(n.x, n.y));
      // Cut the southmost tree down, its guards put down as the player arrives, so the shot is quiet.
      const cut = [...ids].sort((p, q) => q.y - p.y)[0];
      if (!cut) throw new Error('no grove trees');
      const cx = ((a.x0 + a.x1 + 1) / 2) * 32;
      const cy = cut.y + 16;
      const quiet = () => {
        for (const e of g.step(0).enemies) if (Math.hypot(e.x - cx, e.y - cy) < 480) g.setEnemyHealth(e.id, 0);
        g.setPlayerHealth(100);
        g.step(2);
      };
      h.walkTo(cut.x, cut.y + 120);
      quiet();
      h.walkTo(cut.x, cut.y + 16);
      quiet();
      g.step(1, { interact: true, interactHeld: true });
      g.step(90, { interactHeld: true });
      quiet();
      h.collect();
      // Into the grove's middle, the camera on all of it.
      const my = ((a.y0 + a.y1 + 1) / 2) * 32 + 48;
      h.walkTo(cx, my);
      quiet();
      g.step(1, { aimX: cx + 96, aimY: my - 96 });
      return { ids: ids.map((n) => n.id), cut: cut.id, cx, cy };
    }, grove);
    await expect.poll(async () => (await ui(page))?.nodeGlow.filter((id) => trees.ids.includes(id)).length).toBe(trees.ids.length - 1);
    expect((await ui(page))?.nodeGlow).not.toContain(trees.cut);
    await cameraSettled(page, 20_000);
    await quietScreen(page, 60_000);
    await page.screenshot({ path: `${SHOTS}/06-grove-glows.png` });
  });
});
