import { expect, type Page } from '@playwright/test';
import type { WeatherShown, WorldShown } from '../../src/render/world/worldShown';
import { setPieceDef, setPieceAnchor } from '../../src/data/setPieces';
import { cameraSettled } from './helpers';
import { bannersGone, frames } from './lightingPage';

// 077: helpers for the world's life e2e, shots and probe: what `ui().world` and `ui().weather` show, a walk to a set
// piece (beside it, level with its middle, so its top is in view), and hovering a world point with the mouse.

export const world = (page: Page): Promise<WorldShown> =>
  page.evaluate(() => {
    const w = window.__GAME__?.ui().world;
    if (!w) throw new Error('no game');
    return w;
  });

export const weather = (page: Page): Promise<WeatherShown> =>
  page.evaluate(() => {
    const w = window.__GAME__?.ui().weather;
    if (!w) throw new Error('no game');
    return w;
  });

/** Walks to the first of `spots` (world px) the player can reach (a long walk can stop short: it tries a few rounds). */
export async function walkToAny(page: Page, spots: readonly { x: number; y: number }[]): Promise<void> {
  const ok = await page.evaluate((list) => {
    for (let round = 0; round < 4; round++) {
      for (const t of list) {
        try {
          window.__helpers?.walkTo(t.x, t.y);
          return true;
        } catch {
          // the next spot, or the next round from where the walk got to
        }
      }
    }
    return false;
  }, spots);
  expect(ok, 'reached a spot').toBe(true);
  await bannersGone(page);
  await cameraSettled(page, 20_000);
  await frames(page, 4);
}

/** Stands beside a set piece, level with its middle (its top in view), else in front of it. */
export async function toSetPiece(page: Page, id: string): Promise<{ x: number; y: number }> {
  const p = setPieceDef(id);
  const a = setPieceAnchor(p, 32);
  const up = Math.min(p.look.h - 150, p.look.h / 2);
  await walkToAny(page, [
    { x: a.x - p.look.w / 2 - 40, y: a.y - up },
    { x: a.x + p.look.w / 2 + 40, y: a.y - up },
    // In front: the row just below its footprint (placement rule 2: walkable for at least half its width).
    { x: a.x - 16, y: a.y + 16 },
    { x: a.x + 16, y: a.y + 16 },
    { x: a.x - 48, y: a.y + 16 },
    { x: a.x + 48, y: a.y + 16 },
  ]);
  return a;
}

/** Moves the mouse over a world point (the camera's view mapped onto the canvas). */
export async function hoverWorld(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const cam = await page.evaluate(() => window.__GAME__?.ui().camera ?? { x: 0, y: 0 });
  const k = box.width / 640;
  await page.mouse.move(box.x + box.width / 2 + (x - cam.x) * k, box.y + box.height / 2 + (y - cam.y) * k);
  await frames(page, 3);
}

export interface Sampled {
  world: WorldShown;
  weather: WeatherShown;
  all: number;
  particles: number;
  deathMotes: number;
}

/**
 * Waits `n` frames, returning what `ui().world` and `ui().weather` showed on each, with `ui().particles`: `all` live
 * (076's count, the weather among them), `particles` those that aren't weather, and the death motes alive.
 */
export function sample(page: Page, n: number): Promise<Sampled[]> {
  return page.evaluate(async (count) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const out: Sampled[] = [];
    for (let i = 0; i < count; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const u = g.ui();
      const weather = u.weather.live + u.weather.fading;
      out.push({ world: u.world, weather: u.weather, all: u.particles.live, particles: u.particles.live - weather, deathMotes: u.particles.deathMotes });
    }
    return out;
  }, n);
}
