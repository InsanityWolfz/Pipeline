import { expect, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import type { UiState } from '../../src/render/testHook';
import type { SimSummary } from '../../src/sim/summary';

// Driving 069's factory tools from a spec: world points to page points through the camera as drawn (its centre and
// its zoom, 1 or build mode's 0.75), and the foundry's state.

export const ui = (page: Page): Promise<UiState | undefined> => page.evaluate(() => window.__GAME__?.ui());

export async function state(page: Page): Promise<SimSummary> {
  const s = await page.evaluate(() => window.__GAME__?.getState());
  if (!s) throw new Error('no game');
  return s;
}

/** A world point's page point, through the main camera as it's drawn now (its centre and the world's zoom). */
export async function worldOnCanvas(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  const cam = (await ui(page))?.camera;
  if (!box || !cam) throw new Error('no canvas or camera');
  const css = box.width / VIEW_WIDTH;
  const vx = (x - cam.x) * cam.zoom + VIEW_WIDTH / 2;
  const vy = (y - cam.y) * cam.zoom + VIEW_HEIGHT / 2;
  return { x: box.x + vx * css, y: box.y + vy * css };
}

/** A tile's centre as a page point. */
export const tilePoint = (page: Page, tx: number, ty: number): Promise<{ x: number; y: number }> => worldOnCanvas(page, (tx + 0.5) * 32, (ty + 0.5) * 32);

/** Waits for the camera to stop moving (two reads a frame apart agree). */
export async function cameraStill(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const a = (await ui(page))?.camera;
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const b = (await ui(page))?.camera;
      return a && b && a.x === b.x && a.y === b.y && a.zoom === b.zoom;
    })
    .toBe(true);
}
