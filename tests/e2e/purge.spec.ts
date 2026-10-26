import { expect, test } from '@playwright/test';
import { INTAKE } from '../../src/data/foundry';
import { enterFoundry, pieceAt, screenPoint, step } from './foundryPage';
import { cameraStill, state, ui, worldOnCanvas } from './factoryPage';
import { boot, watchErrors } from './helpers';

// 069: E at an intake entrance holding rounds offers "Purge"; clicking it moves the entrance's reservoir into the
// stash, so another round kind can flow in.

const MIDDLE = INTAKE.entrances.findIndex((e) => e.startsOpen);
const MOUTH = INTAKE.entrances[MIDDLE] ?? { tx: 12, ty: 0 };

test('E at a fed entrance offers Purge, and Purge empties it into the stash', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  // A hopper feeding the open entrance up two conduits, filled with 10 arrows through the hook.
  await page.evaluate(([tx]) => window.__helpers?.walkTo((tx + 1.5) * 32, 4.5 * 32), [MOUTH.tx] as const);
  await step(page, 1, { toggleBuild: true });
  for (const [ty, pieceId] of [[3, 'hopper'], [2, 'conduit'], [1, 'conduit']] as const) await step(page, 1, { place: { pieceId, tx: MOUTH.tx, ty, facing: 'up' } });
  const s = await step(page, 1, { toggleBuild: true });
  const hopper = pieceAt(s, MOUTH.tx, 3);
  if (hopper?.kind !== 'hopper') throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopper.id, itemId: 'arrow', amount: 'all', stack: 10 } });
  await expect.poll(async () => (await step(page, 30)).intake.entrances[MIDDLE]?.count).toBeGreaterThanOrEqual(5);
  // Let the line run dry, so nothing flows in after the purge.
  await expect.poll(async () => (await step(page, 30)).foundry.pieces.every((p) => (p.kind === 'hopper' ? p.count === 0 : p.kind !== 'conduit' || p.item === null))).toBe(true);
  const held = (await state(page)).intake.entrances[MIDDLE]?.count ?? 0;
  const stashBefore = (await state(page)).stash.arrow ?? 0;

  // Below the entrance, the cursor on its mouth: E opens the purge menu.
  await page.evaluate(([tx, ty]) => window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 1.6) * 32), [MOUTH.tx, MOUTH.ty] as const);
  await cameraStill(page);
  const at = await worldOnCanvas(page, (MOUTH.tx + 0.5) * 32, (MOUTH.ty + 0.5) * 32);
  await page.mouse.move(at.x, at.y);
  await expect.poll(async () => (await ui(page))?.hoverName).toBe('Foundry intake');
  // A tick aimed there, so the sim's aim is on the mouth too (E's target follows the cursor, 050; the hook's steps carry their own aim).
  await step(page, 1, { aimX: (MOUTH.tx + 0.5) * 32, aimY: (MOUTH.ty + 0.5) * 32 });
  await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('entrance');
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.purgeMenu?.map((r) => r.text)).toEqual(['Purge']);
  const row = (await ui(page))?.purgeMenu?.[0];
  if (!row) throw new Error('no row');
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await step(page, 1)).intake.entrances[MIDDLE]?.count).toBe(0);
  const after = await state(page);
  expect(after.intake.entrances[MIDDLE]?.ammo).toBeNull();
  expect(after.stash.arrow ?? 0).toBe(stashBefore + held);
  await expect.poll(async () => (await ui(page))?.purgeMenu ?? null).toBeNull();
  expect(errors).toEqual([]);
});
