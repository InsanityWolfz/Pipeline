import { expect, test, type Page } from '@playwright/test';
import { pieceAt, screenPoint, state, step } from './foundryPage';
import { buildAtStand } from './blueprintPage';
import { cameraStill, tilePoint, ui } from './factoryPage';
import { watchErrors } from './helpers';

// 069: in build mode the mouse wheel over the world steps the camera between 1× and 0.75× so the whole foundry's
// width fits (centred); leaving build mode returns to 1×. Placement and hovers work at both zooms; the wheel over the
// build bar still steps the bar (020).

const zoom = async (page: Page): Promise<number | undefined> => (await ui(page))?.camera.zoom;

/** One wheel notch at a page point. */
async function wheelAt(page: Page, at: { x: number; y: number }, dy: number): Promise<void> {
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, dy);
}

test('the wheel zooms build mode out to 0.75× and back; placing and hovering work zoomed out; leaving build mode is 1×', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await buildAtStand(page);
  expect(await zoom(page)).toBe(1);
  await wheelAt(page, await tilePoint(page, 6, 5), 100);
  await expect.poll(() => zoom(page)).toBe(0.75);
  await cameraStill(page);
  // The foundry's whole width (24 tiles) fits and sits centred.
  expect((await ui(page))?.camera.x).toBeCloseTo((24 * 32) / 2, 0);

  // A hopper picked on the bar (view px, unchanged by the zoom) and clicked onto a tile zoomed out.
  const bar = (await ui(page))?.buildBar?.cells.find((c) => c.pieceId === 'hopper');
  if (!bar) throw new Error('no hopper cell');
  const cell = await screenPoint(page, bar.x + bar.w / 2, bar.y + bar.h / 2);
  await page.mouse.click(cell.x, cell.y);
  await expect.poll(async () => (await ui(page))?.buildBar?.selected).toBe('hopper');
  const at = await tilePoint(page, 3, 5);
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => pieceAt(await step(page, 1), 3, 5)?.pieceId).toBe('hopper');
  // Its hover names it, under the cursor zoomed out.
  await page.mouse.move(at.x + 1, at.y);
  await expect.poll(async () => (await ui(page))?.hoverName).toBe('Hopper');

  // The wheel over the bar steps the bar, and leaves the zoom.
  await wheelAt(page, cell, 100);
  await expect.poll(async () => (await ui(page))?.buildBar?.selected).not.toBe('hopper');
  expect(await zoom(page)).toBe(0.75);

  // Up over the world zooms back in; out again, then B leaves build mode at 1×.
  await wheelAt(page, at, -100);
  await expect.poll(() => zoom(page)).toBe(1);
  await wheelAt(page, at, 100);
  await expect.poll(() => zoom(page)).toBe(0.75);
  await page.keyboard.press('b');
  await expect.poll(async () => (await step(page, 1)).building).toBe(false);
  await expect.poll(() => zoom(page)).toBe(1);
  expect((await state(page)).building).toBe(false);
  expect(errors).toEqual([]);
});
