import { expect, test } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { ITEMS } from '../../src/data/items';
import { FEET_BOX } from '../../src/data/player';
import { OVERWORLD } from '../../src/data/overworld';
import { buildBarCells, menuRows } from '../../src/render/foundryLayout';
import { centre, clickBar, enterFoundry, pieceAt, screenPoint, standStill, state, step, tileOnCanvas, toggleBuild } from './foundryPage';
import { boot, watchErrors } from './helpers';

// The overworld (017) the camera is clamped to.
const HALL_W = OVERWORLD.width * TILE_SIZE;
const HALL_H = OVERWORLD.height * TILE_SIZE;

// 015: the sorter built and set with the mouse and keys, the build bar's
// descriptions, names on mouse-over, and clicks on the HUD never firing.

test('a sorter placed and flipped with the mouse, set from its picker, sends its item out the side, and Clear sends the rest out the front', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  await toggleBuild(page);
  // A hopper feeding down into the sorter, crates on its front and (flipped) right side.
  await step(page, 1, { place: { pieceId: 'hopper', tx: 12, ty: 8, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'crate', tx: 12, ty: 10, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'crate', tx: 13, ty: 9, facing: 'down' } });

  await clickBar(page, 'sorter');
  // Hovering the bar shows the sorter's description.
  const cell = buildBarCells((await state(page)).unlocked).find((c) => c.pieceId === 'sorter');
  if (!cell) throw new Error('no sorter cell');
  const over = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.move(over.x, over.y);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__GAME__?.ui().buildTip)).toBe('sorter');

  // R turns the ghost from right to down. Facing down it sorts left; G flips it to sort right, into the side crate.
  await page.keyboard.press('r');
  await page.waitForTimeout(60);
  await page.keyboard.press('g');
  await page.waitForTimeout(60);
  const at = await tileOnCanvas(page, 12, 9);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(50);
  const placed = await step(page, 1);
  expect(pieceAt(placed, 12, 9)).toMatchObject({ pieceId: 'sorter', facing: 'down', mirrored: true, filter: null });
  expect(await page.evaluate(() => window.__GAME__?.ui().hoverName)).toBe('Sorter');

  // Fill the hopper with the 30 starting arrows, then stand by the sorter and pick arrows from its menu.
  const hopper = pieceAt(placed, 12, 8);
  if (!hopper) throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopper.id, itemId: 'arrow', amount: 'all' }, toggleBuild: true });
  const beside = centre(11, 9);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [beside.x, beside.y] as const);
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const rows = menuRows(1 + Object.keys(ITEMS).length);
  const pick = async (index: number): Promise<void> => {
    await page.keyboard.press('e');
    await page.waitForTimeout(100);
    const row = rows[index];
    if (!row) throw new Error(`no row ${index}`);
    const r = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
    await page.mouse.click(r.x, r.y);
    await page.waitForTimeout(50);
  };
  await pick(1 + Object.keys(ITEMS).indexOf('arrow'));
  expect(pieceAt(await step(page, 1), 12, 9)).toMatchObject({ filter: 'arrow' });

  // Some arrows go out the side; then Clear passes the rest out the front.
  await step(page, 120);
  await pick(0);
  expect(pieceAt(await step(page, 1), 12, 9)).toMatchObject({ filter: null });
  const ran = await step(page, 900);
  const side = pieceAt(ran, 13, 9);
  const front = pieceAt(ran, 12, 10);
  if (side?.kind !== 'crate' || front?.kind !== 'crate') throw new Error('no crates');
  expect(side.contents.arrow ?? 0).toBeGreaterThan(0);
  expect(front.contents.arrow ?? 0).toBeGreaterThan(0);
  expect((side.contents.arrow ?? 0) + (front.contents.arrow ?? 0)).toBe(30);
  expect(errors).toEqual([]);
});

test('hovering a Husk names it, and a press that starts on the hotbar never fires', async ({ page }) => {
  // About 22 s alone: room for parallel workers.
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const s = await step(page, 0);
  const husk = s.enemies.find((e) => e.room === s.room);
  if (!husk) throw new Error('no husk');
  // Walk close so the Husk is on screen, without waking it.
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [husk.x - 220, husk.y + 60] as const);
  await page.waitForTimeout(1500);
  const now = await step(page, 0);
  const target = now.enemies.find((e) => e.id === husk.id);
  if (!target) throw new Error('husk gone');
  // The camera follows the player's sprite (feet box bottom), clamped to the room.
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), hi);
  const camX = clamp(now.player.x - VIEW_WIDTH / 2, HALL_W - VIEW_WIDTH);
  const camY = clamp(now.player.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2, HALL_H - VIEW_HEIGHT);
  const p = await screenPoint(page, target.x - camX, target.y - 12 - camY);
  // Under load the camera can take a while to settle on the player: keep nudging the mouse until it does.
  await expect
    .poll(
      async () => {
        await page.mouse.move(p.x + 1, p.y);
        await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(100);
        return page.evaluate(() => window.__GAME__?.ui().hoverName);
      },
      { timeout: 30_000 },
    )
    .toBe('Husk');

  // Back on the real-time clock: a press that starts on the hotbar never fires, even dragged out into the world.
  await page.reload();
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  await page.waitForTimeout(500);
  const slot = await screenPoint(page, VIEW_WIDTH / 2, VIEW_HEIGHT - 18);
  const world = await screenPoint(page, VIEW_WIDTH / 2 + 120, VIEW_HEIGHT / 2);
  const start = await state(page);
  const before = start.inventory.arrow;
  // 047: carried arrows go out on right click.
  await page.mouse.move(slot.x, slot.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(world.x, world.y, { steps: 4 });
  // Held, dragged into the world, while the world runs on: half a second of ticks (waits on the sim, not the clock).
  await expect.poll(async () => (await state(page)).tick, { timeout: 15_000 }).toBeGreaterThan(start.tick + 30);
  await page.mouse.up({ button: 'right' });
  const after = await state(page);
  expect(after.inventory.arrow).toBe(before);
  expect(after.arrows).toEqual([]);
  // A press that starts in the world does fire, so the check above means something: held until a round leaves.
  await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await state(page)).inventory.arrow ?? 0, { timeout: 15_000 }).toBeLessThan(before ?? 0);
  await page.mouse.up({ button: 'right' });
  expect(errors).toEqual([]);
});
