import { expect, test, type Page } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { BOSS_LOOK } from '../../src/data/arenaAssets';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { FOUNDRY_MAP } from '../../src/data/foundryMap';
import { bossBarBottom } from '../../src/render/bossLook';
import { foundryMapBox } from '../../src/render/foundryMap';
import { boot, cameraSettled, watchErrors } from './helpers';
import { bootSandbox, hidePanel } from './sandboxPage';
import { goalTo, newGameInFoundry } from './guidedPage';
import { walkTo } from './blueprintPage';
import { centre, clickBar, pieceAt, screenPoint, state, STAND, step, toggleBuild } from './foundryPage';

// fix-playtest-ui, from the agent playtest (docs/brainstorm/2026-10-26-agent-playtest.md on its branch): the boss bar
// no longer covers a boss north of the player, the objective band wraps at the corner map's width and lets build
// clicks through, and the bench screen points at Identify all while that's the goal.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('the camera eases up so the Forgewright shows whole below the boss bar, 5 tiles north of the player', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await hidePanel(page);
  const boss = { x: (ANVIL_ARENA.start.tx + 0.5) * TILE_SIZE, y: (ANVIL_ARENA.start.ty + 0.5) * TILE_SIZE };
  await page.evaluate((b) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    h.enterArena('anvil-hall');
    h.walkTo(b.x, b.y + 5 * 32);
  }, boss);
  await expect.poll(async () => (await ui(page))?.bossBar?.name, { timeout: 15_000 }).toBe('Forgewright');
  await cameraSettled(page, 20_000);
  const view = await ui(page);
  const f = (await state(page)).enemies.find((e) => e.enemyId === 'forgewright');
  if (!view || !f) throw new Error('no fight');
  // The camera sits above the player, toward the boss, and the boss's top is clear of the bar (and its heat gauge).
  expect(view.camera.y).toBeLessThan(view.camera.player.y - TILE_SIZE);
  const top = f.y - (BOSS_LOOK.heights.forgewright ?? 0) - (view.camera.y - VIEW_HEIGHT / 2);
  expect(top).toBeGreaterThanOrEqual(bossBarBottom(true));
  expect(errors).toEqual([]);
});

test("a long goal wraps inside the corner map's width, under it, and build clicks under it place pieces", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const at = centre(STAND.tx, STAND.ty);
  await walkTo(page, at.x, at.y);
  await cameraSettled(page);
  await goalTo(page, "Restore the intake's fourth entrance (E with the Forgewright core)");
  let objective = (await ui(page))?.objective;
  await expect.poll(async () => (objective = (await ui(page))?.objective)?.lines ?? 0).toBeGreaterThan(1);
  const band = objective?.box;
  if (!objective || !band) throw new Error('no objective band');
  expect(band.w).toBeLessThanOrEqual(objective.capWidth + 0.5);
  expect(band.x + band.w).toBeLessThanOrEqual(VIEW_WIDTH);
  const map = foundryMapBox();
  expect(band.y).toBeGreaterThanOrEqual(map.y + map.h + FOUNDRY_MAP.frame.width);
  // In build mode a conduit goes down on a floor tile under the band.
  await toggleBuild(page);
  await clickBar(page, 'conduit');
  const view = await ui(page);
  if (!view) throw new Error('no ui');
  const left = view.camera.x - VIEW_WIDTH / 2;
  const top = view.camera.y - VIEW_HEIGHT / 2;
  const passable = await page.evaluate(() => window.__GAME__?.passable() ?? []);
  const s = await state(page);
  let spot: { tx: number; ty: number; vx: number; vy: number } | null = null;
  for (let vy = band.y + 4; vy < band.y + band.h - 2 && !spot; vy += 4) {
    for (let vx = band.x + 4; vx < band.x + band.w - 2 && !spot; vx += 4) {
      const tx = Math.floor((left + vx) / TILE_SIZE);
      const ty = Math.floor((top + vy) / TILE_SIZE);
      // A floor tile with nothing on it, its centre inside the band.
      const c = { x: (tx + 0.5) * TILE_SIZE - left, y: (ty + 0.5) * TILE_SIZE - top };
      const inBand = c.x > band.x + 1 && c.x < band.x + band.w - 1 && c.y > band.y + 1 && c.y < band.y + band.h - 1;
      if (inBand && passable[ty]?.[tx] === '.' && !pieceAt(s, tx, ty)) spot = { tx, ty, vx: c.x, vy: c.y };
    }
  }
  if (!spot) throw new Error('no free floor tile under the band');
  const p = await screenPoint(page, spot.vx, spot.vy);
  await page.mouse.click(p.x, p.y);
  const placed = spot;
  await expect.poll(async () => pieceAt(await step(page, 1), placed.tx, placed.ty)?.pieceId).toBe('conduit');
  expect(errors).toEqual([]);
});

test('the bench screen points at Identify all while the goal is to identify (Shaun)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await newGameInFoundry(page);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(21.7 * 32, 9.5 * 32);
    const p = g.getState().player;
    g.drop('unidentified-armor', p.x, p.y);
    g.step(20);
  });
  await goalTo(page, 'Identify your armor at the bench (E)');
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.gearPanel?.open, { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await ui(page))?.gearPanel?.guide?.target).toBe('identify');
  const guide = (await ui(page))?.gearPanel?.guide;
  const button = (await ui(page))?.gearPanel?.identify;
  if (!guide || !button) throw new Error('no Identify arrow');
  expect(guide.box).toEqual({ x: button.x, y: button.y, w: button.w, h: button.h });
  const p = await screenPoint(page, guide.box.x + guide.box.w / 2, guide.box.y + guide.box.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await step(page, 1)).gear.length).toBe(1);
  // Identified: the goal moves on to wearing it, and the arrow with it.
  await expect.poll(async () => (await ui(page))?.gearPanel?.guide?.target).not.toBe('identify');
  expect(errors).toEqual([]);
});
