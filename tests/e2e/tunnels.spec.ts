import { expect, test, type Page } from '@playwright/test';
import { clickBar, clickTile, enterFoundry, pieceAt, standStill, state, step, tileOnCanvas, toggleBuild } from './foundryPage';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';
import type { SimSummary } from '../../src/sim/summary';

// 052 (C.1): the underground pair placed with the mouse. While the entrance is placed its reach is marked; placing it
// selects the exit, whose ghost in reach shows its tunnel; items fed in come out of the exit; hovering an end shows
// the tunnel. Review shots (REVIEW_SHOTS=1, docs/review/052): a tunnel being placed with its reach, a hovered tunnel,
// two crossing lines.

const IN = 'underground-entrance';
const OUT = 'underground-exit';
const SHOTS = 'docs/review/052';

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** How many of an item the crate at a tile holds. */
function inCrate(s: SimSummary, tx: number, ty: number, itemId: string): number {
  const p = pieceAt(s, tx, ty);
  return p?.kind === 'crate' ? (p.contents[itemId] ?? 0) : 0;
}

async function hover(page: Page, tx: number, ty: number): Promise<void> {
  const p = await tileOnCanvas(page, tx, ty);
  await page.mouse.move(p.x + 1, p.y);
  await page.mouse.move(p.x, p.y);
}

/** Into the foundry at STAND, building, with the entrance placed at (7, 10) facing right and the exit selected. */
async function entrancePlaced(page: Page): Promise<void> {
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  await toggleBuild(page);
  await clickBar(page, IN);
  await hover(page, 7, 10);
  await expect.poll(async () => (await ui(page))?.tunnels.find((m) => m.kind === 'reach')?.tiles.length).toBe(6);
  await clickTile(page, 7, 10);
  expect(pieceAt(await state(page), 7, 10)).toMatchObject({ pieceId: IN, facing: 'right', pair: null });
  // Placing the entrance selects the exit next.
  await expect.poll(async () => (await ui(page))?.buildBar?.selected).toBe(OUT);
}

test('a tunnel pair placed with the mouse pairs in reach, carries items under a conduit, and shows its tunnel on hover', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await entrancePlaced(page);
  // The exit's ghost in reach shows the tunnel it would make.
  await hover(page, 11, 10);
  await expect.poll(async () => (await ui(page))?.tunnels.find((m) => m.kind === 'tunnel')?.tiles).toEqual([8, 9, 10].map((tx) => ({ tx, ty: 10 })));
  await clickTile(page, 11, 10);
  const placed = await state(page);
  const entrance = pieceAt(placed, 7, 10);
  const exit = pieceAt(placed, 11, 10);
  expect(exit).toMatchObject({ pieceId: OUT, pair: entrance?.id });
  expect(entrance).toMatchObject({ pair: exit?.id, tunnel: [null, null, null] });
  // A conduit across the tunnel's middle, a hopper of wood behind the entrance and a crate ahead of the exit.
  await step(page, 1, { place: { pieceId: 'conduit', tx: 9, ty: 10, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'hopper', tx: 6, ty: 10, facing: 'right' } });
  await step(page, 1, { place: { pieceId: 'crate', tx: 12, ty: 10, facing: 'right' } });
  await page.evaluate(() => window.__helpers?.walkTo(6.5 * 32, 9.5 * 32));
  const hopper = pieceAt(await state(page), 6, 10);
  await step(page, 1, { deposit: { id: hopper?.id ?? -1, itemId: 'arrow', amount: 'all' } });
  await expect.poll(async () => inCrate(await step(page, 30), 12, 10, 'arrow')).toBeGreaterThan(0);
  // Out of build mode, hovering the exit shows its tunnel.
  await toggleBuild(page);
  await page.evaluate(() => window.__helpers?.walkTo(11.5 * 32, 8.5 * 32));
  await cameraSettled(page);
  await hover(page, 11, 10);
  await expect.poll(async () => (await ui(page))?.tunnels).toEqual([{ kind: 'tunnel', tiles: [8, 9, 10].map((tx) => ({ tx, ty: 10 })), facing: 'right' }]);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (052)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/052');

  test('a tunnel being placed with its reach, and a hovered tunnel', async ({ page }) => {
    test.setTimeout(90_000);
    await entrancePlaced(page);
    await quietScreen(page);
    // The exit's ghost in reach: the entrance's reach marked faintly, the tunnel it would make brightly.
    await hover(page, 11, 10);
    await expect.poll(async () => (await ui(page))?.tunnels.length).toBe(2);
    await page.screenshot({ path: `${SHOTS}/01-tunnel-placing-reach.png` });
    await clickTile(page, 11, 10);
    await step(page, 1, { place: { pieceId: 'conduit', tx: 9, ty: 11, facing: 'up' } });
    await step(page, 1, { place: { pieceId: 'conduit', tx: 9, ty: 10, facing: 'up' } });
    await step(page, 1, { place: { pieceId: 'conduit', tx: 9, ty: 9, facing: 'up' } });
    await toggleBuild(page);
    await hover(page, 7, 10);
    await expect.poll(async () => (await ui(page))?.tunnels.length).toBe(1);
    await page.screenshot({ path: `${SHOTS}/02-tunnel-hovered.png` });
  });

  test("two crossing lines: the bomb line's stone goes under the arrow line's fiber", async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page, '?playtest');
    await page.evaluate(() => window.__helpers?.toFoundry());
    await quietScreen(page);
    // Shaun's case, as tests/sim/tunnels.test.ts builds it.
    const pieces: [string, number, number, string][] = [
      ['hopper', 11, 6, 'up'], ['hopper', 12, 6, 'up'], ['cutter', 11, 5, 'up'], ['knapper', 12, 5, 'up'], ['spinner', 13, 5, 'up'],
      ['assembler', 12, 4, 'up'], ['crate', 12, 3, 'up'], ['hopper', 19, 7, 'left'],
      ['conduit', 18, 7, 'left'], ['conduit', 17, 7, 'left'], ['conduit', 16, 7, 'left'], ['conduit', 15, 7, 'left'], ['conduit', 14, 7, 'left'],
      ['conduit', 13, 7, 'up'], ['conduit', 13, 6, 'up'],
      ['hopper', 16, 3, 'down'], ['conduit', 16, 4, 'down'], ['conduit', 16, 5, 'down'], [IN, 16, 6, 'down'], [OUT, 16, 8, 'down'],
      ['conduit', 16, 9, 'down'], ['conduit', 16, 10, 'down'], ['hopper', 15, 10, 'down'], ['hopper', 17, 10, 'down'],
      ['fuse-maker', 15, 11, 'down'], ['shaper', 16, 11, 'down'], ['grinder', 17, 11, 'down'], ['packer', 16, 12, 'down'], ['crate', 16, 13, 'down'],
    ];
    // Each hopper and the free tile its filler stands on.
    const fills: [number, number, string, number, number][] = [
      [11, 6, 'wood', 10, 6], [12, 6, 'stone', 12, 7], [19, 7, 'fiber', 19, 8], [16, 3, 'stone', 15, 3], [15, 10, 'husk-resin', 14, 10], [17, 10, 'ley-crystal', 18, 10],
    ];
    await page.evaluate(
      ([pieces, fills]) => {
        const g = window.__GAME__;
        const h = window.__helpers;
        if (!g || !h) throw new Error('no game');
        h.walkTo(20.5 * 32, 12.5 * 32);
        g.step(1, { toggleBuild: true });
        for (const [pieceId, tx, ty, facing] of pieces) g.step(1, { place: { pieceId, tx, ty, facing: facing as 'up' } });
        g.step(1, { toggleBuild: true });
        for (const [tx, ty, itemId, sx, sy] of fills) {
          const hopper = g.step(0).foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
          if (!hopper) throw new Error(`no hopper at ${tx},${ty}`);
          h.walkTo((sx + 0.5) * 32, (sy + 0.5) * 32);
          for (let i = 0; i < 8; i++) g.step(1, { deposit: { id: hopper.id, itemId, amount: 'one' } });
        }
        h.walkTo(11.5 * 32, 8.5 * 32);
        g.step(60 * 40);
      },
      [pieces, fills] as const,
    );
    const s = await state(page);
    expect(inCrate(s, 12, 3, 'arrow')).toBeGreaterThan(0);
    expect(inCrate(s, 16, 13, 'bomb')).toBeGreaterThan(0);
    await cameraSettled(page, 15_000);
    await hover(page, 16, 6);
    await expect.poll(async () => (await ui(page))?.tunnels).toEqual([{ kind: 'tunnel', tiles: [{ tx: 16, ty: 7 }], facing: 'down' }]);
    await page.screenshot({ path: `${SHOTS}/03-crossing-lines.png` });
  });
});
