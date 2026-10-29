import { expect, test, type Page } from '@playwright/test';
import { ENEMY_MOTION } from '../../src/data/art/enemyMotion';
import { enemyDef, meleeDef } from '../../src/data/enemies';
import { SHAKE_ON } from '../../src/data/juice';
import { boot, cameraSettled, watchErrors } from './helpers';

// 076: wind-ups walk gather → coil → peak through the sim's real wind-up and the attack lands on the same tick;
// the peak trembles (the sprite's own, never the camera); a punch staggers a ring 1 Husk and one arrow flinches it;
// the hit flash is unchanged; the same seed and commands give the same state on Low and High.

const HUSK = meleeDef('husk');

/** Steps one tick and lets it draw, then reads that enemy's art and mode. */
async function tickArt(page: Page, id: number, command: Record<string, unknown> = {}) {
  return page.evaluate(
    async ([eid, c]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const s = g.step(1, c);
      g.setPlayerHealth(100);
      const tick = s.tick;
      for (let i = 0; i < 6 && (g.ui().drawnTick ?? -1) < tick; i++) await new Promise((r) => requestAnimationFrame(r));
      const e = s.enemies.find((x) => x.id === eid);
      const art = g.ui().enemyArt.find((a) => a.id === eid);
      return { mode: e?.mode ?? '', modeTicks: e?.modeTicks ?? 0, flash: e?.flash ?? 0, art, camera: g.ui().camera, shakes: g.ui().shakes.length };
    },
    [id, command] as const,
  );
}

/** Puts an enemy `dx` px right of the player in the field and returns its id. */
async function spawnBeside(page: Page, enemyId: string, dx: number): Promise<number> {
  return page.evaluate(
    ([id, x]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy(id, p.x + x, p.y);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    },
    [enemyId, dx] as const,
  );
}

/** The field start with its pack gone, the camera at rest. */
async function quietField(page: Page, query = '?start=field'): Promise<void> {
  await boot(page, query);
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    g.step(120);
  });
  await cameraSettled(page, 20_000);
}

test("a Husk's wind-up walks gather, coil and peak, its swipe landing on the baseline tick, its peak trembling and the camera still", async ({ page }) => {
  const errors = watchErrors(page);
  await quietField(page);
  const id = await spawnBeside(page, 'husk', 24);
  let r = await tickArt(page, id);
  for (let t = 0; t < 300 && r.mode !== 'windup'; t++) r = await tickArt(page, id);
  expect(r.mode).toBe('windup');
  const phases: string[] = [r.art?.phase ?? ''];
  const shifts: number[] = [r.art?.dx ?? 0];
  const camera = r.camera;
  let ticks = 1;
  while (r.mode === 'windup') {
    r = await tickArt(page, id);
    if (r.mode !== 'windup') break;
    ticks += 1;
    phases.push(r.art?.phase ?? '');
    shifts.push(Math.abs(r.art?.dx ?? 0));
    expect(r.camera).toEqual(camera);
  }
  // The swipe starts on the tick after the 36th wind-up tick, as on main.
  expect(ticks).toBe(HUSK.swipe.windupTicks);
  expect(r.mode).toBe('swipe');
  expect(r.art?.pose).toBe('swipe');
  // Its first frame stretches.
  expect(r.art?.squash ?? 0).toBeLessThan(0);
  const order = phases.filter((p, i) => p !== phases[i - 1]);
  expect(order).toEqual(['gather', 'coil', 'peak']);
  expect(phases.filter((p) => p === 'peak').length).toBeGreaterThanOrEqual(ENEMY_MOTION.phases.minPeakTicks);
  // Only the peak trembles.
  const peakAt = phases.indexOf('peak');
  expect(Math.max(...shifts.slice(0, peakAt))).toBe(0);
  expect(Math.max(...shifts.slice(peakAt))).toBeGreaterThan(0.2);
  expect(SHAKE_ON).toBe(false);
  expect(errors).toEqual([]);
});

test('one arrow flinches a ring 1 Husk, its hit flash as before', async ({ page }) => {
  await quietField(page);
  const id = await spawnBeside(page, 'husk', 90);
  expect(enemyDef('husk').maxHealth).toBe(40);
  // The flinch: one arrow, a small hit, and the white flash as before.
  const fired = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120; t++) {
      const e = g.getState().enemies.find((x) => x.id === eid);
      if (!e) break;
      const s = g.step(1, { use: true, aimX: e.x, aimY: e.y - 10 });
      if (s.events.hits.some((h) => h.target === 'enemy' && h.id === eid)) return s.enemies.find((x) => x.id === eid)?.flash ?? 0;
    }
    return -1;
  }, id);
  expect(fired).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate((eid) => window.__GAME__?.ui().enemyArt.find((a) => a.id === eid)?.reaction ?? null, id)).toBe('flinch');
  const art = await page.evaluate((eid) => window.__GAME__?.ui().enemyArt.find((a) => a.id === eid), id);
  expect(art?.pose).toBe('hit');
});

test('a punch on a ring 1 Husk staggers it, reel then recover, and a wind-up cuts it off', async ({ page }) => {
  await quietField(page, '?start=tutorial');
  const id = await spawnBeside(page, 'husk', 18);
  // Punched as it recovers from a swipe (a reaction shows over recovery; the wind-up always wins).
  const punched = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 400; t++) {
      const e = g.getState().enemies.find((x) => x.id === eid);
      if (!e) throw new Error('no Husk');
      const p = g.getState().player;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (e.mode === 'recover' && d < 22) return g.step(1, { fire: true, aimX: e.x, aimY: e.y }).events.melees[0]?.hits ?? [];
      // Swiped back, it steps in again while the Husk recovers.
      g.step(1, e.mode === 'recover' ? { moveX: Math.sign(e.x - p.x) as -1 | 0 | 1, moveY: Math.sign(e.y - p.y) as -1 | 0 | 1 } : {});
      g.setPlayerHealth(100);
    }
    return [];
  }, id);
  expect(punched).toContain(id);
  // The sim holds still while the stagger plays out, slowed five times on the tween clock so every frame is seen.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.2));
  const seen: string[] = [];
  for (let i = 0; i < 200 && !seen.includes('stagger:1'); i++) {
    const a = await page.evaluate(async (eid) => {
      await new Promise((r) => requestAnimationFrame(r));
      return window.__GAME__?.ui().enemyArt.find((x) => x.id === eid);
    }, id);
    seen.push(a?.reaction === 'stagger' ? `stagger:${a.frame.split('/')[1] ?? ''}` : (a?.reaction ?? '-'));
  }
  expect(seen).toContain('stagger:0');
  expect(seen).toContain('stagger:1');
  expect(seen.indexOf('stagger:1')).toBeGreaterThan(seen.indexOf('stagger:0'));
  // Still reeling, it's stepped into its next wind-up: the wind-up shows at once, the stagger cut off.
  const cut = await page.evaluate(async (eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120 && g.getState().enemies.find((x) => x.id === eid)?.mode !== 'windup'; t++) {
      g.step(1);
      g.setPlayerHealth(100);
    }
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const art = g.ui().enemyArt.find((x) => x.id === eid);
    return { mode: g.getState().enemies.find((x) => x.id === eid)?.mode, reaction: art?.reaction ?? null, pose: art?.pose };
  }, id);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  expect(cut).toMatchObject({ mode: 'windup', reaction: null, pose: 'windup' });
});

test('the same seed and commands give the same state on Low and High', async ({ page }) => {
  const run = async (quality: 'low' | 'high') => {
    await boot(page, '?start=hollows&seed=5&clock=held');
    await page.evaluate((q) => window.__GAME__?.setLook({ quality: q }), quality);
    return page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      for (let t = 0; t < 240; t++) {
        const near = s.enemies.filter((e) => e.room === s.room).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
        s = g.step(1, near ? { use: true, aimX: near.x, aimY: near.y, moveX: t % 80 < 40 ? 1 : -1 } : {});
        if (t % 20 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
      return JSON.stringify(g.getState());
    });
  };
  expect(await run('low')).toBe(await run('high'));
});
