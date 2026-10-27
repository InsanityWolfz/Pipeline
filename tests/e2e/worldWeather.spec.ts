import { expect, test, type Page } from '@playwright/test';
import { WEATHER, WEATHER_BUDGET, WEATHER_CAP } from '../../src/data/weather';
import { watchErrors } from './helpers';
import { stepUntil } from './hollowsSandbox';
import { drawn, frames, lighting, openWorld, pixels, setLook, spawnPack, toCrownSpire, toRegion, type Region } from './lightingPage';
import { sample, weather } from './worldLifePage';

// 077: each region's weather in the game: its layers on every tier within the cap; the shared particle budget kept
// through a 10-kill burst in the dust; weather lightning forced with the hook (its bolt, 074's flash and rod-strike
// light) and none with Flashes off, on Low or in the Conductor's fight (where weather drops to Low's counts); and
// readability under the rain: a telegraph as red as in Region 1, the HUD's pixels the same with weather on and off.

const LAYERS: Record<Region, readonly string[]> = {
  region1: WEATHER.meadow.layers.map((l) => l.id),
  hollows: WEATHER.hollows.layers.map((l) => l.id),
  emberworks: WEATHER.ember.layers.map((l) => l.id),
  stormcrown: WEATHER.storm.layers.map((l) => l.id),
};

test('each region shows its weather on every tier, never past the tier’s cap', async ({ page }) => {
  test.setTimeout(480_000);
  const errors = watchErrors(page);
  await openWorld(page);
  for (const region of ['region1', 'hollows', 'emberworks', 'stormcrown'] as const) {
    await toRegion(page, region);
    for (const q of ['low', 'medium', 'high'] as const) {
      await setLook(page, { quality: q });
      await expect.poll(async () => (await weather(page)).live, { timeout: 20_000 }).toBeGreaterThan(0);
      for (const s of await sample(page, 20)) {
        expect(s.weather.live, `${region} ${q}`).toBeLessThanOrEqual(WEATHER_CAP[q]);
        for (const id of Object.keys(s.weather.layers)) expect(LAYERS[region], `${region} ${q}`).toContain(id);
      }
    }
    const high = await weather(page);
    expect(Object.keys(high.layers).length, region).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('killing 10 Hollows enemies at once in the dust: weather stops spawning while the budget less the death motes’ room is used, and never passes its cap', async ({ page }, info) => {
  test.setTimeout(300_000);
  await openWorld(page);
  await toRegion(page, 'hollows');
  const most: Record<string, number> = {};
  for (const q of ['low', 'high'] as const) {
    await setLook(page, { quality: q });
    await expect.poll(async () => (await weather(page)).live, { timeout: 20_000 }).toBeGreaterThan(0);
    const ids = await spawnPack(page, ['charger', 'shardback', 'burrower', 'sniper', 'charger', 'shardback', 'burrower', 'sniper', 'charger', 'shardback'], 120);
    await page.evaluate((list) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const id of list) g.setEnemyHealth(id, 0);
      g.step(1);
    }, ids);
    const seen = await sample(page, 40);
    let gated = 0;
    for (const [i, s] of seen.entries()) {
      expect(s.weather.live, q).toBeLessThanOrEqual(WEATHER_CAP[q]);
      // The room this frame's spawns had: the budget less the death motes' room and every live particle.
      expect(s.weather.room, q).toBeLessThanOrEqual(Math.max(0, WEATHER_BUDGET.particles[q] - WEATHER_BUDGET.deathMotes[q] - s.particles));
      const before = seen[i - 1];
      if (s.weather.room === 0 && before) {
        gated += 1;
        expect(s.weather.live, `${q}: no spawn with no room`).toBeLessThanOrEqual(before.weather.live);
      }
    }
    if (q === 'low') expect(gated).toBeGreaterThan(0);
    most[q] = Math.max(...seen.map((s) => s.particles + s.weather.live));
  }
  // 014's bursts aren't under the budget until 078 (076 brings the death motes): what they and the weather reached.
  await info.attach('burst.json', { body: JSON.stringify(most), contentType: 'application/json' });
  console.log('burst', JSON.stringify(most));
});

/** Forces the next weather strike and waits up to 10 frames for it; the strike count and the lighting on the frame it struck. */
async function forceStrike(page: Page): Promise<{ struck: boolean; flash: number; rodLights: number; bolt: boolean }> {
  return page.evaluate(async () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const before = g.ui().weather.strikes;
    g.strikeWeather();
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const u = g.ui();
      if (u.weather.strikes > before) return { struck: true, flash: u.lighting.flash, rodLights: u.lighting.lights.rodStrike ?? 0, bolt: u.weather.bolt };
    }
    return { struck: false, flash: 0, rodLights: 0, bolt: false };
  });
}

test('weather lightning: a forced strike draws its bolt, flashes 074’s ambient and lights its target; none with Flashes off, on Low or in the Conductor’s fight', async ({ page }) => {
  test.setTimeout(420_000);
  await openWorld(page);
  await toRegion(page, 'stormcrown');
  await setLook(page, { quality: 'medium', flashes: true });
  const on = await forceStrike(page);
  expect(on).toMatchObject({ struck: true, bolt: true });
  expect(on.flash).toBeGreaterThan(0);
  expect(on.rodLights).toBeGreaterThan(0);
  const target = (await weather(page)).last;
  expect(['tower', 'rod', 'cairn', 'cliff']).toContain(target?.kind);
  await setLook(page, { quality: 'high', flashes: false });
  expect((await forceStrike(page)).struck).toBe(false);
  await setLook(page, { quality: 'low', flashes: true });
  expect((await forceStrike(page)).struck).toBe(false);
  // The Conductor's fight: weather at Low's counts, and no weather lightning.
  await setLook(page, { quality: 'high' });
  await toCrownSpire(page);
  await page.evaluate(() => window.__GAME__?.step(30));
  await expect.poll(async () => (await weather(page)).fight, { timeout: 30_000 }).toBe(true);
  expect((await forceStrike(page)).struck).toBe(false);
  const lowCounts = WEATHER.storm.layers.reduce((n, l) => n + l.count.low, 0);
  await expect.poll(async () => (await weather(page)).live, { timeout: 20_000 }).toBeLessThanOrEqual(lowCounts);
});

test('under the Stormcrown’s rain on High a telegraph stays as red as in Region 1, and the HUD’s pixels match with weather on and off', async ({ page }) => {
  test.setTimeout(300_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / 640;
  const redness: number[] = [];
  for (const region of ['region1', 'stormcrown'] as const) {
    await toRegion(page, region);
    if (region === 'stormcrown') await expect.poll(async () => (await weather(page)).layers.rain ?? 0, { timeout: 20_000 }).toBeGreaterThan(100);
    const [id] = await spawnPack(page, ['husk'], 26);
    if (id === undefined) throw new Error('no husk');
    await stepUntil(page, id, 'windup', 12);
    await drawn(page);
    const px = await pixels(page, await page.screenshot(), { x: Math.round(size.width / 2 - 10 * k), y: Math.round(size.height / 2 - 60 * k), w: Math.round(90 * k), h: Math.round(100 * k) });
    const reds = px.map((p) => (p[0] ?? 0) - Math.max(p[1] ?? 0, p[2] ?? 0)).sort((x, y) => y - x);
    redness.push(reds.slice(0, Math.ceil(reds.length / 10)).reduce((s, v) => s + v, 0) / Math.ceil(reds.length / 10));
    await page.evaluate((e) => {
      window.__GAME__?.setEnemyHealth(e, 0);
      window.__GAME__?.step(1);
    }, id);
  }
  expect(redness[1] ?? 0).toBeGreaterThanOrEqual(0.85 * (redness[0] ?? 0));
  // The HUD: the HP bar's own pixels with the weather on and off.
  const hud = async () => {
    const b = await page.evaluate(() => window.__GAME__?.ui().health.box ?? { x: 0, y: 0, w: 0, h: 0 });
    return pixels(page, await page.screenshot(), { x: Math.round((b.x + 8) * k), y: Math.round((b.y + 4) * k), w: Math.round(b.w * 0.5 * k), h: Math.round(8 * k) });
  };
  await page.evaluate(() => window.__GAME__?.setPlayerHealth(100));
  await frames(page, 2);
  const withRain = await hud();
  await page.evaluate(() => window.__GAME__?.worldLifeOff(true));
  await frames(page, 3);
  const without = await hud();
  await page.evaluate(() => window.__GAME__?.worldLifeOff(false));
  const diff = withRain.reduce((s, p, i) => s + Math.abs((p[0] ?? 0) - (without[i]?.[0] ?? 0)) + Math.abs((p[1] ?? 0) - (without[i]?.[1] ?? 0)) + Math.abs((p[2] ?? 0) - (without[i]?.[2] ?? 0)), 0) / Math.max(1, withRain.length);
  expect(withRain.length).toBeGreaterThan(0);
  expect(diff).toBeLessThan(3);
  // Enemies stay in the readability layer: nothing here tints them (074's lighting is unchanged by weather).
  expect((await lighting(page)).quality).toBe('high');
});
