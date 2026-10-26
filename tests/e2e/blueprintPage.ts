import { expect, type Page } from '@playwright/test';
import { boot, cameraSettled } from './helpers';
import { centre, screenPoint, state, step, STAND, tileOnCanvas, toggleBuild } from './foundryPage';
import type { UiState } from '../../src/render/testHook';

// Driving 063's blueprints from a spec, in ?playtest (the sandbox can't reach the foundry): into build mode at STAND,
// the Blueprint table restored at its diagram, pieces placed through the hook, the Area tool's box dragged with the
// real mouse, and the menus' rows clicked.

export const ui = (page: Page): Promise<UiState | undefined> => page.evaluate(() => window.__GAME__?.ui());

/** Walks to a world point in the foundry from ?playtest (in from the overworld first if need be). */
export async function walkTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([x, y]) => {
    if (window.__GAME__?.step(0).room !== 'foundry') window.__helpers?.toFoundry();
    window.__helpers?.walkTo(x, y);
    window.__GAME__?.step(1);
  }, [x, y] as const);
}

/** Restores the Blueprint table at its diagram on the north wall: E opens its panel, E again restores (033). */
export async function restoreTable(page: Page): Promise<void> {
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
export async function buildAtStand(page: Page, table = false): Promise<void> {
  await boot(page, '?playtest');
  if (table) await restoreTable(page);
  const at = centre(STAND.tx, STAND.ty);
  await walkTo(page, at.x, at.y);
  await cameraSettled(page);
  await toggleBuild(page);
  expect((await state(page)).building).toBe(true);
}

/** Places pieces through the hook, a tick each. */
export async function put(page: Page, pieces: { pieceId: string; tx: number; ty: number; facing: string }[]): Promise<void> {
  for (const place of pieces) await step(page, 1, { place });
}

/** Drags the Area tool's box from one tile to another with the real mouse, holding at the end until `whileHeld` is done. */
export async function dragBox(page: Page, from: [number, number], to: [number, number], whileHeld?: () => Promise<void>): Promise<void> {
  const a = await tileOnCanvas(page, ...from);
  const b = await tileOnCanvas(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await whileHeld?.();
  await page.mouse.up();
}

/** Clicks the release menu's row with this text. */
export async function clickMenuRow(page: Page, text: string): Promise<void> {
  const row = (await ui(page))?.blueprints.menu?.find((r) => r.text === text);
  if (!row) throw new Error(`no menu row '${text}'`);
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
  await step(page, 1);
}

/** Clicks a view-px point on the canvas, then lets a tick take what it sent. */
export async function clickAt(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
  await step(page, 1);
}
