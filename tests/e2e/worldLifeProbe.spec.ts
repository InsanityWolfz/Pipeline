import { expect, test, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { boot } from './helpers';
import { bannersGone, openWorld, spawnPack, toRegion } from './lightingPage';
import { toSetPiece } from './worldLifePage';

// 077's performance probe (PROBE=1; a measurement, not a check, as 074.4's). In one page, interleaved:
// - Low against the world off (`worldLifeOff`: no plants, sway, ripples, ley flow, set-piece loops or weather) in a
//   Stormcrown pack fight in the rain and in Region 1's densest grove: Low's mean frame time is to be at most 1.1×
//   the world off's, and its ticks per real second at least 0.9×.
// - Low, Medium and High frame times in the same scenes.
// - A chunk's whole build (the ground bake, its standing sprites and its decor) with and without the world's detail
//   (`?world=off`), and the time to draw 077's new vector frames (what they add to the boot bake).

type Look = Quality | 'off';

interface Window {
  look: Look;
  mean: number;
  p95: number;
  ticksPerSecond: number;
}

/** Real-time play for `ms` on a look: the loop runs the sim, the player kept up (right click held fires). */
async function measure(page: Page, look: Look, ms: number): Promise<Window> {
  await page.evaluate((l) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.worldLifeOff(l === 'off');
    g.setLook({ quality: l === 'off' ? 'low' : l });
  }, look);
  return page.evaluate(
    async ([l, span]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.resume();
      for (let i = 0; i < 10; i++) await new Promise((r) => requestAnimationFrame(r));
      const ds: number[] = [];
      const tick0 = g.getState().tick;
      const t0 = performance.now();
      let last = t0;
      while (performance.now() - t0 < span) {
        g.setPlayerHealth(100);
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now();
        ds.push(now - last);
        last = now;
      }
      const ticks = g.getState().tick - tick0;
      const secs = (performance.now() - t0) / 1000;
      ds.sort((a, b) => a - b);
      return { look: l, mean: ds.reduce((a, b) => a + b, 0) / ds.length, p95: ds[Math.floor(ds.length * 0.95)] ?? 0, ticksPerSecond: ticks / secs };
    },
    [look, ms] as const,
  );
}

async function holdFire(page: Page, dx: number, dy: number): Promise<void> {
  await page.evaluate(() => window.__helpers?.hold('ley-bolt'));
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const k = box.width / 640;
  await page.mouse.move(box.x + box.width / 2 + dx * k, box.y + box.height / 2 + dy * k);
  await page.mouse.down({ button: 'right' });
}

/** Rounds of the looks in turn, `ms` each; each look's median window. */
async function interleave(page: Page, looks: readonly Look[], rounds: number, ms: number, refill: () => Promise<void>): Promise<Record<string, { mean: number; p95: number; ticksPerSecond: number }>> {
  const all: Window[] = [];
  for (let r = 0; r < rounds; r++) {
    for (const l of looks) {
      await refill();
      all.push(await measure(page, l, ms));
    }
  }
  const out: Record<string, { mean: number; p95: number; ticksPerSecond: number }> = {};
  for (const l of looks) {
    const w = all.filter((x) => x.look === l);
    const median = (f: (x: Window) => number) => {
      const v = w.map(f).sort((a, b) => a - b);
      return Math.round((v[Math.floor(v.length / 2)] ?? 0) * 10) / 10;
    };
    out[l] = { mean: median((x) => x.mean), p95: median((x) => x.p95), ticksPerSecond: median((x) => x.ticksPerSecond) };
  }
  return out;
}

const keepPack = (page: Page, ids: readonly string[]) => async () => {
  const alive = await page.evaluate(() => {
    const s = window.__GAME__?.getState();
    return s ? s.enemies.filter((e) => e.room === s.room && e.health > 0 && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 400).length : 0;
  });
  if (alive < ids.length / 2) await spawnPack(page, ids);
};

const STORM_PACK = ['static-mite', 'storm-sentinel', 'thunderhawk', 'gale-ram', 'thunderhawk'];

test.describe('world life probe (077)', () => {
  test.skip(!process.env.PROBE, 'set PROBE=1 to measure frame times and build times');

  test('Low against the world off, and the three tiers, in a Stormcrown pack fight in the rain', async ({ page }, info) => {
    test.setTimeout(900_000);
    await openWorld(page);
    await toRegion(page, 'stormcrown');
    await holdFire(page, 140, 0);
    const ab = await interleave(page, ['off', 'low'], 6, 2500, keepPack(page, STORM_PACK));
    const tiers = await interleave(page, ['low', 'medium', 'high'], 3, 2500, keepPack(page, STORM_PACK));
    await page.mouse.up({ button: 'right' });
    const report = { ab, tiers, frameRatio: (ab.low?.mean ?? 0) / (ab.off?.mean ?? 1), tickRatio: (ab.low?.ticksPerSecond ?? 0) / (ab.off?.ticksPerSecond ?? 1) };
    console.log('stormcrown', JSON.stringify(report));
    await info.attach('stormcrown.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.frameRatio).toBeLessThanOrEqual(1.1);
    expect.soft(report.tickRatio).toBeGreaterThanOrEqual(0.9);
  });

  test('Low against the world off, and the three tiers, in Region 1’s densest grove', async ({ page }, info) => {
    test.setTimeout(900_000);
    await openWorld(page);
    await toSetPiece(page, 'fallen-colossus');
    await bannersGone(page);
    const ab = await interleave(page, ['off', 'low'], 6, 2500, async () => undefined);
    const tiers = await interleave(page, ['low', 'medium', 'high'], 3, 2500, async () => undefined);
    const report = { ab, tiers, frameRatio: (ab.low?.mean ?? 0) / (ab.off?.mean ?? 1), tickRatio: (ab.low?.ticksPerSecond ?? 0) / (ab.off?.ticksPerSecond ?? 1) };
    console.log('grove', JSON.stringify(report));
    await info.attach('grove.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.frameRatio).toBeLessThanOrEqual(1.1);
    expect.soft(report.tickRatio).toBeGreaterThanOrEqual(0.9);
  });

  test('a chunk’s whole build with and without the world’s detail, and the boot bake of 077’s frames', async ({ page }, info) => {
    test.setTimeout(600_000);
    const build = async (query: string) => {
      await boot(page, query);
      await page.evaluate(() => window.__helpers?.walkTo(150 * 32, 150 * 32));
      await page.evaluate(() => window.__GAME__?.resume());
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().chunkBuildMs.length ?? 0), { timeout: 60_000 }).toBeGreaterThanOrEqual(9);
      return page.evaluate(() => [...(window.__GAME__?.ui().chunkBuildMs ?? [])]);
    };
    const runs: { off: number[]; on: number[] } = { off: [], on: [] };
    for (let i = 0; i < 3; i++) {
      runs.off.push(...(await build('?start=hollows&world=off')));
      runs.on.push(...(await build('?start=hollows')));
    }
    const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)) * 100) / 100;
    // The boot bake: 077's frames drawn at the game's texture scale, timed in the page (Vite serves the modules).
    const bake = await page.evaluate(async () => {
      const path = '/src/render/vector/catalog.ts';
      const { vectorFrames } = (await import(/* @vite-ignore */ path)) as { vectorFrames: () => { name: string; size: readonly [number, number]; anchor: readonly [number, number]; draw: (c: CanvasRenderingContext2D, px: number) => void }[] };
      const mine = vectorFrames().filter((f) => /^(decor-|scatter-|setpiece-|fx-ripple|fx-ley-bead|ow-(ruin-(drum|capital|slab)|rock-\d-moss|rubble-(block|drum|heap)|chimney-stump|kiln-end|iron-rod-(bent|snapped)|cairn-(plate|glass)))/.test(f.name));
      const c = document.createElement('canvas').getContext('2d');
      if (!c) throw new Error('no 2d');
      const t0 = performance.now();
      for (const f of mine) {
        c.canvas.width = Math.ceil(f.size[0] * 2);
        c.canvas.height = Math.ceil(f.size[1] * 2);
        c.setTransform(2, 0, 0, 2, f.anchor[0] * 2, f.anchor[1] * 2);
        f.draw(c, 2);
      }
      return { frames: mine.length, ms: Math.round((performance.now() - t0) * 10) / 10 };
    });
    const report = { chunks: { off: runs.off.length, on: runs.on.length }, meanMs: { off: mean(runs.off), on: mean(runs.on) }, ratio: mean(runs.on) / Math.max(0.001, mean(runs.off)), bake };
    console.log('build', JSON.stringify(report));
    await info.attach('build.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.ratio).toBeLessThanOrEqual(1.25);
  });
});
