import { expect, test } from '@playwright/test';
import { LEY_FLOW, RIPPLES, SWAY } from '../../src/data/ambient';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { setPieceAnchor, setPieceDef } from '../../src/data/setPieces';
import { WORLD } from '../../src/sim/world';
import { boot, watchErrors } from './helpers';
import { frames, lighting, openWorld, setLook, toRegion } from './lightingPage';
import { SET_PIECE_LIGHTS } from '../../src/data/lights';
import { hoverWorld, sample, toSetPiece, walkToAny, world } from './worldLifePage';

// 077: the world's detail and motion in the game: each region's plants, scatter and ruin variants per built chunk;
// the set pieces where they stand, named on hover, the player's silhouette behind one; sway on Medium (angles
// changing) and none on Low; ripples on ponds and beads along ley lines within their caps; the sway's per-frame
// bounds walking across chunk lines; and the same game on Low, High and with the world off.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');

test('each region shows its plants, ruin variants and set pieces in its built chunks', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = watchErrors(page);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  for (const region of ['region1', 'hollows', 'emberworks', 'stormcrown'] as const) {
    await toRegion(page, region);
    const w = await world(page);
    const shown = w.chunks.filter((c) => c.shown);
    expect(shown.length, region).toBeGreaterThan(0);
    expect(shown.reduce((n, c) => n + c.plants, 0), `${region} plants`).toBeGreaterThan(0);
    expect(w.chunks.reduce((n, c) => n + c.variants, 0), `${region} variants`).toBeGreaterThan(0);
    for (const c of w.chunks) expect(c.plants).toBeLessThanOrEqual(80);
    if (region === 'hollows') expect(w.chunks.reduce((n, c) => n + c.vines, 0)).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('the set pieces stand at their places, are named on hover, and the player shows as a silhouette behind one', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = watchErrors(page);
  await openWorld(page);
  await setLook(page, { quality: 'medium' });
  for (const id of ['ley-tower', 'unfinished-giant', 'great-furnace', 'storm-tower']) {
    const a = await toSetPiece(page, id);
    const p = setPieceDef(id);
    expect((await world(page)).setPiecesInView).toContain(id);
    await hoverWorld(page, a.x, a.y - Math.min(p.look.h / 2, 60));
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hoverName ?? null)).toBe(p.name);
    expect(await page.evaluate(() => window.__GAME__?.ui().hoverDescription ?? null)).toBeNull();
    // Its light (the Ley Tower's crystal, the Furnace's mouth) on High and Medium, at the place its art gives; none on Low.
    const l = SET_PIECE_LIGHTS[id];
    if (l && p.lightAt) {
      const at = { x: a.x + p.lightAt[0], y: a.y + p.lightAt[1] };
      for (const q of ['high', 'medium'] as const) {
        await setLook(page, { quality: q });
        const placed = (await lighting(page)).placed.find((x) => Math.abs(x.x - at.x) < 1 && Math.abs(x.y - at.y) < 1);
        expect(placed, `${id} ${q}`).toMatchObject({ source: l.source, color: l.color, radius: l.radius });
      }
      await setLook(page, { quality: 'low' });
      expect((await lighting(page)).placed).toEqual([]);
      await setLook(page, { quality: 'medium' });
    }
  }
  // Behind the Storm Tower (north of its footprint, on open ground): it hides the player, who shows through it.
  const tower = setPieceDef('storm-tower');
  const a = setPieceAnchor(tower, 32);
  await walkToAny(page, [{ x: a.x, y: (tower.footprint.ty - 0.3) * 32 }]);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().silhouette ?? false)).toBe(true);
  expect(errors).toEqual([]);
});

test('sway: on Medium plants and trees turn (angles change frame to frame), on Low none do', async ({ page }) => {
  test.setTimeout(240_000);
  await openWorld(page);
  await toRegion(page, 'region1');
  await setLook(page, { quality: 'medium' });
  const seen = await sample(page, 12);
  for (const s of seen) {
    expect(s.world.swayUpdated).toBeGreaterThan(0);
    expect(s.world.swayUpdated).toBeLessThanOrEqual(SWAY.perFrame.medium);
  }
  const first = seen[0]?.world.swaySample ?? [];
  const last = seen[seen.length - 1]?.world.swaySample ?? [];
  expect(first.length).toBeGreaterThan(0);
  expect(last).not.toEqual(first);
  await setLook(page, { quality: 'low' });
  for (const s of await sample(page, 6)) {
    expect(s.world.swayUpdated).toBe(0);
    expect(s.world.swaySample).toEqual([]);
  }
});

test('ponds ripple and ley beads run on Medium and High within their caps, and neither on Low', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page, '?start=field');
  // The pond nearest the start, from below its sandy rim.
  const pond = [...(room.terrain?.ponds ?? [])].sort((p, q) => Math.hypot(p.cx - 146, p.cy - 150) - Math.hypot(q.cx - 146, q.cy - 150))[0];
  if (!pond) throw new Error('no pond');
  await walkToAny(page, [
    { x: (pond.cx + 0.5) * 32, y: (pond.cy + pond.ry * 1.6 + 1) * 32 },
    { x: (pond.cx + pond.rx * 1.6 + 1) * 32, y: (pond.cy + 0.5) * 32 },
    { x: (pond.cx - pond.rx * 1.6 - 1) * 32, y: (pond.cy + 0.5) * 32 },
  ]);
  for (const q of ['medium', 'high'] as const) {
    await setLook(page, { quality: q });
    await expect.poll(async () => (await world(page)).ripples, { timeout: 30_000 }).toBeGreaterThan(0);
    for (const s of await sample(page, 30)) expect(s.world.ripples).toBeLessThanOrEqual(RIPPLES.max[q]);
  }
  expect((await world(page)).glints).toBeGreaterThan(0);
  await setLook(page, { quality: 'low' });
  for (const s of await sample(page, 5)) expect([s.world.ripples, s.world.beads, s.world.glints]).toEqual([0, 0, 0]);
  // Beads along the shrine's line home.
  const line = OVERWORLD.leyLines.shrine;
  const mid = line[Math.floor(line.length / 2)] ?? { tx: 0, ty: 0 };
  await walkToAny(page, [-1, 1, -2, 2, -3, 3].map((d) => ({ x: (mid.tx + 0.5 + d) * 32, y: (mid.ty + 1.5) * 32 })));
  for (const q of ['medium', 'high'] as const) {
    await setLook(page, { quality: q });
    const seen = await sample(page, 10);
    expect(Math.max(...seen.map((s) => s.world.beads))).toBeGreaterThan(0);
    for (const s of seen) expect(s.world.beads).toBeLessThanOrEqual(LEY_FLOW.max[q]);
  }
});

test('walking across chunk lines, the sway looks at no more than the 4 chunks in view and turns no more than its cap', async ({ page }) => {
  test.setTimeout(300_000);
  await openWorld(page);
  await toRegion(page, 'region1');
  await setLook(page, { quality: 'high' });
  const start = await page.evaluate(() => window.__GAME__?.getState().player ?? { x: 0, y: 0 });
  // A walk 700 px east and back: across at least one chunk line (chunks are 640 px).
  const seen = await page.evaluate(async (p) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const out: { chunks: number; updated: number }[] = [];
    for (let dx = 0; dx <= 700; dx += 20) {
      try {
        h.walkTo(p.x + dx, p.y);
      } catch {
        continue;
      }
      await new Promise((r) => requestAnimationFrame(r));
      const w = g.ui().world;
      out.push({ chunks: w.swayChunks.length, updated: w.swayUpdated });
    }
    return out;
  }, start);
  expect(seen.length).toBeGreaterThan(10);
  for (const s of seen) {
    expect(s.chunks).toBeLessThanOrEqual(4);
    expect(s.updated).toBeLessThanOrEqual(SWAY.perFrame.high);
  }
});

test('the same seed and commands give the same game on Low, on High and with the world off', async ({ browser }) => {
  test.setTimeout(180_000);
  const run = async (quality: 'low' | 'high', query = '') => {
    const page = await browser.newPage();
    await boot(page, `?start=field&seed=7707${query}`);
    await setLook(page, { quality });
    const state = await page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      // The real-time loop ran the sim while the page booted: take the clock, then start the commands at one fixed tick.
      const at = g.step(0).tick;
      if (at > 900) throw new Error(`booted too slowly: tick ${at}`);
      g.step(900 - at);
      for (let t = 0; t < 240; t++) {
        g.step(1, { moveX: t < 120 ? 1 : -1, moveY: t % 60 < 30 ? 1 : 0, fire: t % 20 < 10, aimX: 3000, aimY: 3000 });
        if (t % 8 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
      return JSON.stringify(g.getState());
    });
    await page.close();
    return state;
  };
  const low = await run('low');
  expect(await run('high')).toEqual(low);
  expect(await run('high', '&world=off')).toEqual(low);
});

test('with the world off, plants, sway, ripples, beads and weather are skipped and set pieces keep their still frames', async ({ page }) => {
  test.setTimeout(240_000);
  await openWorld(page);
  await toRegion(page, 'region1');
  await setLook(page, { quality: 'high' });
  await page.evaluate(() => window.__GAME__?.worldLifeOff(true));
  await frames(page, 3);
  const [s] = await sample(page, 1);
  expect(s?.world.off).toBe(true);
  expect(s?.world.swayUpdated).toBe(0);
  expect(s?.world.chunks.every((c) => !c.shown)).toBe(true);
  expect(s?.weather.live).toBe(0);
  await page.evaluate(() => window.__GAME__?.worldLifeOff(false));
  await expect.poll(async () => (await world(page)).chunks.some((c) => c.shown)).toBe(true);
});
