import { expect, test } from '@playwright/test';
import {
  centre,
  clickBar,
  clickTile,
  ctrlClick,
  enterFoundry,
  LEY_VEIN,
  pieceAt,
  standStill,
  state,
  step,
  tileOnCanvas,
  toggleBuild,
} from './foundryPage';
import { slotPoint } from './gridPage';
import { boot, watchErrors } from './helpers';

// The foundry: the doorway, build mode with the mouse and keys, and a working
// ley bolt line, driven through window.__GAME__ plus real clicks.

test('the doorway leads to the foundry and back', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page, false);
  const s = await state(page);
  expect(s.events.roomChanges).toEqual([{ from: 'overworld', to: 'foundry' }]);
  expect({ x: s.player.x, y: s.player.y }).toEqual(centre(22, 8));
  // The first walk in attunes the tube (019): the player is held still till it ends.
  const held = await page.evaluate(() => {
    const g = window.__GAME__;
    while ((g?.getState().link.attunePulse ?? 0) > 0) g?.step(1, { moveX: 1 });
    return g?.getState().player;
  });
  expect({ x: held?.x, y: held?.y }).toEqual(centre(22, 8));
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (let i = 0; i < 60 && g?.getState().room !== 'overworld'; i++) g?.step(1, { moveX: 1 });
  });
  expect((await state(page)).room).toBe('overworld');
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
  // About 24 s on an idle machine, before 039 and after: the default 30 s left no room under a parallel run's load.
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await page.evaluate((vein) => {
    window.__GAME__?.step(0);
    window.__helpers?.harvest(vein, 3);
    window.__GAME__?.craft('ley-dust');
    window.__GAME__?.craft('ley-bolt');
  }, LEY_VEIN);
  expect((await state(page)).unlocked).toEqual(['conduit', 'splitter', 'underground-entrance', 'underground-exit', 'hopper', 'crate', 'grinder', 'focuser']);
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
  // walkTo stops a step short of the hopper's reach: one more step up closes it.
  await step(page, 1, { moveY: -1 });
  // 047: E opens the hopper's screen, its own row over the grid inventory.
  const picker = () => page.evaluate(() => window.__GAME__?.ui().pickerOpen);
  await page.keyboard.press('e');
  await expect.poll(picker).toBe(true);
  const p = await slotPoint(page, 'ley-crystal');
  // Esc closes the screen: a click where the stack was then does nothing.
  await page.keyboard.press('Escape');
  await expect.poll(picker).toBe(false);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(50);
  expect(pieceAt(await step(page, 1), 8, 6)).toMatchObject({ kind: 'hopper', item: null });
  // Ctrl+click puts the whole stack in (022, 047); the screen stays open.
  await page.keyboard.press('e');
  await expect.poll(picker).toBe(true);
  await ctrlClick(page, p.x, p.y);
  await page.waitForTimeout(50);
  const filled = await step(page, 1);
  expect(await picker()).toBe(true);
  expect(pieceAt(filled, 8, 6)).toMatchObject({ kind: 'hopper', item: 'ley-crystal', count: 2 });

  // The hopper's own row shows its stack: Ctrl+click takes it back out (047).
  const t = await slotPoint(page, 'ley-crystal', 'container');
  await ctrlClick(page, t.x, t.y);
  await page.waitForTimeout(50);
  const emptied = await step(page, 1);
  expect(pieceAt(emptied, 8, 6)).toMatchObject({ kind: 'hopper', item: null, count: 0 });
  expect(emptied.inventory['ley-crystal']).toBe(2);

  // And back in again.
  const back = await slotPoint(page, 'ley-crystal');
  await ctrlClick(page, back.x, back.y);
  await page.waitForTimeout(50);
  expect(pieceAt(await step(page, 1), 8, 6)).toMatchObject({ kind: 'hopper', item: 'ley-crystal', count: 2 });

  const ran = await step(page, 900);
  const crate = pieceAt(ran, 12, 6);
  if (crate?.kind !== 'crate') throw new Error('no crate');
  expect(crate.contents['ley-bolt']).toBeGreaterThanOrEqual(4);

  // Just below the crate, well in reach (USE_REACH).
  const beside = { x: centre(12, 7).x, y: centre(12, 7).y - 8 };
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [beside.x, beside.y] as const);
  // 047: E opens the crate's screen; Ctrl+click on its bolts takes the stack.
  await page.keyboard.press('e');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().inventory))?.mode).toBe('crate');
  const bolts = await slotPoint(page, 'ley-bolt', 'container');
  await ctrlClick(page, bolts.x, bolts.y);
  await expect.poll(async () => (await step(page, 1)).inventory['ley-bolt'] ?? 0).toBeGreaterThanOrEqual(5);
  await page.keyboard.press('Escape');

  // The tube is quiet in the foundry (015): firing there does nothing, out in the hall it fires.
  await page.evaluate((id) => window.__helpers?.hold(id), 'ley-bolt');
  const quiet = await step(page, 1, { fire: true, use: true, aimX: beside.x, aimY: beside.y + 200 });
  expect(quiet.arrows).toEqual([]);
  await page.evaluate(() => window.__helpers?.toHall());
  const out = await state(page);
  const shot = await step(page, 1, { use: true, aimX: out.player.x + 200, aimY: out.player.y });
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
  await step(page, 1, { deposit: { id: hopper.id, itemId: 'arrow', amount: 'all' } });
  const end = await step(page, 1500);
  expect(pieceAt(end, 15, 10)).toMatchObject({ kind: 'crate', contents: { arrow: 30 } });
  expect(errors).toEqual([]);
});
