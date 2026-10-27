import { expect, test, type Page } from '@playwright/test';
import { INTAKE } from '../../src/data/foundry';
import { quietScreen } from './helpers';
import { pieceAt, screenPoint, state, step } from './foundryPage';
import { buildAtStand, walkTo } from './blueprintPage';
import { cameraStill, tilePoint, ui, worldOnCanvas } from './factoryPage';

// Review screenshots for 069 (REVIEW_SHOTS=1, into docs/review/069): a running machine's recipe card and a build-bar
// piece's; the intake's rates; the purge menu and a purged entrance; the pipette's hand; build mode zoomed out. In
// ?playtest, pieces placed through the hook, the hovers and keys with the real mouse and keyboard.

const SHOTS = 'docs/review/069';
const MIDDLE = INTAKE.entrances.findIndex((e) => e.startsOpen);
const MOUTH = INTAKE.entrances[MIDDLE] ?? { tx: 12, ty: 0 };

/** Waits for a drawn frame of the current tick, with nothing passing over the picture. */
async function settled(page: Page): Promise<void> {
  await quietScreen(page);
  await cameraStill(page);
  const tick = (await state(page)).tick;
  await expect.poll(async () => (await ui(page))?.drawnTick).toBe(tick);
}

/** Places pieces through the hook in build mode, a tick each. */
async function place(page: Page, pieces: { pieceId: string; tx: number; ty: number; facing: string; inFrom?: string }[]): Promise<void> {
  for (const p of pieces) await step(page, 1, { place: p });
}

/** Fills the hopper at a tile with some of a carried item, through the hook. */
async function fill(page: Page, tx: number, ty: number, itemId: string, n: number): Promise<void> {
  const h = pieceAt(await state(page), tx, ty);
  if (h?.kind !== 'hopper') throw new Error('no hopper');
  await step(page, 1, { deposit: { id: h.id, itemId, amount: 'all', stack: n } });
}

test.describe('review screenshots (069)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/069');

  test('a running cutter’s recipe card on its hover, and the build bar’s cutter tip', async ({ page }) => {
    test.setTimeout(90_000);
    await buildAtStand(page);
    await place(page, [
      { pieceId: 'hopper', tx: 9, ty: 6, facing: 'right' },
      { pieceId: 'cutter', tx: 10, ty: 6, facing: 'right' },
      { pieceId: 'crate', tx: 11, ty: 6, facing: 'right' },
    ]);
    await fill(page, 9, 6, 'wood', 20);
    await expect.poll(async () => (await step(page, 20)).foundry.pieces.find((p) => p.pieceId === 'cutter')).toMatchObject({ status: 'working' });
    // The bar's cutter: its tip leads with the card.
    const cell = (await ui(page))?.buildBar?.cells.find((c) => c.pieceId === 'cutter');
    if (!cell) throw new Error('no cutter cell');
    const c = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.mouse.move(c.x, c.y);
    await expect.poll(async () => (await ui(page))?.tip?.lines[0]).toBe('1 wood → 2 shafts · 1.0 s');
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/02-build-bar-card.png` });
    // Out of build mode, the running cutter's hover.
    await step(page, 1, { toggleBuild: true });
    const at = await tilePoint(page, 10, 6);
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.hoverDescription).toBe('1 wood → 2 shafts · 1.0 s · 120 shafts/min');
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/01-machine-card.png` });
  });

  test('the intake’s rates, its purge menu and the purged entrance', async ({ page }) => {
    test.setTimeout(120_000);
    await buildAtStand(page);
    await place(page, [
      { pieceId: 'hopper', tx: MOUTH.tx, ty: 3, facing: 'up' },
      { pieceId: 'conduit', tx: MOUTH.tx, ty: 2, facing: 'up' },
      { pieceId: 'conduit', tx: MOUTH.tx, ty: 1, facing: 'up' },
    ]);
    await step(page, 1, { toggleBuild: true });
    await walkTo(page, (MOUTH.tx + 1.5) * 32, 3.5 * 32);
    // Fewer than the reservoir holds, so the line has run dry by the purge.
    await fill(page, MOUTH.tx, 3, 'arrow', 22);
    // Six seconds of the line running: the window has filled.
    await step(page, 360);
    const row = (await state(page)).intake.entrances[MIDDLE];
    expect(row?.inPerSecond).toBeGreaterThan(0);
    const mouth = { x: (MOUTH.tx + 0.5) * 32, y: (MOUTH.ty + 0.5) * 32 };
    await walkTo(page, mouth.x, mouth.y + 1.1 * 32);
    await step(page, 1, { aimX: mouth.x, aimY: mouth.y });
    const at = await worldOnCanvas(page, mouth.x, mouth.y);
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.hoverLines.some((l) => l.includes('fires'))).toBe(true);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/03-intake-rates.png` });
    // E with the cursor on the mouth: the purge menu.
    await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('entrance');
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.purgeMenu?.map((r) => r.text)).toEqual(['Purge']);
    const purge = (await ui(page))?.purgeMenu?.[0];
    if (!purge) throw new Error('no row');
    const p = await screenPoint(page, purge.x + purge.w / 2, purge.y + purge.h / 2);
    await page.mouse.move(p.x, p.y);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/04-purge-menu.png` });
    // Purged: the empty entrance shows.
    await page.mouse.click(p.x, p.y);
    await expect.poll(async () => (await step(page, 1)).intake.entrances[MIDDLE]?.count).toBe(0);
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.hoverLines[MIDDLE]?.startsWith('0/')).toBe(true);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/05-purged.png` });
  });

  test('the pipette’s hand: a cornered conduit copied, its ghost under the cursor', async ({ page }) => {
    test.setTimeout(90_000);
    await buildAtStand(page);
    await place(page, [
      { pieceId: 'conduit', tx: 6, ty: 6, facing: 'up', inFrom: 'left' },
      { pieceId: 'conduit', tx: 5, ty: 6, facing: 'right' },
      { pieceId: 'conduit', tx: 6, ty: 5, facing: 'up' },
    ]);
    const from = await tilePoint(page, 6, 6);
    await page.mouse.move(from.x, from.y);
    await page.keyboard.press('q');
    await expect.poll(async () => (await ui(page))?.buildBar?.selected).toBe('conduit');
    const to = await tilePoint(page, 9, 4);
    await page.mouse.move(to.x, to.y);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/06-pipette.png` });
  });

  test('build mode zoomed out to 0.75×', async ({ page }) => {
    test.setTimeout(90_000);
    await buildAtStand(page);
    await place(page, [
      { pieceId: 'hopper', tx: 4, ty: 9, facing: 'right' },
      { pieceId: 'cutter', tx: 5, ty: 9, facing: 'right' },
      { pieceId: 'conduit', tx: 6, ty: 9, facing: 'right' },
      { pieceId: 'assembler', tx: 7, ty: 9, facing: 'right' },
      { pieceId: 'crate', tx: 10, ty: 9, facing: 'right' },
    ]);
    const at = await tilePoint(page, 14, 6);
    await page.mouse.move(at.x, at.y);
    await page.mouse.wheel(0, 100);
    await expect.poll(async () => (await ui(page))?.camera.zoom).toBe(0.75);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/07-zoomed-out.png` });
  });
});
