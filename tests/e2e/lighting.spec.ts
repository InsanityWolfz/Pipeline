import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { LIGHT_CATCH } from '../../src/data/lights';
import { boot, cameraSettled, watchErrors } from './helpers';
import { bootTitle, clickRow, clickView, flowIs, reloadTitle } from './flowPage';
import { stepUntil } from './hollowsSandbox';
import { landmarkDef } from '../../src/data/landmarks';
import { WORLD_SHAPE } from '../../src/data/worldShape';
import { OVERWORLD } from '../../src/data/overworld';
import { drawn, hollowsGround, fightFrames, frames, lighting, openWorld, pixels, setLook, spawnPack, toRegion, bannersGone, type Region } from './lightingPage';

// 074: light and region moods. The Graphics quality row; what each tier draws; lights by source and the budgets; the
// light catch; the same game on every tier; the regions darkening in turn with a smooth blend at an edge and the
// readability layer bright in all of them; and lightning's ambient flash, off with Flashes off.

const qualityRow = (page: Page) => page.evaluate(() => window.__GAME__?.ui().flow.settings?.rows.find((r) => r.id === 'quality')?.value ?? null);
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').quality ?? null, STORAGE_KEYS.settings);

test('Settings has a Graphics quality row: Medium by default, steps Low/Medium/High, kept across a reload, a bad value reads Medium', async ({ page }) => {
  test.setTimeout(60_000);
  await bootTitle(page);
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  expect(await qualityRow(page)).toBe('Medium');
  await clickRow(page, 'quality');
  await expect.poll(() => qualityRow(page)).toBe('High');
  expect(await stored(page)).toBe('high');
  await clickRow(page, 'quality');
  await expect.poll(() => qualityRow(page)).toBe('Low');
  await clickRow(page, 'quality');
  await expect.poll(() => qualityRow(page)).toBe('Medium');
  await clickRow(page, 'quality');
  await reloadTitle(page);
  await clickRow(page, 'settings');
  await expect.poll(() => qualityRow(page)).toBe('High');
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? '{}'), quality: 'ultra' })), STORAGE_KEYS.settings);
  await reloadTitle(page);
  await clickRow(page, 'settings');
  await expect.poll(() => qualityRow(page)).toBe('Medium');
});

test('a change on the Settings row applies to the running game at once', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  await frames(page, 2);
  const before = await lighting(page);
  expect(before.quality).toBe('medium');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  const settings = pauseRows()[1];
  if (!settings) throw new Error('no settings row');
  await clickView(page, settings.x + 40, settings.y + 10);
  await flowIs(page, 'settings');
  await clickRow(page, 'quality');
  await expect.poll(async () => (await lighting(page)).quality).toBe('high');
  // High lights the props too.
  expect((await lighting(page)).lit).toBeGreaterThan(before.lit);
  expect(errors).toEqual([]);
});

test('each tier in the Hollows: Low tints and places no light, Medium lights the ground, High the props too, with fog', async ({ page }) => {
  test.setTimeout(90_000);
  await hollowsGround(page);
  await setLook(page, { quality: 'low' });
  const low = await lighting(page);
  expect(low).toMatchObject({ quality: 'low', ring: 3, lit: 0, placed: [], fog: 0, catches: [] });
  expect(low.tint).not.toBeNull();
  await setLook(page, { quality: 'medium' });
  const medium = await lighting(page);
  expect(medium).toMatchObject({ quality: 'medium', ring: 3, fog: 1 });
  expect(medium.lit).toBeGreaterThan(0);
  expect(medium.lights.face).toBe(1);
  await setLook(page, { quality: 'high' });
  const high = await lighting(page);
  expect(high).toMatchObject({ quality: 'high', ring: 3, fog: 2 });
  expect(high.lit).toBeGreaterThan(medium.lit);
  // The world layer's look is set over its registry on a change only, not every frame.
  await frames(page, 10);
  expect((await lighting(page)).applied).toBe(high.applied);
});

test('lights by source and tier while fighting a pack: budgets kept, rounds lit only on High', async ({ page }) => {
  test.setTimeout(300_000);
  await hollowsGround(page);
  await setLook(page, { quality: 'high' });
  await spawnPack(page, ['charger', 'shardback', 'burrower', 'charger']);
  const high = await fightFrames(page, 'ley-bolt', 40);
  expect(Math.max(...high.map((l) => l.placed.length))).toBeLessThanOrEqual(16);
  expect(high.some((l) => (l.lights.muzzle ?? 0) > 0)).toBe(true);
  expect(high.some((l) => (l.lights.round ?? 0) > 0)).toBe(true);
  for (const l of high) {
    expect(l.lights.face).toBe(1);
    for (const p of l.placed.filter((x) => x.source === 'round')) expect([p.color, p.radius]).toEqual(['cyan', 28]);
  }
  const bombs = await fightFrames(page, 'bomb', 60, 2);
  expect(bombs.some((l) => (l.lights.burst ?? 0) > 0)).toBe(true);
  await setLook(page, { quality: 'medium' });
  await spawnPack(page, ['charger', 'shardback']);
  const medium = await fightFrames(page, 'ley-bolt', 30);
  expect(Math.max(...medium.map((l) => l.placed.length))).toBeLessThanOrEqual(8);
  expect(medium.every((l) => (l.lights.round ?? 0) === 0)).toBe(true);
  expect(medium.some((l) => (l.lights.muzzle ?? 0) > 0)).toBe(true);
  await setLook(page, { quality: 'low' });
  const low = await fightFrames(page, 'ley-bolt', 10);
  expect(low.every((l) => l.placed.length === 0)).toBe(true);
});

test('an enemy beside a live ley vein catches its cyan light on Medium (at most 0.35), and none on Low', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page, '?start=field');
  const vein = await page.evaluate(() => {
    const s = window.__GAME__?.getState();
    const p = s?.player ?? { x: 0, y: 0 };
    return s?.nodes.filter((n) => n.nodeId === 'ley-vein' && n.room === 'overworld' && n.uses > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] ?? null;
  });
  if (!vein) throw new Error('no ley vein');
  await page.evaluate((v) => window.__helpers?.walkTo(v.x - 70, v.y + 40), vein);
  await cameraSettled(page, 20_000);
  await bannersGone(page);
  await setLook(page, { quality: 'medium' });
  const id = await page.evaluate((v) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const s = g.spawnEnemy('husk', v.x + 14, v.y + 10);
    return s.enemies[s.enemies.length - 1]?.id ?? -1;
  }, vein);
  await drawn(page);
  await frames(page, 2);
  const medium = await lighting(page);
  expect(medium.lights.ley ?? 0).toBeGreaterThan(0);
  const c = medium.catches.find((x) => x.kind === 'enemy' && x.id === id);
  expect(c).toBeDefined();
  expect(c?.alpha ?? 0).toBeGreaterThan(0);
  expect(c?.alpha ?? 1).toBeLessThanOrEqual(LIGHT_CATCH.maxAlpha);
  // Cyan: blue and green well over red.
  const color = c?.color ?? 0;
  expect((color >> 8) & 0xff).toBeGreaterThan((color >> 16) & 0xff);
  expect(color & 0xff).toBeGreaterThan((color >> 16) & 0xff);
  await setLook(page, { quality: 'low' });
  expect((await lighting(page)).catches).toEqual([]);
});

test('the same seed and commands give the same game on Low and on High', async ({ browser }) => {
  test.setTimeout(90_000);
  const run = async (quality: 'low' | 'high') => {
    const page = await browser.newPage();
    await boot(page, '?start=field&seed=7407');
    await setLook(page, { quality });
    const state = await page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 240; t++) {
        g.step(1, { moveX: t < 120 ? 1 : -1, moveY: t % 60 < 30 ? 1 : 0, fire: t % 20 < 10, aimX: 3000, aimY: 3000 });
        if (t % 8 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
      return JSON.stringify(g.getState());
    });
    await page.close();
    return state;
  };
  expect(await run('low')).toEqual(await run('high'));
});

/** Points every 8 px along the first road that runs out across Region 1's edge, from `r0` to `r1` tiles out, world px. */
function alongRoad(r0: number, r1: number): { x: number; y: number }[] {
  const c = { x: (WORLD_SHAPE.centre.tx + 0.5) * 32, y: (WORLD_SHAPE.centre.ty + 0.5) * 32 };
  const tiles = (p: { x: number; y: number }) => Math.hypot(p.x - c.x, p.y - c.y) / 32;
  for (const road of OVERWORLD.paths) {
    const pts = road.map((t) => ({ x: (t.tx + 1) * 32, y: (t.ty + 1) * 32 }));
    const dense: { x: number; y: number }[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (!a || !b) continue;
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
      for (let k = 0; k < n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    const from = dense.findIndex((p) => tiles(p) >= r0 && tiles(p) < r0 + 1);
    const to = dense.findIndex((p, i) => i > from && tiles(p) >= r1);
    if (from >= 0 && to > from) return dense.slice(from, to + 1);
  }
  throw new Error('no road across the edge');
}

/** The screen's median brightness over the world (clear of the HUD's top and bottom): the ground, however much road or prop is in view. */
async function worldBrightness(page: Page): Promise<number> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const px = await pixels(page, await page.screenshot(), { x: 0, y: Math.round(size.height * 0.2), w: size.width, h: Math.round(size.height * 0.55) });
  const b = px.map((p) => ((p[0] ?? 0) + (p[1] ?? 0) + (p[2] ?? 0)) / 3).sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)] ?? 0;
}

/** A storm sentinel's body pixels' brightness: a shot without it and one with it, over its box, where they differ. */
async function enemyBody(page: Page): Promise<number> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / 640;
  const box = { x: Math.round(size.width / 2 + 60 * k), y: Math.round(size.height / 2 - 50 * k), w: Math.round(70 * k), h: Math.round(70 * k) };
  await page.evaluate(() => window.__GAME__?.step(1));
  await drawn(page);
  const without = await pixels(page, await page.screenshot(), box);
  const id = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    const s = g.spawnEnemy('storm-sentinel', p.x + 95, p.y + 10);
    return s.enemies[s.enemies.length - 1]?.id ?? -1;
  });
  await page.evaluate(() => window.__GAME__?.step(1));
  await drawn(page);
  const withIt = await pixels(page, await page.screenshot(), box);
  await page.evaluate((e) => {
    window.__GAME__?.setEnemyHealth(e, 0);
    window.__GAME__?.step(1);
  }, id);
  const body = withIt.filter((p, i) => {
    const q = without[i] ?? [0, 0, 0];
    return Math.abs((p[0] ?? 0) - (q[0] ?? 0)) + Math.abs((p[1] ?? 0) - (q[1] ?? 0)) + Math.abs((p[2] ?? 0) - (q[2] ?? 0)) > 90;
  });
  expect(body.length).toBeGreaterThan(200);
  return body.reduce((s, p) => s + ((p[0] ?? 0) + (p[1] ?? 0) + (p[2] ?? 0)) / 3, 0) / body.length;
}

/** The HP bar's pixels: the top-left of the HP block the HUD reports (view px), inset clear of its rounded corners and of the world showing between its pieces. */
async function hudPixels(page: Page): Promise<number[][]> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / 640;
  const b = await page.evaluate(() => window.__GAME__?.ui().health.box ?? { x: 0, y: 0, w: 0, h: 0 });
  return pixels(page, await page.screenshot(), { x: Math.round((b.x + 8) * k), y: Math.round((b.y + 4) * k), w: Math.round(b.w * 0.5 * k), h: Math.round(8 * k) });
}

test('the regions darken in turn, and the ambient blends a step at a time across Region 1’s edge', async ({ page }) => {
  test.setTimeout(420_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const order: Region[] = ['region1', 'hollows', 'emberworks', 'stormcrown'];
  const seen: { ring: number; ground: number }[] = [];
  for (const region of order) {
    await toRegion(page, region);
    await frames(page, 3);
    seen.push({ ring: (await lighting(page)).ring, ground: await worldBrightness(page) });
    if (region !== 'region1') continue;
    // Walking out along a road across the edge into the Hollows: the ambient steps a little at a time, never at once.
    const steps = await page.evaluate(async (path) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const out: { outer: number | null; ambient: readonly number[] }[] = [];
      for (const t of path) {
        h.walkTo(t.x, t.y);
        await new Promise((r) => requestAnimationFrame(r));
        const l = g.ui().lighting;
        out.push({ outer: l.outer, ambient: l.ambient });
      }
      return out;
    }, alongRoad(41, 57));
    expect(steps.filter((s) => s.outer === 3).length).toBeGreaterThan(8);
    for (let i = 1; i < steps.length; i++) {
      const x = steps[i - 1]?.ambient ?? [];
      const y = steps[i]?.ambient ?? [];
      for (const c of [0, 1, 2]) expect(Math.abs((x[c] ?? 0) - (y[c] ?? 0))).toBeLessThanOrEqual(12);
    }
  }
  expect(seen.map((s) => s.ring)).toEqual([2, 3, 4, 5]);
  for (let i = 1; i < seen.length; i++) expect(seen[i]?.ground ?? 0, order.join(' > ')).toBeLessThan(seen[i - 1]?.ground ?? 0);
});

test('enemies and the HUD stay bright in the Stormcrown: an enemy’s body at least 90% as bright as in Region 1, the HUD the same', async ({ page }) => {
  test.setTimeout(420_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const seen: { body: number; hud: number[][] }[] = [];
  for (const region of ['region1', 'stormcrown'] as const) {
    await toRegion(page, region);
    await page.evaluate(() => window.__GAME__?.setPlayerHealth(100));
    seen.push({ body: await enemyBody(page), hud: await hudPixels(page) });
  }
  const [r1, storm] = seen;
  expect(storm?.body ?? 0).toBeGreaterThanOrEqual(0.9 * (r1?.body ?? 0));
  const a = r1?.hud ?? [];
  const b = storm?.hud ?? [];
  expect(a.length).toBeGreaterThan(0);
  const diff = a.reduce((s, p, i) => s + Math.abs((p[0] ?? 0) - (b[i]?.[0] ?? 0)) + Math.abs((p[1] ?? 0) - (b[i]?.[1] ?? 0)) + Math.abs((p[2] ?? 0) - (b[i]?.[2] ?? 0)), 0) / a.length;
  expect(diff).toBeLessThan(3);
});

test('a telegraph reads as red in the Stormcrown as in Region 1', async ({ page }) => {
  test.setTimeout(240_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / 640;
  const redness: number[] = [];
  for (const region of ['region1', 'stormcrown'] as const) {
    await toRegion(page, region);
    const [id] = await spawnPack(page, ['husk'], 26);
    if (id === undefined) throw new Error('no husk');
    await stepUntil(page, id, 'windup', 12);
    await drawn(page);
    const px = await pixels(page, await page.screenshot(), { x: Math.round(size.width / 2 - 10 * k), y: Math.round(size.height / 2 - 60 * k), w: Math.round(90 * k), h: Math.round(100 * k) });
    // The reddest tenth of the box: the telegraph's own red, however dark the ground under it.
    const reds = px.map((p) => (p[0] ?? 0) - Math.max(p[1] ?? 0, p[2] ?? 0)).sort((x, y) => y - x);
    redness.push(reds.slice(0, Math.ceil(reds.length / 10)).reduce((s, v) => s + v, 0) / Math.ceil(reds.length / 10));
    await page.evaluate((e) => {
      window.__GAME__?.setEnemyHealth(e, 0);
      window.__GAME__?.step(1);
    }, id);
  }
  expect(redness[0] ?? 0).toBeGreaterThan(25);
  expect(redness[1] ?? 0).toBeGreaterThanOrEqual(0.85 * (redness[0] ?? 0));
});

test('lightning striking a rod lights it and flashes the Stormcrown’s ambient, and with Flashes off does neither', async ({ page }) => {
  test.setTimeout(240_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const rods = landmarkDef('rod-field');
  await page.evaluate((t) => window.__helpers?.walkTo((t.tx + 0.5) * 32, (t.ty + 0.5) * 32), { tx: rods.area.x0 + 3, ty: rods.area.y0 + 7 });
  await bannersGone(page);
  await cameraSettled(page, 20_000);
  /** Steps until a rod in view is struck, then draws: the lighting that frame. */
  const strike = () =>
    page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 3000; t++) {
        g.setPlayerHealth(100);
        const s = g.step(1);
        const cam = g.ui().camera;
        if (s.events.rodStrikes.some((r) => Math.abs(r.x - cam.x) < 300 && Math.abs(r.y - cam.y) < 160)) {
          await new Promise((r) => requestAnimationFrame(r));
          return g.ui().lighting;
        }
      }
      return null;
    });
  const on = await strike();
  expect(on?.flash ?? 0).toBeGreaterThan(0);
  expect(on?.lights.rodStrike ?? 0).toBeGreaterThan(0);
  expect(on?.placed.find((l) => l.source === 'rodStrike')).toMatchObject({ color: 'storm-pale', radius: 112 });
  await setLook(page, { flashes: false });
  const off = await strike();
  expect(off).not.toBeNull();
  expect(off?.flash).toBe(0);
  expect(off?.lights.rodStrike ?? 0).toBe(0);
  await setLook(page, { flashes: true });
});
