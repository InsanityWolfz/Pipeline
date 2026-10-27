import { expect, test, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { boot } from './helpers';
import { bannersGone, openWorld, spawnPack, toCrownSpire, toRegion } from './lightingPage';

// 074's performance probe (PROBE=1; a measurement, not a check: real-time frame times on a shared machine or a CI
// runner would flake). In one page, interleaved (070's method):
// - Low against `mood=off` (every mood, light and fog skipped) in a Stormcrown pack fight: Low's mean frame time is to
//   be at most 1.1× mood off's, and its ticks per real second at least 0.9×.
// - Low, Medium and High frame times in the same fight, in a Region 1 fight and in the Conductor's fight.
// - A ground chunk's bake time with and without blending (`?blend=off`).
// The numbers are printed and attached to the test's results.

type Look = Quality | 'off';

interface Window {
  look: Look;
  mean: number;
  p95: number;
  ticksPerSecond: number;
}

/** Real-time play for `ms`: the loop runs the sim, the player held up and firing at the pack (right click held). */
async function measure(page: Page, look: Look, ms: number): Promise<Window> {
  await page.evaluate((l) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.lightingOff(l === 'off');
    if (l !== 'off') g.setLook({ quality: l });
  }, look);
  return page.evaluate(
    async ([l, span]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.resume();
      // Settle a moment on the new look, then time each drawn frame.
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

/** Holds right click (fire the carried round) toward a point `dx`, `dy` view px from the screen's middle. */
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
    // The median window: a burst from another process on the machine spoils one window, not the look's figure.
    const median = (f: (x: Window) => number) => {
      const v = w.map(f).sort((a, b) => a - b);
      return Math.round((v[Math.floor(v.length / 2)] ?? 0) * 10) / 10;
    };
    out[l] = { mean: median((x) => x.mean), p95: median((x) => x.p95), ticksPerSecond: median((x) => x.ticksPerSecond) };
  }
  return out;
}

/** Keeps a pack of `ids` in the fight: spawns more when fewer than half are alive. */
const keepPack = (page: Page, ids: readonly string[]) => async () => {
  const alive = await page.evaluate(() => {
    const s = window.__GAME__?.getState();
    return s ? s.enemies.filter((e) => e.room === s.room && e.health > 0 && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 400).length : 0;
  });
  if (alive < ids.length / 2) await spawnPack(page, ids);
};

const STORM_PACK = ['static-mite', 'storm-sentinel', 'thunderhawk', 'gale-ram', 'thunderhawk'];

test.describe('lighting probe (074)', () => {
  test.skip(!process.env.PROBE, 'set PROBE=1 to measure frame times and bake times');

  test('Low against mood off, and the three tiers, in a Stormcrown pack fight', async ({ page }, info) => {
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

  test('the three tiers in a Region 1 pack fight and in the Conductor’s fight', async ({ page }, info) => {
    test.setTimeout(900_000);
    await openWorld(page);
    await toRegion(page, 'region1');
    await holdFire(page, 140, 0);
    const region1 = await interleave(page, ['low', 'medium', 'high'], 3, 2500, keepPack(page, ['husk', 'husk', 'wisp', 'husk']));
    await page.mouse.up({ button: 'right' });
    await toCrownSpire(page);
    await bannersGone(page);
    await holdFire(page, 0, -80);
    const boss = await interleave(page, ['low', 'medium', 'high'], 3, 2500, async () => undefined);
    await page.mouse.up({ button: 'right' });
    const report = { region1, conductor: boss };
    console.log('region1+conductor', JSON.stringify(report));
    await info.attach('region1-conductor.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  });

  test('a ground chunk’s bake time with and without blending', async ({ page }, info) => {
    test.setTimeout(600_000);
    const bake = async (query: string) => {
      await boot(page, query);
      await page.evaluate(() => window.__helpers?.walkTo(150 * 32, 150 * 32));
      await page.evaluate(() => window.__GAME__?.resume());
      // The view's chunks and those round it, built one a frame.
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().groundBakeMs.length ?? 0), { timeout: 60_000 }).toBeGreaterThanOrEqual(9);
      return page.evaluate(() => [...(window.__GAME__?.ui().groundBakeMs ?? [])]);
    };
    const runs: { off: number[]; on: number[] } = { off: [], on: [] };
    for (let i = 0; i < 3; i++) {
      runs.off.push(...(await bake('?start=hollows&blend=off')));
      runs.on.push(...(await bake('?start=hollows')));
    }
    const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)) * 100) / 100;
    const report = { chunks: { off: runs.off.length, on: runs.on.length }, meanMs: { off: mean(runs.off), on: mean(runs.on) }, ratio: mean(runs.on) / Math.max(0.001, mean(runs.off)) };
    console.log('bake', JSON.stringify(report));
    await info.attach('bake.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.ratio).toBeLessThanOrEqual(1.25);
  });
});
