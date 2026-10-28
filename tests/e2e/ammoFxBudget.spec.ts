import { expect, test, type Page } from '@playwright/test';
import { DEATH_MOTES, PARTICLE_BUDGET, PARTICLE_SHARES } from '../../src/data/juice';
import { WEATHER_CAP } from '../../src/data/weather';
import { watchErrors } from './helpers';
import { intoForum, stepUntil } from './hollowsSandbox';
import { drawn, openWorld, pixels, setLook, spawnPack, toRegion } from './lightingPage';
import { fxSandbox } from './ammoFxPage';

// 078: one particle budget under load. In the Hollows dust (077's weather), a five-entrance volley of bombs and arrows
// into a pack and ten of it killed at once, on each tier: effects within their share, deaths and weather within their
// caps, everything within the budget, every frame. A Bulwark's pound in a full volley still throws its dust (a cue).
// After a second's warm-up a ten-second High fight makes no new particle, trail slot or mark. And a volley over a
// Husk's swipe telegraph leaves its reddest pixels at least 85% as red as without it (074.11's method).

const PACK = ['charger', 'shardback', 'burrower', 'sniper', 'charger', 'shardback', 'burrower', 'sniper', 'charger', 'shardback'];
const VOLLEY = ['bomb', 'arrow', 'bomb', 'arrow', 'bomb'];

interface Frame {
  effects: number;
  deaths: number;
  weather: number;
  live: number;
  soft: number;
  shot: number;
  cue: number;
}

/** Fires the volley from the entrances (the carried bar on its empty slot) at `aim` for `ticks`, a tick a frame; `kill` kills `ids` on that frame. */
function volley(page: Page, aim: readonly [number, number], ticks: number, kill: number[] = [], killAt = -1): Promise<Frame[]> {
  return page.evaluate(
    async ([a, n, ids, at]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const out: Frame[] = [];
      for (let i = 0; i < n; i++) {
        if (i === at) for (const id of ids) g.setEnemyHealth(id, 0);
        g.setPlayerHealth(100);
        g.step(1, { fire: true, aimX: p.x + a[0], aimY: p.y + a[1] });
        await new Promise((r) => requestAnimationFrame(r));
        const pt = g.ui().particles;
        out.push({ effects: pt.effects, deaths: pt.deathMotes, weather: pt.weather, live: pt.live, soft: pt.byPriority.soft, shot: pt.byPriority.shot, cue: pt.byPriority.cue });
      }
      return out;
    },
    [aim, ticks, kill, killAt] as const,
  );
}

test('a five-entrance volley into a Hollows pack in the dust, ten killed at once: every kind within its share and the budget, every frame, on each tier', async ({ page }, info) => {
  test.setTimeout(600_000);
  const errors = watchErrors(page);
  await openWorld(page);
  await toRegion(page, 'hollows');
  await page.evaluate((v) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.loadEntrances(v);
    // The carried bar's empty slot: the tube fires the entrances' volley.
    g.step(1, { selectSlot: 4 });
  }, VOLLEY);
  const most: Record<string, Frame> = {};
  for (const q of ['low', 'medium', 'high'] as const) {
    await setLook(page, { quality: q });
    const ids = await spawnPack(page, PACK, 110);
    const frames = await volley(page, [110, 0], 150, ids, 60);
    const share = PARTICLE_SHARES[q];
    for (const f of frames) {
      expect(f.effects, q).toBeLessThanOrEqual(share.effect);
      expect(f.deaths, q).toBeLessThanOrEqual(DEATH_MOTES.liveCap[q]);
      expect(f.weather, q).toBeLessThanOrEqual(WEATHER_CAP[q]);
      expect(f.effects + f.deaths + f.weather, q).toBeLessThanOrEqual(PARTICLE_BUDGET[q]);
      expect(f.soft, q).toBeLessThanOrEqual(Math.floor(share.effect * 0.5));
    }
    most[q] = Object.fromEntries((['effects', 'deaths', 'weather', 'live', 'soft', 'shot', 'cue'] as const).map((k) => [k, Math.max(...frames.map((f) => f[k]))])) as unknown as Frame;
    // The volley did throw effects and the deaths their motes.
    expect(most[q]?.effects ?? 0, q).toBeGreaterThan(0);
    expect(most[q]?.deaths ?? 0, q).toBeGreaterThan(0);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.room === g.getState().room && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(120);
    });
  }
  console.log('most', JSON.stringify(most));
  await info.attach('budget.json', { body: JSON.stringify(most, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('a Bulwark’s pound during a full volley still throws its dust', async ({ page }) => {
  test.setTimeout(300_000);
  await intoForum(page);
  const seen = await page.evaluate(async (v) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setLook({ quality: 'low' });
    g.loadEntrances(v);
    g.step(1, { selectSlot: 4 });
    const boss = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!boss) throw new Error('no Bulwark');
    let poundFrames = 0;
    let cueAtPound = 0;
    let effectsAtPound = 0;
    for (let i = 0; i < 2400 && poundFrames < 3; i++) {
      const b = g.getState().enemies.find((e) => e.id === boss.id);
      if (!b) break;
      g.setEnemyHealth(boss.id, 9999);
      g.setPlayerHealth(100);
      const s = g.step(1, { fire: true, aimX: b.x, aimY: b.y });
      await new Promise((r) => requestAnimationFrame(r));
      if (s.events.pounds.length > 0 || s.events.stomps.length > 0) {
        poundFrames += 1;
        const pt = g.ui().particles;
        cueAtPound = Math.max(cueAtPound, pt.byPriority.cue);
        effectsAtPound = Math.max(effectsAtPound, pt.effects);
      }
    }
    return { poundFrames, cueAtPound, effectsAtPound };
  }, ['arrow', 'ley-bolt', 'arrow', 'ley-bolt', 'arrow']);
  console.log('pound', JSON.stringify(seen));
  expect(seen.poundFrames).toBeGreaterThan(0);
  // Its dust flew in the volley (Low's effect share is 50; shots stop at 42, cues use the rest).
  expect(seen.cueAtPound).toBeGreaterThan(0);
});

test('after a second’s warm-up, ten seconds of a five-entrance High fight make no new particle, trail slot or mark', async ({ page }) => {
  test.setTimeout(600_000);
  await fxSandbox(page, ['bomb+cluster', 'arrow+fire', 'ley-bolt+split', 'landmine+frost', 'ley-bolt+homing'], [['husk', 90, 0], ['husk', 100, 40], ['husk', 100, -40]], { quality: 'high' });
  const made = () =>
    page.evaluate(() => {
      const u = window.__GAME__?.ui();
      return { particles: u?.particles.pool.created ?? -1, slots: u?.ammoFx.slots.created ?? -1, marks: u?.ammoFx.marks.made ?? -1 };
    });
  const keepUp = (ticks: number) =>
    page.evaluate(async (n) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      for (let i = 0; i < n; i++) {
        for (const e of g.getState().enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 300) g.setEnemyHealth(e.id, 500);
        g.step(1, { fire: true, aimX: p.x + 90, aimY: p.y + ((i % 3) - 1) * 30 });
        await new Promise((r) => requestAnimationFrame(r));
      }
    }, ticks);
  await keepUp(60);
  const warm = await made();
  await keepUp(600);
  const after = await made();
  console.log('pool', JSON.stringify({ warm, after }));
  expect(after).toEqual(warm);
});

test('a volley of every family over a Husk’s swipe telegraph leaves it at least 85% as red as without one', async ({ page }) => {
  test.setTimeout(300_000);
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / 640;
  const redness: number[] = [];
  let first = true;
  for (const withVolley of [false, true]) {
    const [id] = await fxSandbox(page, withVolley ? ['arrow+fire', 'ley-bolt+lightning', 'bomb+frost', 'landmine', 'ley-bolt+homing'] : [null, null, null, null, null], [['husk', 26, 0]], { quality: 'high' }, first);
    first = false;
    if (id === undefined) throw new Error('no husk');
    const husk: number = id;
    // Firing past the Husk, the rounds crossing its telegraph, until late in its wind-up.
    await page.evaluate(async (hid) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      for (let i = 0; i < 300; i++) {
        const e = g.getState().enemies.find((x) => x.id === hid);
        if (e && e.mode === 'windup' && e.modeTicks >= 24) break;
        g.setEnemyHealth(hid, 500);
        g.setPlayerHealth(100);
        g.step(1, { fire: true, aimX: p.x + 160, aimY: p.y - 28 });
        if (i % 2 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
    }, husk);
    await stepUntil(page, husk, 'windup', 32);
    await drawn(page);
    const px = await pixels(page, await page.screenshot(), { x: Math.round(size.width / 2 - 10 * k), y: Math.round(size.height / 2 - 60 * k), w: Math.round(90 * k), h: Math.round(100 * k) });
    const reds = px.map((p) => (p[0] ?? 0) - Math.max(p[1] ?? 0, p[2] ?? 0)).sort((x, y) => y - x);
    redness.push(reds.slice(0, Math.ceil(reds.length / 10)).reduce((s, v) => s + v, 0) / Math.ceil(reds.length / 10));
    if (withVolley) expect(await page.evaluate(() => window.__GAME__?.ui().ammoFx.played ?? 0)).toBeGreaterThan(0);
    await page.evaluate((e) => {
      window.__GAME__?.setEnemyHealth(e, 0);
      window.__GAME__?.step(1);
    }, husk);
  }
  console.log('redness', JSON.stringify(redness));
  expect(redness[0] ?? 0).toBeGreaterThan(25);
  expect(redness[1] ?? 0).toBeGreaterThanOrEqual(0.85 * (redness[0] ?? 0));
});
