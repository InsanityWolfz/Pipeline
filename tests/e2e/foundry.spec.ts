import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { FEET_BOX } from '../../src/data/player';
import { buildBarCells, pickerEntries, pickerRows } from '../../src/render/foundryLayout';
import type { SimSummary } from '../../src/sim/summary';
import { boot, watchErrors } from './helpers';

// The foundry: the doorway, build mode with the mouse and keys, and a working
// ley bolt line, driven through window.__GAME__ plus real clicks.

/** The ruin hall's first ley vein (node index). */
const LEY_VEIN = 9;
/** Where the player stands in the foundry for the build tests: the camera is centred on them there. */
const STAND = { tx: 11, ty: 8 } as const;

const centre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

async function state(page: Page): Promise<SimSummary> {
  const s = await page.evaluate(() => window.__GAME__?.getState());
  if (!s) throw new Error('no game');
  return s;
}

async function step(page: Page, frames: number, command: object = {}): Promise<SimSummary> {
  const s = await page.evaluate(([f, c]) => window.__GAME__?.step(f, c), [frames, command] as const);
  if (!s) throw new Error('no game');
  return s;
}

/** Walks from the spawn through the ruin hall's door, then waits out the fade. */
async function enterFoundry(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(0);
    window.__helpers?.walkTo(48, 400);
    for (let i = 0; i < 60 && g?.getState().room !== 'foundry'; i++) g?.step(1, { moveX: -1 });
  });
  expect((await state(page)).room).toBe('foundry');
  await page.waitForTimeout(500);
}

/** Walks to STAND and waits for the camera to settle on the player. */
async function standStill(page: Page): Promise<void> {
  const { x, y } = centre(STAND.tx, STAND.ty);
  await page.evaluate(([px, py]) => window.__helpers?.walkTo(px, py), [x, y] as const);
  await page.waitForTimeout(1500);
}

/** A screen point to click: tile (tx, ty)'s centre, with the camera centred on the player standing at STAND. */
async function tileOnCanvas(page: Page, tx: number, ty: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / VIEW_WIDTH;
  const stand = centre(STAND.tx, STAND.ty);
  // The camera follows the sprite, whose origin is the bottom of the feet box.
  const camX = stand.x - VIEW_WIDTH / 2;
  const camY = stand.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2;
  const w = centre(tx, ty);
  return { x: box.x + (w.x - camX) * zoom, y: box.y + (w.y - camY) * zoom };
}

async function screenPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / VIEW_WIDTH;
  return { x: box.x + x * zoom, y: box.y + y * zoom };
}

async function clickBar(page: Page, pieceId: string): Promise<void> {
  const cell = buildBarCells((await state(page)).unlocked).find((c) => c.pieceId === pieceId);
  if (!cell) throw new Error(`${pieceId} is not on the bar`);
  const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.click(p.x, p.y);
}

async function clickTile(page: Page, tx: number, ty: number, button: 'left' | 'right' = 'left'): Promise<void> {
  const p = await tileOnCanvas(page, tx, ty);
  await page.mouse.click(p.x, p.y, { button });
  await page.waitForTimeout(50);
  await step(page, 1);
}

/** Presses B and lets the toggle reach the sim. */
async function toggleBuild(page: Page): Promise<SimSummary> {
  await page.keyboard.press('b');
  await page.waitForTimeout(50);
  return step(page, 1);
}

const pieceAt = (s: SimSummary, tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);

test('the doorway leads to the foundry and back', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  const s = await state(page);
  expect(s.events.roomChanges).toEqual([{ from: 'ruin-hall', to: 'foundry' }]);
  expect({ x: s.player.x, y: s.player.y }).toEqual(centre(22, 8));
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (let i = 0; i < 60 && g?.getState().room !== 'ruin-hall'; i++) g?.step(1, { moveX: 1 });
  });
  expect((await state(page)).room).toBe('ruin-hall');
  expect(errors).toEqual([]);
});

test('build mode places, turns, picks up and drags pieces with the mouse', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  expect((await toggleBuild(page)).building).toBe(true);

  await clickBar(page, 'hopper');
  await clickTile(page, 13, 8);
  expect(pieceAt(await state(page), 13, 8)).toMatchObject({ pieceId: 'hopper', facing: 'right' });

  await clickBar(page, 'conduit');
  await page.keyboard.press('r');
  await clickTile(page, 13, 10);
  expect(pieceAt(await state(page), 13, 10)).toMatchObject({ pieceId: 'conduit', facing: 'down' });
  await clickTile(page, 13, 10, 'right');
  expect(pieceAt(await state(page), 13, 10)).toBeUndefined();

  // A fast drag (one jump across four tiles) still lays a conduit on every tile it crosses.
  const from = await tileOnCanvas(page, 8, 10);
  const to = await tileOnCanvas(page, 11, 10);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(50);
  const dragged = await step(page, 4);
  expect([8, 9, 10, 11].map((tx) => pieceAt(dragged, tx, 10)?.pieceId)).toEqual([
    'conduit',
    'conduit',
    'conduit',
    'conduit',
  ]);

  // Fire doesn't shoot while building.
  const s = await step(page, 2, { fire: true, aimX: 0, aimY: 0 });
  expect(s.arrows).toEqual([]);

  // Esc leaves build mode.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  expect((await step(page, 1)).building).toBe(false);
  expect(errors).toEqual([]);
});

test('a ley bolt line built by hand fills its crate, and the bolts fire', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=hall&attuned');
  await page.evaluate((vein) => {
    window.__GAME__?.step(0);
    window.__helpers?.harvest(vein, 3);
    window.__GAME__?.craft('ley-shard');
    window.__GAME__?.craft('ley-bolt');
  }, LEY_VEIN);
  expect((await state(page)).unlocked).toEqual(['conduit', 'hopper', 'crate', 'tube-socket', 'gravity-stager', 'grinder', 'focuser']);
  await enterFoundry(page);
  await standStill(page);
  await toggleBuild(page);
  const line: [string, number][] = [
    ['hopper', 8],
    ['grinder', 9],
    ['focuser', 10],
    ['conduit', 11],
    ['crate', 12],
  ];
  for (const [pieceId, tx] of line) {
    await clickBar(page, pieceId);
    await clickTile(page, tx, 6);
  }
  expect((await state(page)).foundry.pieces.map((p) => p.pieceId)).toEqual(line.map(([id]) => id));
  // Out of build mode, so clicks below reach the picker or the tube, never the grid.
  expect((await toggleBuild(page)).building).toBe(false);

  // E on the empty hopper opens the picker; clicking ley crystal fills it.
  const below = centre(8, 7);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [below.x, below.y] as const);
  const rows = pickerRows(pickerEntries({ item: null, count: 0 }, (await state(page)).inventory));
  const crystal = rows.find((r) => r.itemId === 'ley-crystal');
  if (!crystal) throw new Error('no ley crystal row');
  const p = await screenPoint(page, crystal.x + 40, crystal.y + crystal.h / 2);
  // Esc closes the picker: a click where its row was then does nothing.
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(50);
  expect(pieceAt(await step(page, 1), 8, 6)).toMatchObject({ kind: 'hopper', item: null });
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(50);
  const filled = await step(page, 1);
  expect(pieceAt(filled, 8, 6)).toMatchObject({ kind: 'hopper', item: 'ley-crystal', count: 2 });

  // E on the filled hopper offers to take it back out: the top row does it.
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const take = pickerRows(pickerEntries({ item: 'ley-crystal', count: 2 }, filled.inventory))[0];
  if (take?.action !== 'take') throw new Error('no take-out row');
  const t = await screenPoint(page, take.x + 40, take.y + take.h / 2);
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(50);
  const emptied = await step(page, 1);
  expect(pieceAt(emptied, 8, 6)).toMatchObject({ kind: 'hopper', item: null, count: 0 });
  expect(emptied.inventory['ley-crystal']).toBe(2);

  // And back in again.
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(50);
  expect(pieceAt(await step(page, 1), 8, 6)).toMatchObject({ kind: 'hopper', item: 'ley-crystal', count: 2 });

  const ran = await step(page, 900);
  const crate = pieceAt(ran, 12, 6);
  if (crate?.kind !== 'crate') throw new Error('no crate');
  expect(crate.contents['ley-bolt']).toBeGreaterThanOrEqual(4);

  const beside = centre(12, 7);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [beside.x, beside.y] as const);
  const taken = await step(page, 1, { interact: true });
  expect(taken.inventory['ley-bolt']).toBeGreaterThanOrEqual(5);

  await step(page, 1, { selectAmmo: 'ley-bolt' });
  const shot = await step(page, 1, { fire: true, aimX: beside.x, aimY: beside.y + 200 });
  expect(shot.arrows.map((a) => a.ammoId)).toEqual(['ley-bolt']);
  expect(errors).toEqual([]);
});

test('dragging an L lays a corner, and items ride round it into a crate', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  await toggleBuild(page);
  await step(page, 1, { place: { pieceId: 'hopper', tx: 12, ty: 8, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'crate', tx: 15, ty: 10, facing: 'right' } });

  // Down one tile, then right two: the turn tile becomes a corner from above.
  await clickBar(page, 'conduit');
  const a = await tileOnCanvas(page, 12, 9);
  const b = await tileOnCanvas(page, 12, 10);
  const c = await tileOnCanvas(page, 14, 10);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 1 });
  await page.mouse.move(c.x, c.y, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(50);
  const laid = await step(page, 4);
  expect([pieceAt(laid, 12, 9), pieceAt(laid, 12, 10), pieceAt(laid, 13, 10), pieceAt(laid, 14, 10)]).toMatchObject([
    { pieceId: 'conduit', facing: 'down', inFrom: 'up' },
    { pieceId: 'conduit', facing: 'right', inFrom: 'up' },
    { pieceId: 'conduit', facing: 'right', inFrom: 'left' },
    { pieceId: 'conduit', facing: 'right', inFrom: 'left' },
  ]);

  const hopper = pieceAt(laid, 12, 8);
  if (!hopper) throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopper.id, itemId: 'arrow' } });
  const end = await step(page, 1500);
  expect(pieceAt(end, 15, 10)).toMatchObject({ kind: 'crate', contents: { arrow: 30 } });
  expect(errors).toEqual([]);
});
