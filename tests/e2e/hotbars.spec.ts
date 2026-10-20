import { expect, test, type Page } from '@playwright/test';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, watchErrors } from './helpers';
import { screenPoint, state } from './foundryPage';
import { drag, slotPoint } from './gridPage';
import { feedLines, toIntake, ui } from './intakePage';

// 047 (note 11, 12): two hotbars. Left click fires the intake's volley (or punches with it dry); the carried bar
// (keys 1–5) picks an item and right click uses it; neither does the other's job. A stack dragged from the grid
// inventory onto a carried slot goes there; the grid sorts and scrolls.

/** The carried slot holding a kind, from the sim. */
const slotOf = async (page: Page, itemId: string) => (await state(page)).hotbar.slots.indexOf(itemId);

test('on the real clock: a key picks the landmines, right click throws one, left click punches and never throws', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // The playtest's open ground is quiet enough with the world running: the sim on its own clock, the mouse in play.
  const slot = await slotOf(page, 'landmine');
  expect(slot).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(slot + 1));
  await expect.poll(async () => (await state(page)).hotbar.selected).toBe(slot);
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.selected).toBe(slot);
  const before = await state(page);
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  // Right of the player, in the open.
  const at = { x: box.x + box.width * 0.62, y: box.y + box.height * 0.45 };
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).tube.meleeCooldown, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.mouse.up();
  expect((await state(page)).inventory.landmine).toBe(before.inventory.landmine);
  await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await state(page)).inventory.landmine ?? 0, { timeout: 15_000 }).toBeLessThan(before.inventory.landmine ?? 0);
  await page.mouse.up({ button: 'right' });
  expect(errors).toEqual([]);
});

test('left click fires the volley and never the selected landmine; right click throws the landmine and never the volley', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await toIntake(page);
  const fed = await feedLines(page, [{ tx: 12, itemId: 'arrow', amount: 'half' }], 10);
  expect(fed.intake.entrances[1]?.count ?? 0).toBeGreaterThan(0);
  const shots = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    h.hold('landmine');
    const s0 = g.step(0);
    const aim = { aimX: s0.player.x + 120, aimY: s0.player.y };
    const left = g.step(1, { fire: true, ...aim });
    g.step(60);
    const before = g.step(0);
    const right = g.step(1, { use: true, ...aim });
    return {
      left: { fromReservoir: left.tube.fromReservoir, landmines: left.inventory.landmine, shots: left.events.shots.map((e) => e.ammoId) },
      right: { entrance: right.intake.entrances[1]?.count, before: before.intake.entrances[1]?.count, shots: right.events.shots.map((e) => e.ammoId), landmines: right.inventory.landmine, was: before.inventory.landmine },
    };
  });
  expect(shots.left.fromReservoir).toBe(true);
  expect(shots.left.shots).toEqual(['arrow']);
  expect(shots.left.landmines).toBe(fed.inventory.landmine);
  expect(shots.right.shots).toEqual(['landmine']);
  expect(shots.right.entrance).toBe(shots.right.before);
  expect(shots.right.landmines).toBe((shots.right.was ?? 0) - 1);
  expect(errors).toEqual([]);
});

test('a stack dragged from the grid onto a carried slot goes there; Sort orders the grid, and the wheel scrolls it', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  // The fifth carried slot starts empty (the playtest carries four rounds).
  expect((await state(page)).hotbar.slots[4]).toBeNull();
  const from = await slotPoint(page, 'ley-bolt');
  const cell = hotbarCells()[4];
  if (!cell) throw new Error('no fifth slot');
  const to = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await drag(page, from, to);
  await expect.poll(async () => (await state(page)).hotbar.slots[4]).toBe('ley-bolt');
  // A kind is on the bar once: its old slot is empty now.
  expect((await state(page)).hotbar.slots.filter((s) => s === 'ley-bolt')).toHaveLength(1);
  // A raw dropped on the bar goes nowhere.
  const wood = await slotPoint(page, 'wood');
  await drag(page, wood, to);
  await page.waitForTimeout(100);
  expect((await state(page)).hotbar.slots).not.toContain('wood');

  // Sort: Raw first (031's groups), then item order (husk resin is the first raw).
  const sort = (await ui(page))?.inventory.sort;
  if (!sort) throw new Error('no Sort');
  const s = await screenPoint(page, sort.x + sort.w / 2, sort.y + sort.h / 2);
  await page.mouse.click(s.x, s.y);
  await expect.poll(async () => (await state(page)).bag[0]).toBe('husk-resin');
  // The playtest carries more than 40 stacks: the wheel scrolls the grid a row.
  expect((await ui(page))?.inventory.rows ?? 0).toBeGreaterThan(5);
  const panel = (await ui(page))?.inventory.panel;
  if (!panel) throw new Error('no panel');
  const mid = await screenPoint(page, panel.x + panel.w / 2, panel.y + panel.h / 2);
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await ui(page))?.inventory.scroll).toBe(1);
  expect(errors).toEqual([]);
});
