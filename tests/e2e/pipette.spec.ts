import { expect, test, type Page } from '@playwright/test';
import { pieceAt, state, step, tileOnCanvas } from './foundryPage';
import { buildAtStand, ui } from './blueprintPage';
import { watchErrors } from './helpers';

// 069: in build mode, Q over a placed piece puts it in hand with its facing and settings (a conduit's turn, a splitter's
// side, a stage's round), ready to place with a click; Q over nothing empties the hand, and a click then places nothing.

/** The cursor on a tile, Q, and the bar's selection once the frame has taken it. */
async function pipetteAt(page: Page, tx: number, ty: number, expected: string): Promise<void> {
  const at = await tileOnCanvas(page, tx, ty);
  await page.mouse.move(at.x, at.y);
  await page.keyboard.press('q');
  await expect.poll(async () => (await ui(page))?.buildBar?.selected).toBe(expected);
}

/** A click on a tile, and the tick that takes it. */
async function clickAt(page: Page, tx: number, ty: number): Promise<void> {
  const at = await tileOnCanvas(page, tx, ty);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(50);
  await step(page, 2);
}

test('Q copies a turned conduit, a flipped splitter and a frost rune on bombs; Q over the floor empties the hand', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await buildAtStand(page);
  await step(page, 1, { place: { pieceId: 'conduit', tx: 6, ty: 6, facing: 'up', inFrom: 'left' } });
  await step(page, 1, { place: { pieceId: 'splitter', tx: 8, ty: 6, facing: 'down', mirrored: true } });
  await step(page, 1, { place: { pieceId: 'frost-rune', tx: 10, ty: 6, facing: 'left', round: 'bomb+frost' } });
  expect(pieceAt(await state(page), 6, 6)).toMatchObject({ kind: 'conduit', facing: 'up', inFrom: 'left' });

  await pipetteAt(page, 6, 6, 'conduit');
  await clickAt(page, 6, 4);
  await expect.poll(async () => pieceAt(await state(page), 6, 4)).toMatchObject({ kind: 'conduit', facing: 'up', inFrom: 'left' });

  await pipetteAt(page, 8, 6, 'splitter');
  await clickAt(page, 8, 4);
  await expect.poll(async () => pieceAt(await state(page), 8, 4)).toMatchObject({ kind: 'splitter', facing: 'down', mirrored: true });

  await pipetteAt(page, 10, 6, 'frost-rune');
  await clickAt(page, 10, 4);
  await expect.poll(async () => pieceAt(await state(page), 10, 4)).toMatchObject({ kind: 'machine', pieceId: 'frost-rune', facing: 'left', made: 'bomb+frost' });

  // Over the floor: the hand empties, and a click places nothing.
  await pipetteAt(page, 4, 4, '');
  const before = (await state(page)).foundry.pieces.length;
  await clickAt(page, 4, 4);
  expect((await state(page)).foundry.pieces.length).toBe(before);
  expect(pieceAt(await state(page), 4, 4)).toBeUndefined();
  expect(errors).toEqual([]);
});
