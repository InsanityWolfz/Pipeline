import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { FEET_BOX } from '../../src/data/player';
import { ATTUNE_TICKS } from '../../src/data/tube';
import { buildBarCells } from '../../src/render/foundryLayout';
import type { SimSummary } from '../../src/sim/summary';

// Driving the foundry from a spec: entering it, standing where the camera is
// predictable, and clicking tiles and the build bar with the real mouse.

/** The meadow's ley vein (node index, 017). */
export const LEY_VEIN = 8;
/** Where the player stands in the foundry for the build tests: the camera is centred on them there. */
export const STAND = { tx: 11, ty: 8 } as const;

export const centre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

export async function state(page: Page): Promise<SimSummary> {
  const s = await page.evaluate(() => window.__GAME__?.getState());
  if (!s) throw new Error('no game');
  return s;
}

export async function step(page: Page, frames: number, command: object = {}): Promise<SimSummary> {
  const s = await page.evaluate(([f, c]) => window.__GAME__?.step(f, c), [frames, command] as const);
  if (!s) throw new Error('no game');
  return s;
}

/**
 * Walks from the field start to the foundry's stairs and down them (017), then waits out the fade.
 * Unless told not to, it then plays the first walk-in's attune (019) through, which holds the player still.
 */
export async function enterFoundry(page: Page, playAttune = true): Promise<void> {
  await page.evaluate(() => {
    window.__GAME__?.step(0);
    window.__helpers?.toFoundry();
  });
  expect((await state(page)).room).toBe('foundry');
  await page.waitForTimeout(500);
  if (playAttune) await page.evaluate((ticks) => window.__GAME__?.step(ticks), ATTUNE_TICKS);
}

/** Walks to STAND and waits for the camera to settle on the player. */
export async function standStill(page: Page): Promise<void> {
  const { x, y } = centre(STAND.tx, STAND.ty);
  await page.evaluate(([px, py]) => window.__helpers?.walkTo(px, py), [x, y] as const);
  await page.waitForTimeout(1500);
}

/** A screen point to click: tile (tx, ty)'s centre, with the camera centred on the player standing at STAND. */
export async function tileOnCanvas(page: Page, tx: number, ty: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / VIEW_WIDTH;
  const stand = centre(STAND.tx, STAND.ty);
  // The camera follows the sprite, whose origin is the bottom of the feet box.
  const camX = stand.x - VIEW_WIDTH / 2;
  const camY = stand.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2;
  const w = centre(tx, ty);
  return { x: box.x + (w.x - camX) * zoom, y: box.y + (w.y - camY) * zoom };
}

export async function screenPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / VIEW_WIDTH;
  return { x: box.x + x * zoom, y: box.y + y * zoom };
}

export async function clickBar(page: Page, pieceId: string): Promise<void> {
  const cell = buildBarCells((await state(page)).unlocked).find((c) => c.pieceId === pieceId);
  if (!cell) throw new Error(`${pieceId} is not on the bar`);
  const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.click(p.x, p.y);
}

export async function clickTile(page: Page, tx: number, ty: number, button: 'left' | 'right' = 'left'): Promise<void> {
  const p = await tileOnCanvas(page, tx, ty);
  await page.mouse.click(p.x, p.y, { button });
  await page.waitForTimeout(50);
  await step(page, 1);
}

/** Presses B and lets the toggle reach the sim. */
export async function toggleBuild(page: Page): Promise<SimSummary> {
  await page.keyboard.press('b');
  await page.waitForTimeout(50);
  return step(page, 1);
}

export const pieceAt = (s: SimSummary, tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
