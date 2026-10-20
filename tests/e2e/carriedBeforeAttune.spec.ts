import { expect, test } from '@playwright/test';
import { CARRIED_HINT } from '../../src/data/hints';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { boot, watchErrors } from './helpers';

// 047.9 (Shaun, 2026-10-20: "left fires carried until attuned"): before the tube attunes there's no intake, so left
// click fires the carried bar's selected round, and the intake bar shows that round, not the fist. As the attune
// (019) ends, a one-time hint says right click is the carried items.

const T = 32;
const HINT = CARRIED_HINT.text('Right click');

test("a new game's first Husk fight fires arrows on left click", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  // The tutorial's first beats (012): the tube from its stone, the meadow's raws, then arrows crafted.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.walkTo((40.5 + h.ox) * tile, 34.5 * tile);
    g.step(1, { interact: true });
    for (const i of [8, 3, 7, 5, 6, 1, 0]) h.harvest(i, 3);
    for (const r of ['shaft', 'shaft', 'shaft', 'arrowhead', 'arrowhead', 'arrowhead', 'rope', 'rope', 'rope']) g.craft(r);
    for (let i = 0; i < 6; i++) g.craft('arrow');
    g.step(1);
  }, T);
  const armed = await page.evaluate(() => window.__GAME__?.step(0));
  expect(armed?.hasTube).toBe(true);
  expect(armed?.link.attuned).toBe(false);
  const arrows = armed?.inventory.arrow ?? 0;
  expect(arrows).toBeGreaterThan(0);
  expect(armed?.hud.active).toEqual({ kind: 'carried', ammoId: 'arrow', count: arrows });
  // The intake bar shows what left click fires: the arrows and their count, not "Melee".
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.tubeSlot.labels).toEqual([String(arrows)]);
  expect((await page.evaluate(() => window.__GAME__?.ui().hud))?.tubeSlot.labels).not.toContain(HUD_LAYOUT.tubeSlot.melee);

  // Up into the ruin field, and left click only (fire, never use) at the nearest Husk.
  const fight = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const X = h.ox;
    h.walkTo((41.5 + X) * tile, g.getState().player.y);
    h.walkTo((41.5 + X) * tile, 22.5 * tile);
    h.walkTo((43.5 + X) * tile, 22.5 * tile);
    h.walkTo((43.5 + X) * tile, 19.5 * tile);
    const shots: string[] = [];
    let melees = 0;
    let hits = 0;
    for (let t = 0; t < 120; t++) {
      const s = g.getState();
      const p = s.player;
      const husk = s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!husk) throw new Error('no Husk');
      const after = g.step(1, { fire: true, aimX: husk.x, aimY: husk.y - 8 });
      shots.push(...after.events.shots.map((x) => x.ammoId));
      melees += after.events.melees.length;
      hits += after.events.hits.length;
    }
    return { shots, melees, hits, end: g.step(0) };
  }, T);
  expect(fight.shots.length).toBeGreaterThan(1);
  expect(new Set(fight.shots)).toEqual(new Set(['arrow']));
  expect(fight.melees).toBe(0);
  expect(fight.hits).toBeGreaterThan(0);
  expect(fight.end.inventory.arrow).toBe(arrows - fight.shots.length);
  expect(fight.end.tube.fromReservoir).toBe(false);
  expect(errors).toEqual([]);
});

test('the right click hint shows once, as the attune ends', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const attuning = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toFoundry();
    return g.step(1);
  });
  expect(attuning.link.attuned).toBe(true);
  expect(attuning.link.attunePulse).toBeGreaterThan(0);
  // Not while the attune plays.
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.step(0)))?.link.attunePulse).toBeGreaterThan(0);
  expect((await page.evaluate(() => window.__GAME__?.ui().hint))?.seen).toEqual([]);
  await page.evaluate((ticks) => window.__GAME__?.step(ticks), attuning.link.attunePulse);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hint))?.text).toBe(HINT);
  // It fades out and never comes back while the game goes on.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hint))?.text, { timeout: 15_000 }).toBeNull();
  await page.evaluate(() => {
    window.__helpers?.toHall();
    window.__helpers?.toFoundry();
    window.__GAME__?.step(600);
  });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().schematics.bannerIdle)) ?? false).toBe(true);
  expect((await page.evaluate(() => window.__GAME__?.ui().hint))?.seen).toEqual([HINT]);
  expect(errors).toEqual([]);
});
