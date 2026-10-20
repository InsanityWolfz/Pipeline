import { expect, type Page } from '@playwright/test';
import { craftTabBoxes } from '../../src/render/craftMenuLayout';
import { screenPoint } from './foundryPage';

// The crafting menu's tabs (047), driven by the mouse: open the menu with C, click a family's tab, find a row.

/** Opens the crafting menu if it isn't open. */
export async function openCrafting(page: Page): Promise<void> {
  if (!(await page.evaluate(() => window.__GAME__?.ui().craftOpen))) await page.keyboard.press('c');
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().craftOpen)).toBe(true);
}

/** Opens the menu on a family's tab (by its base ammo id) with a click on the tab. */
export async function openCraftTab(page: Page, ammoId: string): Promise<void> {
  await openCrafting(page);
  const tab = craftTabBoxes().find((t) => t.ammoId === ammoId);
  if (!tab) throw new Error(`no ${ammoId} tab`);
  const p = await screenPoint(page, tab.x + tab.w / 2, tab.y + tab.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftMenu))?.tab).toBe(ammoId);
}

/** A shown row of the open tab, by recipe id, once drawn. */
export async function craftRow(page: Page, recipeId: string) {
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftMenu))?.rows.some((r) => r.recipeId === recipeId && r.shown)).toBe(true);
  const menu = await page.evaluate(() => window.__GAME__?.ui().craftMenu);
  const row = menu?.rows.find((r) => r.recipeId === recipeId && r.shown);
  if (!row) throw new Error(`no ${recipeId} row`);
  return row;
}

/** Clicks a shown row of the open tab. */
export async function clickCraftRow(page: Page, recipeId: string): Promise<void> {
  const row = await craftRow(page, recipeId);
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
}
