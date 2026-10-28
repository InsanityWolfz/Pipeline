import { expect, test, type Page } from '@playwright/test';
import { FOUNDRY_FX_CAP, LEY_PULSE, QUENCH, SPARKS } from '../../src/data/foundryFx';
import { PARTICLE_BUDGET } from '../../src/data/juice';
import { LIGHT_BUDGET } from '../../src/data/lights';
import type { Quality } from '../../src/data/settings';
import type { FoundryMoodShown } from '../../src/render/foundry/FoundryMood';
import { allWorking, forgeLine, runFrames } from './foundryMoodPage';
import { frames, lighting, setLook } from './lightingPage';
import { watchErrors } from './helpers';

// 079: the foundry's mood and lights on each tier, heat following each forge's status and the screen, sparks and the
// quench on each craft, the particle caps with twelve forges, ley pulses, bounded work, and the sim untouched.

const TIERS: readonly Quality[] = ['low', 'medium', 'high'];

/** Stands the player at a tile's middle, then lets the camera come to rest (it may stop at the room's edge) over drawn frames. */
async function standAt(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(([x, y]) => window.__helpers?.walkTo((x + 0.5) * 32, (y + 0.5) * 32), [tx, ty] as const);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(40));
  let last = { x: NaN, y: NaN };
  await expect.poll(async () => {
    const u = await page.evaluate(async () => {
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r));
      return window.__GAME__?.ui();
    });
    const still = u !== undefined && u.lighting.mood === 'foundry' && !u.camera.fading && Math.hypot(u.camera.x - last.x, u.camera.y - last.y) < 0.5;
    last = { x: u?.camera.x ?? NaN, y: u?.camera.y ?? NaN };
    return still;
  }, { timeout: 60_000 }).toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await frames(page, 10);
}

const statusOf = (page: Page, id: number): Promise<string> =>
  page.evaluate((pid) => {
    const p = window.__GAME__?.getState().foundry.pieces.find((x) => x.id === pid);
    return p?.kind === 'machine' ? p.status : 'gone';
  }, id);

test('the foundry’s mood and lights on each tier', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const ids = await forgeLine(page, { layout: 'showcase' });
  // Where the view takes in every wall light's pool (the room is 768 × 512 px, the view 640 × 360).
  await standAt(page, 11.5, 6.5);
  await allWorking(page, ids.forges);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    const seen = await runFrames(page, 20, 2);
    const l = await lighting(page);
    expect(l.mood).toBe('foundry');
    expect(l.ambient).toEqual([247, 203, 155]);
    expect(l.wash).toBeCloseTo(0.05, 5);
    expect(l.fog).toBe(0);
    expect(l.tint).toBe(0xf7cb9b);
    if (q === 'low') {
      expect(l.placed.length, q).toBe(0);
      expect(l.lit, q).toBe(0);
      continue;
    }
    // The room's two braziers, four torches and the intake (priority 2) never give way to a machine's light.
    expect(l.lights.wall, q).toBe(6);
    expect(l.lights.intake, q).toBe(1);
    expect(l.placed.length, q).toBeLessThanOrEqual(LIGHT_BUDGET[q]);
    const forges = l.placed.filter((p) => p.source === 'forge');
    if (q === 'high') {
      expect(forges.length).toBeGreaterThanOrEqual(2);
      expect(forges.every((f) => f.color === 'cinder' || f.color === 'storm-glow')).toBe(true);
      expect(l.lit).toBeGreaterThan(0);
    } else expect(l.pools).toBe(l.placed.length);
    expect(seen.every((m) => m.shown && !m.off)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('heat follows each forge’s status and the screen; the coil gets light and sparks, no heat', async ({ page }) => {
  test.setTimeout(240_000);
  const ids = await forgeLine(page, { layout: 'showcase' });
  const [smelter, kiln] = ids.forges as [number, number];
  await standAt(page, 12, 8);
  await allWorking(page, [smelter, kiln, ids.coil]);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    const m = (await runFrames(page, 4, 2)).at(-1) as FoundryMoodShown;
    const fx = (id: number) => m.effects.find((e) => e.id === id);
    for (const id of [smelter, kiln]) {
      expect(fx(id), `${q} ${id}`).toMatchObject({ glow: true, steam: true, shimmer: q !== 'low' });
    }
    // The coil charges with lightning: no glow, shimmer or steam.
    expect(fx(ids.coil)).toMatchObject({ glow: false, shimmer: false, steam: false });
    expect(m.glows.length).toBe(m.effects.filter((e) => e.glow).length);
    expect(m.shimmer.every((s) => s.alpha <= 0.25)).toBe(true);
  }
  // On High the coil's violet light is placed while it works.
  await setLook(page, { quality: 'high' });
  await expect.poll(async () => (await runFrames(page, 2, 2)).length && (await lighting(page)).placed.some((p) => p.source === 'forge' && p.color === 'storm-glow')).toBe(true);
  // Starved: the Smelter runs its hoppers dry; within a frame of the change its heat and light go.
  await expect.poll(async () => {
    await page.evaluate(() => window.__GAME__?.step(30));
    return statusOf(page, smelter);
  }, { timeout: 120_000 }).not.toBe('working');
  const after = (await runFrames(page, 1, 0)).at(-1) as FoundryMoodShown;
  expect(after.running).not.toContain(smelter);
  expect(after.effects.map((e) => e.id)).not.toContain(smelter);
  expect(after.shimmer.map((s) => s.id)).not.toContain(smelter);
  // Off screen (the player up by the north wall, the coil's row out of view): running, but no effects or light.
  await standAt(page, 15, 1);
  const far = (await runFrames(page, 3, 2)).at(-1) as FoundryMoodShown;
  if ((await statusOf(page, ids.coil)) === 'working') {
    expect(far.running).toContain(ids.coil);
    expect(far.onScreen).not.toContain(ids.coil);
  }
  expect(far.effects.map((e) => e.id)).not.toContain(ids.coil);
  expect((await lighting(page)).placed.some((p) => p.color === 'storm-glow')).toBe(false);
});

test('each craft on screen throws its tier’s sparks, and a Smelter’s adds the quench', async ({ page }) => {
  test.setTimeout(240_000);
  const ids = await forgeLine(page, { layout: 'showcase' });
  await standAt(page, 12, 8);
  await allWorking(page, ids.forges);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    const got = await page.evaluate(async ([smelter, sparking]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 200; t++) {
        const before = g.ui().foundryMood;
        const s = g.step(1);
        await new Promise((r) => requestAnimationFrame(r));
        if (!s.events.made.some((m) => m.id === smelter)) continue;
        const now = g.ui().foundryMood;
        const shown = s.events.made.filter((m) => sparking.includes(m.pieceId) && now.onScreen.includes(m.id));
        return { forges: shown.length, smelters: shown.filter((m) => m.pieceId === 'smelter').length, sparks: now.sparks - before.sparks, quenches: now.quenches - before.quenches, thinned: now.thinned - before.thinned };
      }
      return null;
    }, [ids.forges[0] ?? -1, SPARKS.machines] as const);
    expect(got, q).not.toBeNull();
    if (!got || got.thinned > 0) continue;
    // Every forge's craft on screen this frame threw its tier's sparks; each Smelter's also puffed its quench.
    expect(got.sparks, q).toBe(got.forges * SPARKS.count[q]);
    expect(got.quenches, q).toBe(got.smelters);
    expect(QUENCH.count[q]).toBeGreaterThan(0);
  }
});

test('twelve forges on each tier stay within the foundry’s cap and the shared budget', async ({ page }) => {
  test.setTimeout(300_000);
  const ids = await forgeLine(page, { units: 12, coil: true, intake: true });
  await standAt(page, 12, 7);
  await allWorking(page, ids.forges);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    const seen = await runFrames(page, 90, 2);
    const most = Math.max(...seen.map((m) => m.particles.live));
    expect(most, q).toBeLessThanOrEqual(FOUNDRY_FX_CAP[q]);
    expect(Math.max(...seen.map((m) => m.particles.total)), q).toBeLessThanOrEqual(PARTICLE_BUDGET[q]);
    // Busy enough to reach the cap: the budget thins what doesn't fit.
    expect(most, q).toBeGreaterThan(FOUNDRY_FX_CAP[q] * 0.5);
    for (const m of seen) {
      expect(m.visited).toBeLessThanOrEqual(m.onScreen.length);
      expect(m.effects.filter((e) => e.steam).length).toBeLessThanOrEqual({ low: 4, medium: 8, high: 12 }[q]);
    }
  }
});

test('ley pulses run toward the intake as the line feeds it, farthest inlay first', async ({ page }) => {
  test.setTimeout(240_000);
  await forgeLine(page, { layout: 'showcase' });
  await standAt(page, 12, 8);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    // The entrances emptied: the line refills the open one (each item a `refills` event).
    await page.evaluate(() => window.__GAME__?.loadEntrances([null, null, null, null, null]));
    const seen = await runFrames(page, 60, 2);
    const most = Math.max(...seen.map((m) => m.pulses.live));
    expect(most, q).toBe(Math.min(most, LEY_PULSE.live[q]));
    if (q === 'low') {
      expect(most).toBe(0);
      continue;
    }
    expect(most, q).toBeGreaterThan(0);
    // Each pulse lights the inlays in order of distance, farthest (index 0) first.
    const first = new Map<number, Map<number, number>>();
    seen.forEach((m, f) =>
      m.pulses.byPulse.forEach((p) => {
        const at = first.get(p.id) ?? new Map<number, number>();
        first.set(p.id, at);
        for (const i of p.lit) if (!at.has(i)) at.set(i, f);
      }),
    );
    const whole = [...first.values()].filter((at) => at.has(0));
    expect(whole.length, q).toBeGreaterThan(0);
    for (const at of whole) {
      const order = [...at.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(([i]) => i);
      expect(order, q).toEqual([...order].sort((a, b) => a - b));
    }
    expect(seen[0]?.inlays.length).toBe(10);
  }
  // None while the foundry isn't shown: out of the door, the line still feeding.
  await page.evaluate(() => {
    window.__GAME__?.loadEntrances([null, null, null, null, null]);
    window.__helpers?.toHall();
  });
  // Through the door's fade the foundry still shows; once it doesn't, none run.
  await expect.poll(async () => (await runFrames(page, 2, 2)).at(-1)?.shown, { timeout: 60_000 }).toBe(false);
  const away = await runFrames(page, 20, 2);
  expect(away.every((m) => !m.shown && m.pulses.live === 0)).toBe(true);
});

test('bounded work: 60 pieces and no forge working costs the effects nothing', async ({ page }) => {
  test.setTimeout(240_000);
  await forgeLine(page, { units: 0 });
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Conduits over most of the floor, and four idle forges (nothing feeds them).
    let n = 0;
    for (let ty = 2; ty <= 12 && n < 56; ty += 2) for (let tx = 2; tx <= 21 && n < 56; tx++) if (g.step(1, { place: { pieceId: 'conduit', tx, ty, facing: 'right' } }).foundry.pieces.length > n) n += 1;
    for (const [tx, pieceId] of [[3, 'smelter'], [6, 'kiln'], [9, 'smelter'], [12, 'tempering-coil']] as const) g.step(1, { place: { pieceId, tx, ty: 13, facing: 'up' } });
  });
  expect((await page.evaluate(() => window.__GAME__?.getState().foundry.pieces.length)) ?? 0).toBeGreaterThanOrEqual(60);
  await standAt(page, 12, 7);
  for (const q of TIERS) {
    await setLook(page, { quality: q });
    const seen = await runFrames(page, 20, 2);
    for (const m of seen) {
      expect(m.visited, q).toBe(0);
      expect(m.running, q).toEqual([]);
      expect(m.particles.steam + m.particles.sparks, q).toBe(0);
    }
  }
});

/** The columns line built from one fixed tick, run 1,800 ticks: its getState(). */
async function runLine(page: Page, look: Quality | 'off'): Promise<string> {
  // The mouse stays where the page last left it across reloads, and the sim aims at it: hold it, and aim, the same each run.
  await page.mouse.move(640, 360);
  await forgeLine(page, { units: 4, per: 30, intake: true, start: 900 });
  await page.evaluate((l) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.lightingOff(l === 'off');
    g.setLook({ quality: l === 'off' ? 'medium' : l });
  }, look);
  return page.evaluate(async () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < 1800; i += 6) {
      g.step(6, { aimX: 0, aimY: 0 });
      await new Promise((r) => requestAnimationFrame(r));
    }
    return JSON.stringify(g.getState());
  });
}

test('the sim is untouched: the same getState() on Low, High and with the mood off, a forge line running 1,800 ticks', async ({ page }) => {
  test.setTimeout(600_000);
  const low = await runLine(page, 'low');
  const high = await runLine(page, 'high');
  const off = await runLine(page, 'off');
  expect(low.length).toBeGreaterThan(1000);
  expect(high).toBe(low);
  expect(off).toBe(low);
});
