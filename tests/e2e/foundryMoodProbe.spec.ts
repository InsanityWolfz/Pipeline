import { expect, test, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { forgeLine } from './foundryMoodPage';
import { frames } from './lightingPage';

// 079's performance probe (PROBE=1; a measurement, not a check, as 074.4's): a busy foundry (twelve Smelters and kilns
// working, the coil's line, conduits full and the intake filling), in real time. In one page, interleaved (070's
// method): Low against the mood off (`lightingOff`: the mood, lights, heat, steam, sparks and pulses skipped): Low's
// mean frame time is to be at most 1.1× the mood off's, its ticks per real second at least 0.9×. Then Low, Medium and
// High in the same scene. The numbers are printed and attached to the test's results.

type Look = Quality | 'off';

interface Window {
  look: Look;
  mean: number;
  p95: number;
  ticksPerSecond: number;
}

async function measure(page: Page, look: Look, ms: number): Promise<Window> {
  await page.evaluate((l) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.lightingOff(l === 'off');
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

async function interleave(page: Page, looks: readonly Look[], rounds: number, ms: number): Promise<Record<string, { mean: number; p95: number; ticksPerSecond: number }>> {
  const all: Window[] = [];
  for (let r = 0; r < rounds; r++) for (const l of r % 2 === 0 ? looks : [...looks].reverse()) all.push(await measure(page, l, ms));
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

test.describe('foundry mood probe (079)', () => {
  test.skip(!process.env.PROBE, 'set PROBE=1 to measure frame times');

  test('Low against the mood off, and the three tiers, in a busy foundry', async ({ page }, info) => {
    test.setTimeout(900_000);
    // Enough supply for the whole run: 90 crafts a forge (a hopper holds 99), at one a second.
    await forgeLine(page, { units: 12, per: 90, coil: true, intake: true });
    await page.evaluate(() => {
      window.__helpers?.walkTo(12 * 32, 7 * 32);
      window.__GAME__?.step(120);
      window.__GAME__?.loadEntrances([null, null, null, null, null]);
    });
    await frames(page, 30);
    const working = await page.evaluate(() => (window.__GAME__?.getState().foundry.pieces ?? []).filter((p) => p.kind === 'machine' && p.status === 'working').length);
    const ab = await interleave(page, ['off', 'low'], 6, 2500);
    const tiers = await interleave(page, ['low', 'medium', 'high'], 3, 2500);
    const mood = await page.evaluate(() => window.__GAME__?.ui().foundryMood);
    const report = { working, ab, tiers, frameRatio: (ab.low?.mean ?? 0) / (ab.off?.mean ?? 1), tickRatio: (ab.low?.ticksPerSecond ?? 0) / (ab.off?.ticksPerSecond ?? 1), lastFrame: { running: mood?.running.length, particles: mood?.particles, pulses: mood?.pulses.live } };
    console.log('foundry', JSON.stringify(report));
    await info.attach('foundry.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.frameRatio).toBeLessThanOrEqual(1.1);
    expect.soft(report.tickRatio).toBeGreaterThanOrEqual(0.9);
  });
});
