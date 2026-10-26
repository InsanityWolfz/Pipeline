import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled, watchErrors } from './helpers';
import { centre, screenPoint, state, step, STAND, tileOnCanvas, toggleBuild } from './foundryPage';
import type { UiState } from '../../src/render/testHook';

// Blueprints and area pick-up (063), with the real mouse and keys in ?playtest (the sandbox can't reach the foundry).
// The Area tool (X, or its Tools cell) drags a box over the grid: the box and every piece wholly inside it show while
// dragging, and on release a small menu offers Pick up and Cancel (the save rows wait on the Blueprint table). Pick up
// lifts them all at once into the stash; Esc and right click back out of the menu, then the tool, then build mode.

const ui = (page: Page): Promise<UiState | undefined> => page.evaluate(() => window.__GAME__?.ui());

/** Into the foundry from ?playtest, standing at STAND with the camera settled, in build mode. */
async function buildAtStand(page: Page): Promise<void> {
  await boot(page, '?playtest');
  const at = centre(STAND.tx, STAND.ty);
  await page.evaluate(([x, y]) => {
    window.__GAME__?.step(0);
    window.__helpers?.toFoundry();
    window.__helpers?.walkTo(x, y);
    window.__GAME__?.step(1);
  }, [at.x, at.y] as const);
  await cameraSettled(page);
  await toggleBuild(page);
  expect((await state(page)).building).toBe(true);
}

/** Places pieces through the hook, a tick each. */
async function put(page: Page, pieces: { pieceId: string; tx: number; ty: number; facing: string }[]): Promise<void> {
  for (const place of pieces) await step(page, 1, { place });
}

/** Drags the Area tool's box from one tile to another with the real mouse, holding at the end until `whileHeld` is done. */
async function dragBox(page: Page, from: [number, number], to: [number, number], whileHeld?: () => Promise<void>): Promise<void> {
  const a = await tileOnCanvas(page, ...from);
  const b = await tileOnCanvas(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await whileHeld?.();
  await page.mouse.up();
}

/** Clicks the release menu's row with this text. */
async function clickMenuRow(page: Page, text: string): Promise<void> {
  const row = (await ui(page))?.blueprints.menu?.find((r) => r.text === text);
  if (!row) throw new Error(`no menu row '${text}'`);
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
  await step(page, 1);
}

test('the Area tool drags a box, shows what it counts, and Pick up lifts it all into the stash', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await buildAtStand(page);
  await put(page, [
    { pieceId: 'conduit', tx: 6, ty: 10, facing: 'right' },
    { pieceId: 'cutter', tx: 7, ty: 10, facing: 'right' },
    { pieceId: 'conduit', tx: 9, ty: 10, facing: 'right' },
  ]);
  const before = await state(page);
  const counted = before.foundry.pieces.filter((p) => p.ty === 10 && p.tx <= 7).map((p) => p.id);
  // The Tools cells show in build mode; X takes the Area tool.
  expect((await ui(page))?.blueprints.tools.cells.map((c) => [c.tool, c.locked])).toEqual([
    ['area', false],
    ['list', true],
  ]);
  await page.keyboard.press('x');
  await expect.poll(async () => (await ui(page))?.blueprints.tool).toBe('area');
  await dragBox(page, [6, 10], [8, 10], async () => {
    await expect.poll(async () => (await ui(page))?.blueprints.box).toEqual({ tx0: 6, ty0: 10, tx1: 8, ty1: 10 });
    expect((await ui(page))?.blueprints.counted).toEqual(counted);
  });
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.map((r) => r.text)).toEqual(['Pick up', 'Cancel']);
  await clickMenuRow(page, 'Pick up');
  await expect.poll(async () => (await state(page)).foundry.pieces.map((p) => p.tx)).toEqual([9]);
  expect((await ui(page))?.blueprints.menu).toBeNull();
  expect((await ui(page))?.blueprints.tool).toBe('area');
  expect(errors).toEqual([]);
});

test('Esc backs out of the menu, then the Area tool, then build mode; a right click cancels the menu', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await buildAtStand(page);
  await put(page, [{ pieceId: 'conduit', tx: 6, ty: 10, facing: 'right' }]);
  await page.keyboard.press('x');
  await dragBox(page, [6, 10], [6, 10]);
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.length).toBe(2);
  // A right click over the world cancels the menu; the piece stays.
  const t = await tileOnCanvas(page, 4, 4);
  await page.mouse.click(t.x, t.y, { button: 'right' });
  await expect.poll(async () => (await ui(page))?.blueprints.menu ?? null).toBeNull();
  // An empty box offers only Cancel.
  await dragBox(page, [8, 5], [9, 6]);
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.map((r) => r.text)).toEqual(['Cancel']);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.blueprints.menu ?? null).toBeNull();
  expect((await ui(page))?.blueprints.tool).toBe('area');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.blueprints.tool).toBe('piece');
  expect((await state(page)).building).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await step(page, 1)).building).toBe(false);
  expect((await state(page)).foundry.pieces.some((p) => p.tx === 6 && p.ty === 10)).toBe(true);
  expect(errors).toEqual([]);
});
