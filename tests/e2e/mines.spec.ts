import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { ui } from './intakePage';

// Landmines and cluster bombs (038), from `?playtest` (99 landmines carried, every
// machine unlocked). Key 4 picks landmines; one is fired onto the open ground, arms there,
// and a Husk set on it stays whole until its arm time runs out and the burst kills it. Then,
// with the shrine claimed, the Cluster die is hand-applied at the bench and a cluster bomb
// fired at a Husk bursts, and its four bomblets burst round it. The review screenshots
// are in minesShots.spec.ts.

test('key 4 picks landmines: one arms where it lands, only its arm time sets it off, and its burst kills a Husk on it', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // Real keys, before the hook takes the clock.
  await page.keyboard.press('4');
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.getState().tube.ammo)).toBe('landmine');
  // The hotbar's fourth cell (key 4) is highlighted.
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.selected).toBe(3);

  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Quiet ground: every enemy gone.
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    let s = g.step(1);
    const at = { x: s.player.x + 120, y: s.player.y };
    s = g.step(1, { fire: true, aimX: at.x, aimY: at.y });
    const carried = s.inventory.landmine ?? 0;
    for (let t = 0; t < 120 && s.mines.length === 0; t++) s = g.step(1);
    const mine = s.mines[0];
    if (!mine) throw new Error('no mine armed');
    // A Husk on the mine with 10 ticks of arm time left: walking onto it sets nothing off.
    s = g.step(mine.armTicks - mine.elapsed - 10);
    const armedLate = s.mines.length;
    s = g.spawnEnemy('husk', mine.x, mine.y);
    const husk = s.enemies[s.enemies.length - 1];
    if (!husk) throw new Error('no husk');
    s = g.step(5);
    const whole = s.enemies.find((e) => e.id === husk.id)?.health;
    let burst = null as null | { x: number; y: number; radius: number };
    for (let t = 0; t < 20 && !burst; t++) {
      s = g.step(1);
      burst = s.events.mineBursts[0] ?? null;
    }
    return { mine, carried, armedLate, whole, burst, alive: s.enemies.some((e) => e.id === husk.id && e.health > 0), health: s.player.health, maxHealth: s.player.maxHealth };
  });
  expect(result.carried).toBe(98);
  expect(result.mine).toMatchObject({ elapsed: expect.any(Number), armTicks: 300, damage: 60, radius: 24 });
  expect(result.armedLate).toBe(1);
  expect(result.whole).toBe(40);
  expect(result.burst).toMatchObject({ x: result.mine.x, y: result.mine.y, radius: 24 });
  expect(result.alive).toBe(false);
  expect(result.health).toBe(result.maxHealth);
  expect(errors).toEqual([]);
});

test('cluster bombs crafted (047: in C) unlock the Cluster die, and their bomblets, whose bomblets burst round the bomb', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const made = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    g.craft('cluster-die-bomb');
    const s = g.step(1);
    return { cluster: s.inventory['bomb+cluster'] ?? 0, unlocked: s.stagesUnlocked };
  });
  expect(made.cluster).toBe(4);
  expect(made.unlocked).toContain('cluster-die');

  const fight = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    let s = g.step(1, { selectAmmo: 'bomb' });
    // A Husk 120 px off, and one 40 px past it, where the far bomblet lands, outside the bomb's own 48 px.
    const p = s.player;
    g.spawnEnemy('husk', p.x + 120, p.y);
    g.spawnEnemy('husk', p.x + 120 + 58, p.y);
    s = g.step(1, { fire: true, aimX: p.x + 120, aimY: p.y });
    const shot = s.events.shots[0]?.ammoId;
    let bursts = 0;
    let bomblets: { x: number; y: number }[] = [];
    let pending = 0;
    let hits: number[] = [];
    for (let t = 0; t < 120 && bomblets.length === 0; t++) {
      s = g.step(1);
      bursts += s.events.bursts.length;
      pending = Math.max(pending, s.bomblets.length);
      if (s.events.bombletBursts.length > 0) {
        bomblets = s.events.bombletBursts;
        hits = s.events.hits.flatMap((x) => (x.target === 'enemy' ? [x.damage] : []));
      }
    }
    return { shot, bursts, pending, bomblets, hits, at: { x: p.x + 120, y: p.y } };
  });
  expect(fight.shot).toBe('bomb+cluster');
  expect(fight.bursts).toBe(1);
  expect(fight.pending).toBe(4);
  expect(fight.bomblets).toHaveLength(4);
  for (const b of fight.bomblets) expect(Math.round(Math.hypot(b.x - fight.at.x, b.y - fight.at.y))).toBe(40);
  // The far Husk, past the bomb's own blast, takes a bomblet's 8.
  expect(fight.hits).toContain(8);
  expect(errors).toEqual([]);
});
