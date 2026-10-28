import { expect, test, type Page } from '@playwright/test';
import { FX_QUALITY } from '../../src/data/fxQuality';
import { HIT_STOP_MS, PARTICLE_SHARES, SHAKE_ON } from '../../src/data/juice';
import { SPLIT } from '../../src/data/tags';
import { MUZZLE_OFFSET } from '../../src/data/tube';
import { WANDERER } from '../../src/data/art/wanderer';
import { TUBE_PARTS } from '../../src/data/art/wandererTube';
import { boot, watchErrors } from './helpers';
import { fire, fxSandbox } from './ammoFxPage';

// 078: every ammo's look in the game (the sandbox, Husks to hit): each family's trail kind, impact and muzzle sparks;
// each element's impact; each tier's glints; homing's curving wake; the Split's star and Shards; a cluster's four mini
// blasts; the sparks from the posed muzzle; Flashes off; hit feedback unchanged; each tier's caps; and the sim the same
// with the effects on and off and on Low and High.

const HUSK: readonly (readonly [string, number, number])[] = [['husk', 90, 0]];

test('each family flies with its own trail kind, lands with its own impact and leaves the muzzle with sparks', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const want = { arrow: ['streak', 'splinter'], 'ley-bolt': ['ribbon', 'ley-splash'], bomb: ['', 'blast'], landmine: ['', ''] } as const;
  let first = true;
  for (const [round, [kind, impact]] of Object.entries(want)) {
    await fxSandbox(page, [round], HUSK, { quality: 'medium' }, first);
    first = false;
    const seen = await fire(page, [90, 0], 70, 1);
    if (kind) expect(seen.kinds, round).toContain(kind);
    if (impact) expect(seen.impacts.map((i) => i.kind), round).toContain(impact);
    expect(seen.muzzleSparks, round).toBeGreaterThan(0);
    // A landmine flies with no ribbon (it tumbles) and throws dust as it arms.
    if (round === 'landmine') {
      expect(seen.kinds).toEqual([]);
      expect(await page.evaluate(() => window.__GAME__?.ui().ammoFx.landings)).toBeGreaterThan(0);
    }
  }
  expect(errors).toEqual([]);
});

test('each element shows in its impacts, and each tier adds its glints', async ({ page }) => {
  test.setTimeout(240_000);
  let first = true;
  for (const round of ['arrow+frost', 'ley-bolt+fire', 'arrow+lightning', 'arrow+steel', 'arrow+stormsteel', 'ley-bolt+glass', 'ley-bolt+storm-glass']) {
    await fxSandbox(page, [round], HUSK, { quality: 'medium' }, first);
    first = false;
    const seen = await fire(page, [90, 0], 50, 1);
    const hit = seen.impacts.find((i) => i.look === round);
    expect(hit, round).toBeDefined();
    const element = round.split('+').find((s) => ['frost', 'fire', 'lightning'].includes(s)) ?? null;
    expect(hit?.element, round).toBe(element);
    if (round.includes('steel') || round.includes('glass')) expect(hit?.glints, round).toBeGreaterThan(0);
    else expect(hit?.glints, round).toBe(0);
    if (element === 'frost') expect(hit?.mark).toBe('rime');
  }
});

test('a homing bolt’s wake curves; a Split shows its star and Shards; a cluster bomb four mini blasts', async ({ page }) => {
  test.setTimeout(240_000);
  // The Husk 50 px off the aim: the bolt locks on and turns, its 44 px wake bending behind it.
  await fxSandbox(page, ['ley-bolt+homing'], [['husk', 110, -45]], { quality: 'medium' });
  const homing = await fire(page, [110, 5], 60, 1);
  expect(homing.bend).toBeGreaterThan(8);
  await fxSandbox(page, ['ley-bolt+split'], [['husk', 70, 0]], { quality: 'medium' }, false);
  const split = await fire(page, [70, 0], 30, 1);
  expect(split.splitFlashes).toBeGreaterThan(0);
  expect(split.shards).toBe(SPLIT.shards);
  expect(split.impacts.map((i) => i.kind)).toContain('ley-splash');
  await fxSandbox(page, ['bomb+cluster'], HUSK, { quality: 'medium' }, false);
  const cluster = await fire(page, [90, 0], 90, 1);
  expect(cluster.impacts.filter((i) => i.kind === 'blast')).toHaveLength(1);
  expect(cluster.impacts.filter((i) => i.kind === 'mini-blast')).toHaveLength(4);
});

test('the sparks and each new trail leave from the tube’s drawn muzzle (just past its drawn tip), not the sim’s spawn point', async ({ page }) => {
  test.setTimeout(180_000);
  expect(MUZZLE_OFFSET).toBe(12);
  await fxSandbox(page, ['arrow', 'arrow', 'arrow', null, null], HUSK, { quality: 'medium' });
  const seen = await fire(page, [90, 30], 20, 16);
  expect(seen.muzzles.length).toBeGreaterThan(0);
  const aim = Math.atan2(30, 90);
  for (const m of seen.muzzles) {
    expect(m.posed).not.toBeNull();
    expect(Math.hypot(m.x - (m.posed?.x ?? 0), m.y - (m.posed?.y ?? 0))).toBeLessThanOrEqual(1);
    // Out toward the aim from the feet and up at the tube's height, so clear of the sim's spawn (MUZZLE_OFFSET down the
    // aim from the feet, which is unchanged).
    expect(m.x - m.feet.x).toBeGreaterThan(6);
    expect(m.feet.y - m.y).toBeGreaterThan(0);
    const spawn = { x: m.feet.x + Math.cos(aim) * MUZZLE_OFFSET, y: m.feet.y + Math.sin(aim) * MUZZLE_OFFSET };
    expect(Math.hypot(m.x - spawn.x, m.y - spawn.y)).toBeGreaterThan(8);
    // Down a lane of the volley, toward the aim (the lanes fan out about it).
    expect(Math.abs(m.angle - aim)).toBeLessThan(0.6);
  }
  // Each new round's trail begins at the drawn muzzle of its frame.
  expect(seen.starts.length).toBeGreaterThan(0);
  for (const st of seen.starts) {
    expect(st.posed).not.toBeNull();
    expect(Math.hypot(st.x - (st.posed?.x ?? 0), st.y - (st.posed?.y ?? 0))).toBeLessThanOrEqual(1);
  }
  // The rig's muzzle mark against the drawn pixels: aimed far off (so the tube lies along the aim from any pivot) and
  // its flash over, the drawn wanderer's furthest edge that way is the muzzle cap's face, and the mark sits on its
  // middle, the cap-to-flash gap (TUBE_PARTS) beyond it, within a px.
  for (const far of [[600, 200], [600, -150], [-600, 120]] as const) {
    const w = await page.evaluate(async ([fx, fy]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      for (let i = 0; i < 12; i++) {
        g.step(1, { aimX: p.x + fx, aimY: p.y + fy });
        await new Promise((r) => requestAnimationFrame(r));
      }
      return g.wanderer(Math.atan2(fy, fx));
    }, far);
    const along = Math.atan2(far[1], far[0]);
    const cap = TUBE_PARTS.muzzle.lit;
    if (cap.kind !== 'rect') throw new Error('the muzzle cap is a rect');
    const gap = (TUBE_PARTS.flash.at[0] - (cap.x + cap.w)) * WANDERER.scale;
    const [tx, ty] = w?.tip ?? [NaN, NaN];
    const [mx, my] = w?.muzzle ?? [NaN, NaN];
    const want = [tx + Math.cos(along) * gap, ty + Math.sin(along) * gap];
    expect(Math.hypot(mx - (want[0] ?? 0), my - (want[1] ?? 0)), `aim ${far.join(',')}: mark ${mx},${my} tip ${tx},${ty}`).toBeLessThanOrEqual(1);
  }
});

test('with Flashes off: no 078 flash, crackle or flicker; particles, trails and marks still show', async ({ page }) => {
  test.setTimeout(180_000);
  await fxSandbox(page, ['arrow+lightning', 'ley-bolt+fire', 'ley-bolt', null, null], HUSK, { quality: 'medium', flashes: false });
  const seen = await fire(page, [90, 0], 50, 1);
  expect(seen.impacts.length).toBeGreaterThan(0);
  expect(seen.impacts.every((i) => !i.flash)).toBe(true);
  expect(seen.impacts.reduce((n, i) => n + i.particles, 0)).toBeGreaterThan(0);
  expect(seen.kinds.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__GAME__?.ui().ammoFx.marks.flashes)).toBe(0);
  await page.evaluate(() => window.__GAME__?.setLook({ flashes: true }));
  const on = await fire(page, [90, 0], 50, 1);
  expect(on.impacts.some((i) => i.flash)).toBe(true);
});

test('hit feedback is unchanged: the sim’s flash, a damage number and the 50 ms hold for each hit, and no shake', async ({ page }) => {
  test.setTimeout(180_000);
  expect(SHAKE_ON).toBe(false);
  expect(HIT_STOP_MS).toBe(50);
  const [id] = await fxSandbox(page, ['arrow'], HUSK, { quality: 'medium' });
  const before = await page.evaluate(() => window.__GAME__?.ui().hitFeedback);
  const flash = await page.evaluate(async (huskId) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    let most = 0;
    for (let i = 0; i < 40; i++) {
      const s = g.step(1, { fire: i === 0, aimX: p.x + 90, aimY: p.y });
      most = Math.max(most, s.enemies.find((e) => e.id === huskId)?.flash ?? 0);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return most;
  }, id);
  const after = await page.evaluate(() => window.__GAME__?.ui());
  expect(flash).toBeGreaterThan(0);
  expect((after?.hitFeedback.numbers ?? 0) - (before?.numbers ?? 0)).toBe(1);
  expect((after?.hitFeedback.holds ?? 0) - (before?.holds ?? 0)).toBe(1);
  expect(after?.hitFeedback.holdMs).toBe(HIT_STOP_MS);
  expect(after?.camera.shaking).toBe(false);
});

test('each tier’s trail cap, mark cap and scale hold, and a tier change applies at once', async ({ page }) => {
  test.setTimeout(240_000);
  let first = true;
  for (const q of ['low', 'medium', 'high'] as const) {
    await fxSandbox(page, ['bomb', 'ley-bolt', 'arrow', 'bomb', 'ley-bolt'], [['husk', 90, 0], ['husk', 100, 30], ['husk', 100, -30]], { quality: q }, first);
    first = false;
    const seen = await fire(page, [90, 0], 80, 40);
    const fx = await page.evaluate(() => window.__GAME__?.ui().ammoFx);
    expect(fx?.trailCap, q).toBe(FX_QUALITY[q].trailCap);
    expect(fx?.marks.cap, q).toBe(FX_QUALITY[q].markCap);
    expect(fx?.marks.live ?? 0, q).toBeLessThanOrEqual(FX_QUALITY[q].markCap);
    expect(seen.impacts.length, q).toBeGreaterThan(0);
    // Low throws no trail bits; Medium and High do.
    const soft = await softSeen(page, q);
    if (q === 'low') expect(soft, q).toBe(0);
    else expect(soft, q).toBeGreaterThan(0);
  }
  // From High to Low mid-fight: the caps drop at once, and the oldest effects past Low's share go on the next frame.
  await fxSandbox(page, ['bomb+cluster', 'bomb+cluster', 'bomb', 'bomb+cluster', 'bomb'], [['husk', 90, 0], ['husk', 100, 30], ['husk', 100, -30]], { quality: 'high' }, false);
  const busy = await page.evaluate(async (lowShare) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    let most = 0;
    for (let i = 0; i < 120 && most <= lowShare; i++) {
      g.step(1, { fire: true, aimX: p.x + 90, aimY: p.y });
      await new Promise((r) => requestAnimationFrame(r));
      most = g.ui().particles.effects;
    }
    return most;
  }, PARTICLE_SHARES.low.effect);
  expect(busy, 'High’s effects past Low’s share before the change').toBeGreaterThan(PARTICLE_SHARES.low.effect);
  await page.evaluate(() => window.__GAME__?.setLook({ quality: 'low' }));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  const low = await page.evaluate(() => window.__GAME__?.ui());
  expect(low?.ammoFx.trailCap).toBe(FX_QUALITY.low.trailCap);
  expect(low?.ammoFx.marks.live ?? 0).toBeLessThanOrEqual(FX_QUALITY.low.markCap);
  expect(low?.particles.effects ?? Infinity).toBeLessThanOrEqual(PARTICLE_SHARES.low.effect);
  expect(low?.particles.deathMotes ?? Infinity).toBeLessThanOrEqual(PARTICLE_SHARES.low.death);
});

test('on Low, every flying round’s trail is drawn; with more rounds flying than the cap, the cap’s worth and no more', async ({ page }) => {
  test.setTimeout(180_000);
  // Arrows into open ground: every round in flight has a trail, its first frame bridged from the muzzle.
  await fxSandbox(page, ['arrow', 'arrow', 'arrow', 'arrow', 'arrow'], [], { quality: 'low' });
  const under = await fire(page, [-300, 0], 60, 50);
  expect(Math.max(...under.trails.map((f) => f.rounds))).toBeGreaterThan(4);
  for (const f of under.trails) {
    expect(f.cap).toBe(FX_QUALITY.low.trailCap);
    expect(f.drawn).toBe(Math.min(f.rounds, f.cap));
  }
  // Low's 24 is more than a sandbox volley flies at once: held at 4, the rounds past it fly with no trail.
  await page.evaluate(() => window.__GAME__?.trailCap(4));
  const over = await fire(page, [-300, 0], 60, 50);
  await page.evaluate(() => window.__GAME__?.trailCap(null));
  const past = over.trails.filter((f) => f.rounds > 4);
  expect(past.length, 'frames with more rounds flying than the cap').toBeGreaterThan(5);
  for (const f of over.trails) expect(f.drawn).toBeLessThanOrEqual(4);
  expect(Math.max(...past.map((f) => f.drawn))).toBe(4);
});

/** Fires ley bolts for a while and returns the most soft (trail bit) particles alive at once. */
function softSeen(page: Page, q: string): Promise<number> {
  return page.evaluate(async (tier) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setLook({ quality: tier as 'low' });
    const p = g.getState().player;
    let most = 0;
    for (let i = 0; i < 40; i++) {
      g.step(1, { fire: true, aimX: p.x - 200, aimY: p.y });
      await new Promise((r) => requestAnimationFrame(r));
      most = Math.max(most, g.ui().particles.byPriority.soft);
    }
    return most;
  }, q);
}

/** The same scripted fight from a fresh sandbox boot; its getState() (events included) every 10 ticks. */
async function script(page: Page, query: string, quality: 'low' | 'medium' | 'high'): Promise<string> {
  await boot(page, query);
  // The real-time loop ran the sim while the page booted: take the clock, then start at one fixed tick (077's method).
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const at = g.step(0).tick;
    if (at > 900) throw new Error(`booted too slowly: tick ${at}`);
    g.step(900 - at);
  });
  await fxSandbox(page, ['arrow+fire', 'bomb+cluster', 'ley-bolt+split', 'landmine', 'ley-bolt+homing'], [['husk', 90, 0], ['husk', 110, 40]], { quality }, false);
  return page.evaluate(async () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    const out: string[] = [];
    for (let i = 0; i < 240; i++) {
      const s = g.step(1, { fire: i < 120, aimX: p.x + 90, aimY: p.y + 10 });
      if (i % 10 === 0) out.push(JSON.stringify(s));
      if (i % 4 === 0) await new Promise((r) => requestAnimationFrame(r));
    }
    return out.join('\n');
  });
}

test('the sim is untouched: the same getState() with the effects on, off (?fx=off), on Low and on High', async ({ page }) => {
  test.setTimeout(360_000);
  const on = await script(page, '?sandbox', 'medium');
  const off = await script(page, '?sandbox&fx=off', 'medium');
  const low = await script(page, '?sandbox', 'low');
  const high = await script(page, '?sandbox', 'high');
  expect(on.length).toBeGreaterThan(1000);
  expect(off).toBe(on);
  expect(low).toBe(on);
  expect(high).toBe(on);
});
