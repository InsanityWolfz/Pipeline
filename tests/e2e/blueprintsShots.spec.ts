import { expect, test, type Page } from '@playwright/test';
import { cameraSettled, quietScreen } from './helpers';
import { centre, screenPoint, state, step, STAND, tileOnCanvas } from './foundryPage';
import { buildAtStand, clickMenuRow, put, ui, walkTo } from './blueprintPage';

// Review screenshots for 063 (REVIEW_SHOTS=1, into docs/review/063): the Area box over a line while dragging, the
// release menu, the blueprint list with three saved lines, a ghost turned and mirrored with red tiles, a stamped line,
// and the Blueprint table's diagram on the north wall before and after restoring. In ?playtest; pieces go down
// through the hook, the box and the clicks with the real mouse.

const SHOTS = 'docs/review/063';

/** A frost arrow line with a bomb stage beside it: two hoppers into a frost rune, a crate at its front. */
const LINE = [
  { pieceId: 'hopper', tx: 5, ty: 9, facing: 'right' },
  { pieceId: 'conduit', tx: 6, ty: 9, facing: 'right' },
  { pieceId: 'frost-rune', tx: 7, ty: 9, facing: 'right' },
  { pieceId: 'crate', tx: 8, ty: 9, facing: 'right' },
  { pieceId: 'hopper', tx: 7, ty: 10, facing: 'up' },
];

/** Waits for a drawn frame of the current tick, banners played out. */
async function settled(page: Page): Promise<void> {
  await quietScreen(page);
  const tick = (await state(page)).tick;
  await expect.poll(async () => (await ui(page))?.drawnTick).toBe(tick);
}

test.describe('review screenshots (063)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/063');

  test('the Blueprint table on the north wall, as a diagram and restored', async ({ page }) => {
    test.setTimeout(90_000);
    await buildAtStand(page);
    await page.keyboard.press('b');
    await walkTo(page, 17.5 * 32, 3.5 * 32);
    await cameraSettled(page);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/06-table-diagram.png` });
    await walkTo(page, 18.5 * 32, 1.5 * 32);
    await expect.poll(async () => (await step(page, 1, { restore: 'blueprint-table' })).blueprints.unlocked).toBe(true);
    await walkTo(page, 17.5 * 32, 3.5 * 32);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
    await expect.poll(async () => (await ui(page))?.research.effects).toBe(0);
    await cameraSettled(page);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/07-table-restored.png` });
  });

  test('the area box over a line, its menu, the list of three, a turned and mirrored ghost, and the stamped line', async ({ page }) => {
    test.setTimeout(120_000);
    await buildAtStand(page, true);
    await put(page, LINE);
    await put(page, [
      { pieceId: 'shaper', tx: 4, ty: 5, facing: 'right' },
      { pieceId: 'conduit', tx: 5, ty: 5, facing: 'right' },
      { pieceId: 'packer', tx: 6, ty: 5, facing: 'right' },
      { pieceId: 'cutter', tx: 15, ty: 12, facing: 'up' },
    ]);
    await page.keyboard.press('x');
    const a = await tileOnCanvas(page, 5, 9);
    const b = await tileOnCanvas(page, 8, 10);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await expect.poll(async () => (await ui(page))?.blueprints.counted.length).toBe(LINE.length);
    await step(page, 1);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/01-area-box-over-line.png` });
    await page.mouse.up();
    await expect.poll(async () => (await ui(page))?.blueprints.menu?.length).toBe(4);
    await step(page, 1);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/02-release-menu.png` });
    await clickMenuRow(page, 'Save blueprint');
    const save = (tx0: number, ty0: number, tx1: number, ty1: number) => step(page, 1, { area: { box: { tx0, ty0, tx1, ty1 }, action: 'save' } });
    await save(4, 4, 7, 6);
    await save(15, 11, 15, 12);
    await page.keyboard.press('p');
    await expect.poll(async () => (await ui(page))?.blueprints.list.rows.map((r) => r.name)).toEqual(['Frost arrows', 'Bombs', 'Shafts']);
    await step(page, 1);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/03-blueprint-list.png` });

    // The frost line as the ghost, turned and mirrored, over the bomb line: red where it can't go.
    const row = (await ui(page))?.blueprints.list.rows[0];
    if (!row) throw new Error('no row');
    const rp = await screenPoint(page, row.box.x + 40, row.box.y + row.box.h / 2);
    await page.mouse.click(rp.x, rp.y);
    await page.keyboard.press('r');
    await page.keyboard.press('g');
    const over = await tileOnCanvas(page, 5, 6);
    await page.mouse.move(over.x, over.y);
    await expect.poll(async () => (await ui(page))?.blueprints.ghost.red.length ?? 0).toBeGreaterThan(0);
    await step(page, 1);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/04-ghost-turned-mirrored-red.png` });

    const clear = await tileOnCanvas(page, 14, 8);
    await page.mouse.move(clear.x, clear.y);
    await expect.poll(async () => (await ui(page))?.blueprints.ghost.red.length).toBe(0);
    await page.mouse.click(clear.x, clear.y);
    await expect.poll(async () => (await step(page, 1)).foundry.pieces.filter((p) => p.pieceId === 'frost-rune').length).toBe(2);
    // Out of build mode, so the stamped line shows as it stands.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await step(page, 1)).building).toBe(false);
    const at = centre(STAND.tx, STAND.ty);
    await walkTo(page, at.x, at.y);
    await cameraSettled(page);
    // The cursor on bare floor, so no hover name sits over the line.
    const floor = await tileOnCanvas(page, 11, 12);
    await page.mouse.move(floor.x, floor.y);
    await settled(page);
    await page.screenshot({ path: `${SHOTS}/05-stamped-line.png` });
  });
});
