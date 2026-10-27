import { expect, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { polar } from '../../src/data/worldShape';
import type { LightingShown } from '../../src/render/lighting/LightingView';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';

// 074: helpers for the light and region moods' e2e, shots and probe: the same spot in each region (walked to from the
// Hollows' start with every barrier down), the look's tier, frames drawn, pixel brightness off a screenshot, and a pack
// to fight.

/** A spot in each region, by bearing and distance from the foundry's door: open ground (no road or prop in most of the view), near the Hollows' start. */
export const SPOTS = {
  region1: { bearing: 240, r: 38 },
  hollows: { bearing: 205, r: 63 },
  emberworks: { bearing: 230, r: 95 },
  stormcrown: { bearing: 285, r: 125 },
} as const;
export type Region = keyof typeof SPOTS;

export const lighting = (page: Page): Promise<LightingShown> => page.evaluate(() => {
  const l = window.__GAME__?.ui().lighting;
  if (!l) throw new Error('no game');
  return l;
});

/** Sets the tier (and Flashes), then waits two drawn frames so the look has been applied. */
export async function setLook(page: Page, look: { quality?: Quality; flashes?: boolean }): Promise<void> {
  await page.evaluate((l) => window.__GAME__?.setLook(l), look);
  await frames(page, 2);
}

/** Waits `n` animation frames (each draws the scene once). */
export async function frames(page: Page, n: number): Promise<void> {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);
}

/** `?start=hollows` with every enemy gone but the Conductor (both barriers down), the end card closed (stormcrownShots' start). */
export async function openWorld(page: Page): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) if (e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(1);
    }
    g.step(240);
  });
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
}

/** Lets the discovery banners play out (fast, on the tween clock), so none covers a shot. */
export async function bannersGone(page: Page): Promise<void> {
  // Fast: under load a drawn frame can take a few hundred ms, and the banners advance a frame's worth per frame.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(40));
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            if (window.__GAME__?.ui().landmarks.banner !== null) return false;
            await new Promise((r) => requestAnimationFrame(r));
          }
          return true;
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

/** The `?start=hollows` kit on open Hollows ground (hollowsSandbox's spot), its guards gone, banners played out. */
export async function hollowsGround(page: Page): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const e of g.getState().enemies) if (!['bulwark', 'forgewright', 'conductor'].includes(e.enemyId)) g.setEnemyHealth(e.id, 0);
    g.step(1);
    h.walkTo((98 + 0.5) * 32, (180 + 0.5) * 32);
    g.setPlayerHealth(100);
  });
  await bannersGone(page);
  await cameraSettled(page, 20_000);
}

/** Walks to a region's spot, lets the banners play out and the camera settle. */
export async function toRegion(page: Page, region: Region): Promise<void> {
  const s = SPOTS[region];
  const t = polar(s.bearing, s.r);
  await page.evaluate((p) => window.__helpers?.walkTo((p.tx + 0.5) * 32, (p.ty + 0.5) * 32), t);
  await bannersGone(page);
  await cameraSettled(page, 20_000);
}

/** Into the overworld's Crown Spire by its door (E), the Conductor awake, the player in its middle. */
export async function toCrownSpire(page: Page): Promise<void> {
  const d = CROWN_SPIRE.door.leaveTo;
  await page.evaluate((p) => window.__helpers?.walkTo((p.tx + 0.5) * 32, (p.ty + 0.5) * 32), d);
  await page.evaluate(() => window.__GAME__?.step(1, { interact: true }));
  await bannersGone(page);
  await page.evaluate((m) => window.__helpers?.walkTo((m.tx + 0.5) * 32, (m.ty - 2.5) * 32), CROWN_SPIRE.middle);
  await cameraSettled(page, 20_000);
}

/** Spawns `ids` in a loose pack `dx` px right of the player; returns their ids. */
export function spawnPack(page: Page, ids: readonly string[], dx = 140): Promise<number[]> {
  return page.evaluate(
    ([list, off]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const before = new Set(g.getState().enemies.map((e) => e.id));
      list.forEach((id, i) => g.spawnEnemy(id, p.x + off + (i % 2) * 36, p.y - 50 + i * 30));
      return g.getState().enemies.filter((e) => !before.has(e.id)).map((e) => e.id);
    },
    [ids, dx] as const,
  );
}

/**
 * Fires the carried `item` at the nearest enemy for `frames` drawn frames, `ticksPerFrame` ticks each (the player kept up), and
 * returns what each frame's lighting showed.
 */
export function fightFrames(page: Page, item: string, frames: number, ticksPerFrame = 1): Promise<LightingShown[]> {
  return page.evaluate(
    async ([held, n, per]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.hold(held);
      const seen: LightingShown[] = [];
      for (let t = 0; t < n; t++) {
        g.setPlayerHealth(100);
        const s = g.getState();
        const near = s.enemies.filter((e) => e.room === s.room && e.health > 0).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
        g.step(per, { use: true, aimX: near?.x ?? s.player.x + 100, aimY: (near?.y ?? s.player.y) - 10 });
        await new Promise((r) => requestAnimationFrame(r));
        seen.push(g.ui().lighting);
      }
      return seen;
    },
    [item, frames, ticksPerFrame] as const,
  );
}

/** Mean brightness ((r + g + b) / 3, 0–255) of a screenshot's pixels in a box (view px of the page), optionally only where `mask` is set. */
export async function brightness(page: Page, png: Buffer, box: { x: number; y: number; w: number; h: number }): Promise<number> {
  return page.evaluate(
    async ([b64, b]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('no 2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(b.x, b.y, b.w, b.h).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += ((d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0)) / 3;
      return sum / (d.length / 4);
    },
    [png.toString('base64'), box] as const,
  );
}

/** The pixels of a box in a screenshot, as [r, g, b] triples. */
export async function pixels(page: Page, png: Buffer, box: { x: number; y: number; w: number; h: number }): Promise<number[][]> {
  return page.evaluate(
    async ([b64, b]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('no 2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(b.x, b.y, b.w, b.h).data;
      const out: number[][] = [];
      for (let i = 0; i < d.length; i += 4) out.push([d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0]);
      return out;
    },
    [png.toString('base64'), box] as const,
  );
}

/** Waits until the drawn frame shows the sim's tick (after a step). */
export async function drawn(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().drawnTick ?? -1) === (window.__GAME__?.getState().tick ?? -2))).toBe(true);
}
