import { expect, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';
import { VIEW_WIDTH } from '../../src/data/config';

// Page helpers for 042's flow screens: boot the shipped game (the title), click a flow row by its id, wait on state.

/** Boots the plain URL (the shipped game: the title), with the in-page `__helpers`. */
export async function bootTitle(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true && window.__GAME__?.flow().state === 'title');
}

/** Clicks a point given in view px (the 640×360 layout), wherever the canvas sits. */
export async function clickView(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const k = box.width / VIEW_WIDTH;
  await page.mouse.move(box.x + x * k, box.y + y * k);
  await page.mouse.click(box.x + x * k, box.y + y * k);
}

/** Every flow row on screen (title, card, Settings, key list), by id. */
async function rowBox(page: Page, id: string): Promise<{ x: number; y: number; w: number; h: number; usable: boolean } | null> {
  return page.evaluate((rowId) => {
    const f = window.__GAME__?.ui().flow;
    if (!f) return null;
    const rows = [...(f.card?.rows ?? []), ...(f.title?.rows ?? []), ...(f.settings?.rows ?? []), ...(f.bindings?.rows ?? []), ...(f.endCard?.rows ?? []), ...(f.note?.rows ?? [])];
    return rows.find((r) => r.id === rowId) ?? null;
  }, id);
}

/** Clicks a flow row by id (the middle of its label side, away from any stepper). */
export async function clickRow(page: Page, id: string, at: 'row' | 'down' | 'up' = 'row'): Promise<void> {
  await expect.poll(() => rowBox(page, id).then((b) => b !== null)).toBe(true);
  const b = await rowBox(page, id);
  if (!b) throw new Error(`no row '${id}'`);
  const x = at === 'down' ? b.x + 128 : at === 'up' ? b.x + 170 : b.x + 40;
  await clickView(page, x, b.y + b.h / 2);
}

/** Waits for the flow to reach a state. */
export async function flowIs(page: Page, state: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__GAME__?.flow().state)).toBe(state);
}
