import { expect, test, type Page } from '@playwright/test';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { watchErrors } from './helpers';
import { bootSandbox } from './sandboxPage';
import { frames, stepUntil } from './hollowsSandbox';

// The Stormcrown's enemies (065) in the sandbox (044), each with its answer: a sidestep dodges a thunderhawk's dive; a
// killed static mite discharges through its trio; a step out of a storm sentinel's circle dodges its strike; and a gale
// ram's gust pushes and slows (the slow drawn on the player and on the HP bar). Every check reads the sim's state.

/** Spawns an enemy through the dev hook `dx`, `dy` px from the player; returns its id. */
async function spawnAt(page: Page, enemyId: string, dx: number, dy: number): Promise<number> {
  return page.evaluate(
    ([id, x, y]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy(id, p.x + x, p.y + y);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    },
    [enemyId, dx, dy] as const,
  );
}

const god = (page: Page) => page.evaluate(() => window.__GAME__?.step(1, { sandbox: { kind: 'god', on: true } }));

test('a thunderhawk: sidestep its dive line during the wind-up and it dives past', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  const id = await spawnAt(page, 'thunderhawk', 150, 0);
  await stepUntil(page, id, 'windup');
  const lane = await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.lane, id);
  expect(lane).toMatchObject({ dx: -1, length: 260, width: 20 });
  const run = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(25, { moveY: 1 });
    let dived = 0;
    for (let t = 0; t < 120; t++) {
      const s = g.step(1);
      dived += s.events.dives.length;
      if (s.enemies.find((e) => e.id === eid)?.mode === 'recover') break;
    }
    const s = g.getState();
    return { dived, health: s.player.health, mode: s.enemies.find((e) => e.id === eid)?.mode };
  }, id);
  expect(run).toEqual({ dived: 1, health: 100, mode: 'recover' });
  await frames(page);
  expect(errors).toEqual([]);
});

test('a static mite trio: one killed discharges through the others, never the player', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await god(page);
  const out = await page.evaluate((group) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // The panel spawns a mite as its trio.
    g.step(1, { sandbox: { kind: 'spawn', enemyId: 'static-mite', ring: 1, champion: false, count: 1 } });
    const trio = g.getState().enemies.filter((e) => e.group === group);
    const first = trio[0];
    if (!first) throw new Error('no trio');
    g.setEnemyHealth(first.id, 0);
    const after = g.step(1);
    return {
      spawned: trio.length,
      trios: [...new Set(trio.map((e) => e.trio))].length,
      discharges: after.events.discharges.length,
      left: after.enemies.filter((e) => e.group === group).length,
      health: after.player.health,
    };
  }, SPAWN_GROUP);
  expect(out).toEqual({ spawned: 3, trios: 1, discharges: 3, left: 0, health: 100 });
  // Drawn: the discharge's bolts.
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().lightningArcs)) ?? 0).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("a storm sentinel's circle: step out before it strikes", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await spawnAt(page, 'storm-sentinel', 250, 0);
  const out = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let called = g.step(1).strikes.length;
    for (let t = 0; t < 20 && called === 0; t++) called = g.step(1).strikes.length;
    const circle = g.getState().strikes[0];
    let struck = 0;
    for (let t = 0; t < 90 && struck === 0; t++) struck = g.step(1, { moveY: 1 }).events.strikes.length;
    return { called, r: circle?.r, struck, health: g.getState().player.health };
  });
  expect(out).toEqual({ called: 1, r: 36, struck: 1, health: 100 });
  await frames(page);
  expect(errors).toEqual([]);
});

test("a gale ram's gust pushes the player back and slows them, shown on the player and the HP bar", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  const id = await spawnAt(page, 'gale-ram', 70, 0);
  await stepUntil(page, id, 'windup');
  const out = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const x0 = g.getState().player.x;
    let gusts = 0;
    for (let t = 0; t < 70 && gusts === 0; t++) gusts = g.step(1).events.gusts.length;
    g.step(15);
    const s = g.getState();
    return { gusts, health: s.player.health, pushed: Math.round(x0 - s.player.x), slow: s.player.slow };
  });
  expect(out.gusts).toBe(1);
  expect(out.health).toBe(80);
  expect(out.pushed).toBeGreaterThan(100);
  expect(out.slow?.share).toBe(0.4);
  await expect.poll(async () => page.evaluate(() => ({ swirl: window.__GAME__?.ui().slowSwirl, bar: window.__GAME__?.ui().health.slowed }))).toEqual({ swirl: true, bar: true });
  expect(errors).toEqual([]);
});
