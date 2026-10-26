import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { bootSandbox, setRound, openPanel } from './sandboxPage';

// 060: Fire in the game. In the sandbox, a Fire bomb lobbed into a pack sets it burning: the enemies show flames,
// and their burns beat as small numbers once a second.

/** The sandbox with entrance 0 on Fire bombs (set from the panel as a player would) and the other three empty. */
async function fireBombs(page: Page): Promise<void> {
  await bootSandbox(page);
  await openPanel(page);
  await setRound(page, 0, 'bomb+fire');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'loadout', entrance: 1, round: null } });
    g.step(1, { sandbox: { kind: 'loadout', entrance: 2, round: null } });
    g.step(1, { sandbox: { kind: 'loadout', entrance: 3, round: null } });
    // 064: and the fifth.
    g.step(1, { sandbox: { kind: 'loadout', entrance: 4, round: null } });
    g.step(1, { sandbox: { kind: 'god', on: true } });
    // A pack of Husks ahead, tough enough to burn a while (ring 3).
    g.step(1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 3, champion: false, count: 5 } });
  });
}

test('a Fire bomb sets a pack burning: flames on the enemies, and burn numbers once a second', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await fireBombs(page);
  expect(await page.evaluate(() => window.__GAME__?.getState().loadout)).toEqual(['bomb+fire', null, null, null, null]);
  // Lob at the pack's middle until one burns.
  await expect
    .poll(
      () =>
        page.evaluate((group) => {
          const g = window.__GAME__;
          if (!g) throw new Error('no game');
          const pack = g.getState().enemies.filter((e) => e.group === group);
          const x = pack.reduce((n, e) => n + e.x, 0) / Math.max(1, pack.length);
          const y = pack.reduce((n, e) => n + e.y, 0) / Math.max(1, pack.length);
          for (let t = 0; t < 10; t++) g.step(1, { fire: true, aimX: x, aimY: y });
          return g.getState().enemies.filter((e) => e.burn > 0).length;
        }, SPAWN_GROUP),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  // Drawn: flames on the burning, and small numbers as their burns beat (a few ticks a poll, each drawn between).
  const drawn = () =>
    page.evaluate(() => {
      window.__GAME__?.step(5);
      const ui = window.__GAME__?.ui();
      return { flames: (ui?.enemyFlames ?? 0) > 0, numbers: (ui?.burnNumbers ?? 0) > 0 };
    });
  await expect.poll(drawn, { timeout: 20_000 }).toEqual({ flames: true, numbers: true });
  expect(errors).toEqual([]);
});
