import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled, watchErrors } from './helpers';
import { centre, screenPoint, state, step, STAND, tileOnCanvas, toggleBuild } from './foundryPage';
import type { UiState } from '../../src/render/testHook';

// Blueprints and area pick-up (063), with the real mouse and keys in ?playtest (the sandbox can't reach the foundry).
// The Area tool (X, or its Tools cell) drags a box over the grid: the box and every piece wholly inside it show while
// dragging, and on release a small menu offers Pick up and Cancel (the save rows wait on the Blueprint table). Pick up
// lifts them all at once into the stash; Esc and right click back out of the menu, then the tool, then build mode.

const ui = (page: Page): Promise<UiState | undefined> => page.evaluate(() => window.__GAME__?.ui());

/** Walks to a world point in the foundry from ?playtest (in from the overworld first if need be). */
async function walkTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([x, y]) => {
    if (window.__GAME__?.step(0).room !== 'foundry') window.__helpers?.toFoundry();
    window.__helpers?.walkTo(x, y);
    window.__GAME__?.step(1);
  }, [x, y] as const);
}

/** Restores the Blueprint table at its diagram on the north wall: E opens its panel, E again restores (033). */
async function restoreTable(page: Page): Promise<void> {
  await walkTo(page, 18.5 * 32, 1.5 * 32);
  await expect
    .poll(async () => {
      if ((await ui(page))?.restorePanel?.node === 'blueprint-table') return true;
      await page.keyboard.press('e');
      return (await ui(page))?.restorePanel?.node === 'blueprint-table';
    })
    .toBe(true);
  await page.keyboard.press('e');
  await expect.poll(async () => (await step(page, 1)).blueprints.unlocked).toBe(true);
}

/** Into the foundry from ?playtest (the Blueprint table restored first if `table`), at STAND with the camera settled, in build mode. */
async function buildAtStand(page: Page, table = false): Promise<void> {
  await boot(page, '?playtest');
  if (table) await restoreTable(page);
  const at = centre(STAND.tx, STAND.ty);
  await walkTo(page, at.x, at.y);
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

test('the restored Blueprint table adds Save rows; a save with all 8 slots full asks which to overwrite', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await buildAtStand(page, true);
  expect((await ui(page))?.blueprints.tools.cells.find((c) => c.tool === 'list')?.locked).toBe(false);
  await put(page, [
    { pieceId: 'cutter', tx: 6, ty: 10, facing: 'right' },
    { pieceId: 'crate', tx: 7, ty: 10, facing: 'right' },
  ]);
  await page.keyboard.press('x');
  await dragBox(page, [6, 10], [7, 10]);
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.map((r) => r.text)).toEqual(['Pick up', 'Save blueprint', 'Save and pick up', 'Cancel']);
  await clickMenuRow(page, 'Save blueprint');
  await expect.poll(async () => (await state(page)).blueprints.list.map((b) => [b.name, b.pieces.length])).toEqual([['Shafts', 2]]);
  expect((await state(page)).foundry.pieces.filter((p) => p.ty === 10)).toHaveLength(2);
  // Fill the other seven through the hook, then save from the menu again: it asks which to overwrite.
  const box = { tx0: 6, ty0: 10, tx1: 7, ty1: 10 };
  for (let i = 0; i < 7; i++) await step(page, 1, { area: { box, action: 'save' } });
  expect((await state(page)).blueprints.list).toHaveLength(8);
  await dragBox(page, [6, 10], [6, 10]);
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.length).toBe(4);
  await clickMenuRow(page, 'Save and pick up');
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.map((r) => r.text)).toEqual(['Overwrite Shafts', ...[2, 3, 4, 5, 6, 7, 8].map((n) => `Overwrite Shafts ${n}`), 'Cancel']);
  await clickMenuRow(page, 'Overwrite Shafts 3');
  await expect.poll(async () => (await state(page)).blueprints.list.map((b) => b.pieces.length)).toEqual([2, 2, 1, 2, 2, 2, 2, 2]);
  // Its name was its own to reuse; the cutter alone went to the stash.
  expect((await state(page)).blueprints.list[2]?.name).toBe('Shafts 3');
  expect((await state(page)).foundry.pieces.filter((p) => p.ty === 10).map((p) => p.pieceId)).toEqual(['crate']);
  expect(errors).toEqual([]);
});

/** Clicks a view-px point on the canvas, then lets a tick take what it sent. */
async function clickAt(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
  await step(page, 1);
}

test('the Blueprints button waits on the table; then P opens the list, a row takes its ghost, and delete asks first', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await buildAtStand(page);
  // Before the table: greyed, its hover says so, and P opens nothing.
  const cell = (await ui(page))?.blueprints.tools.cells.find((c) => c.tool === 'list');
  if (!cell) throw new Error('no Blueprints cell');
  expect(cell.locked).toBe(true);
  const over = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.move(over.x, over.y);
  await expect.poll(async () => (await ui(page))?.blueprints.tools.tip).toBe('Restore the Blueprint table');
  await page.keyboard.press('p');
  await step(page, 1);
  expect((await ui(page))?.blueprints.list.open).toBe(false);
  await toggleBuild(page);

  await restoreTable(page);
  const at = centre(STAND.tx, STAND.ty);
  await walkTo(page, at.x, at.y);
  await cameraSettled(page);
  await toggleBuild(page);
  await put(page, [
    { pieceId: 'frost-rune', tx: 6, ty: 10, facing: 'right' },
    { pieceId: 'crate', tx: 7, ty: 10, facing: 'right' },
    { pieceId: 'cutter', tx: 6, ty: 12, facing: 'right' },
  ]);
  const save = (tx0: number, ty0: number, tx1: number, ty1: number) => step(page, 1, { area: { box: { tx0, ty0, tx1, ty1 }, action: 'save' } });
  await save(6, 10, 7, 10);
  await save(6, 12, 6, 12);
  await save(6, 10, 7, 12);
  await page.keyboard.press('p');
  await expect.poll(async () => (await ui(page))?.blueprints.list.rows.map((r) => [r.name, r.pieces])).toEqual([
    ['Frost arrows', 2],
    ['Shafts', 1],
    ['Frost arrows 2', 3],
  ]);
  expect((await ui(page))?.blueprints.tools.cells.find((c) => c.tool === 'list')?.active).toBe(true);
  // Delete asks first: Cancel keeps it, Delete removes it.
  const del = async () => {
    const row = (await ui(page))?.blueprints.list.rows[1];
    if (!row) throw new Error('no row');
    await clickAt(page, row.del.x + row.del.w / 2, row.del.y + row.del.h / 2);
  };
  await del();
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.map((r) => r.text)).toEqual(['Delete Shafts', 'Cancel']);
  await clickMenuRow(page, 'Cancel');
  expect((await state(page)).blueprints.list).toHaveLength(3);
  await del();
  await clickMenuRow(page, 'Delete Shafts');
  await expect.poll(async () => (await state(page)).blueprints.list.map((b) => b.name)).toEqual(['Frost arrows', 'Frost arrows 2']);
  // A row takes its blueprint as the ghost, and the list closes.
  const row = (await ui(page))?.blueprints.list.rows[1];
  if (!row) throw new Error('no row');
  await clickAt(page, row.box.x + 40, row.box.y + row.box.h / 2);
  await expect.poll(async () => (await ui(page))?.blueprints.tool).toBe('ghost');
  expect((await ui(page))?.blueprints.list.open).toBe(false);
  expect(errors).toEqual([]);
});

test('a frost arrow line saved, picked up, and placed again turned and mirrored, red where it can not go, runs', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await buildAtStand(page, true);
  // A frost arrow line: arrows in from the left, rimestone from below, a crate at its front.
  await put(page, [
    { pieceId: 'hopper', tx: 5, ty: 9, facing: 'right' },
    { pieceId: 'frost-rune', tx: 6, ty: 9, facing: 'right' },
    { pieceId: 'crate', tx: 7, ty: 9, facing: 'right' },
    { pieceId: 'hopper', tx: 6, ty: 10, facing: 'up' },
  ]);
  await page.keyboard.press('x');
  await dragBox(page, [5, 9], [7, 10]);
  await expect.poll(async () => (await ui(page))?.blueprints.menu?.length).toBe(4);
  await clickMenuRow(page, 'Save and pick up');
  await expect.poll(async () => (await state(page)).blueprints.list.map((b) => b.name)).toEqual(['Frost arrows']);
  expect((await state(page)).foundry.pieces.some((p) => p.pieceId === 'frost-rune')).toBe(false);

  // From the list, as the ghost; R turns it, G (flip) mirrors it.
  await page.keyboard.press('p');
  await expect.poll(async () => (await ui(page))?.blueprints.list.rows.length).toBe(1);
  const row = (await ui(page))?.blueprints.list.rows[0];
  if (!row) throw new Error('no row');
  const rp = await screenPoint(page, row.box.x + 40, row.box.y + row.box.h / 2);
  await page.mouse.click(rp.x, rp.y);
  await expect.poll(async () => (await ui(page))?.blueprints.tool).toBe('ghost');
  await page.keyboard.press('r');
  await page.keyboard.press('g');
  // Over two conduits in the way: those tiles show red.
  await put(page, [
    { pieceId: 'conduit', tx: 13, ty: 4, facing: 'up' },
    { pieceId: 'conduit', tx: 14, ty: 4, facing: 'up' },
  ]);
  const blocked = await tileOnCanvas(page, 13, 4);
  await page.mouse.move(blocked.x, blocked.y);
  await expect.poll(async () => (await ui(page))?.blueprints.ghost.red.length ?? 0).toBeGreaterThan(0);
  const ghost = (await ui(page))?.blueprints.ghost.pieces ?? [];
  expect(ghost.map((p) => [p.pieceId, p.facing])).toEqual([
    ['hopper', 'down'],
    ['frost-rune', 'down'],
    ['crate', 'down'],
    ['hopper', 'left'],
  ]);
  expect(ghost.some((p) => p.fail === 'occupied')).toBe(true);

  // On a clear spot, a click places it all; the ghost stays for another.
  const clear = await tileOnCanvas(page, 13, 9);
  await page.mouse.move(clear.x, clear.y);
  await expect.poll(async () => (await ui(page))?.blueprints.ghost.red.length).toBe(0);
  await page.mouse.click(clear.x, clear.y);
  await expect.poll(async () => (await step(page, 1)).foundry.pieces.filter((p) => p.pieceId === 'frost-rune').length).toBe(1);
  expect((await ui(page))?.blueprints.tool).toBe('ghost');
  const placed = (await state(page)).foundry.pieces.slice(-4);
  const [arrows, , crate, rime] = placed;
  if (!arrows || !crate || !rime) throw new Error('not placed');
  // Fill its hoppers by hand and let it run: frost arrows reach its crate.
  await page.keyboard.press('Escape');
  await walkTo(page, (arrows.tx + 0.5) * 32, (arrows.ty - 0.5) * 32);
  await step(page, 1, { deposit: { id: arrows.id, itemId: 'arrow', amount: 'all' } });
  await step(page, 1, { deposit: { id: rime.id, itemId: 'rimestone', amount: 'all' } });
  await expect
    .poll(async () => {
      const s = await step(page, 60);
      const c = s.foundry.pieces.find((p) => p.id === crate.id);
      return c?.kind === 'crate' ? (c.contents['arrow+frost'] ?? 0) : 0;
    })
    .toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
});
