import { expect, type Page } from '@playwright/test';
import { HOLLOWS } from '../../src/data/hollows';
import { boot, cameraSettled } from './helpers';

// The `?start=hollows` sandbox (035) for fighting and photographing Region 2's enemies: its
// guards gone, the player on the road, enemies spawned through the dev hook, and the sim
// stepped tick by tick until an enemy reaches a mode.

/** Open Hollows ground on the round map (053): the tile the sandbox stands the player on, with room east for spawns. */
const OPEN_GROUND = { tx: 67, ty: 149 };

/** The `?start=hollows` sandbox with its guards gone, the player on the road just past the barrier, banners played out and the camera still. */
export async function sandbox(page: Page): Promise<{ x: number; y: number }> {
  await boot(page, '?start=hollows');
  await page.evaluate((at) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright') g.setEnemyHealth(e.id, 0);
    g.step(1);
    // 053: on the terrace road under the ley-iron quarry wall, open ground 9 tiles east and 3 either side.
    h.walkTo((at.tx + 0.5) * 32, (at.ty + 0.5) * 32);
    g.setPlayerHealth(100);
  }, OPEN_GROUND);
  // Queued banners show in turn, briefly none between two: gone means none over several frames running.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            if (window.__GAME__?.ui().landmarks.banner !== null) return false;
            await new Promise((r) => requestAnimationFrame(r));
          }
          return true;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await cameraSettled(page, 20_000);
  const p = (await page.evaluate(() => window.__GAME__?.getState().player)) ?? { x: 0, y: 0 };
  return { x: p.x, y: p.y };
}

/** Spawns an enemy `dx`, `dy` px from the player; returns its id. */
export async function spawn(page: Page, enemyId: string, dx: number, dy: number, champion = false): Promise<number> {
  return page.evaluate(
    ([id, x, y, c]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy(id, p.x + x, p.y + y, c);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    },
    [enemyId, dx, dy, champion] as const,
  );
}

/** Steps one tick at a time, keeping the player topped up, until the enemy's mode and modeTicks say so. */
export async function stepUntil(page: Page, id: number, mode: string, modeTicks = 1, limit = 600): Promise<void> {
  const ok = await page.evaluate(
    ([eid, m, t, max]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let i = 0; i < max; i++) {
        const e = g.getState().enemies.find((x) => x.id === eid);
        if (e && e.mode === m && e.modeTicks >= t) return true;
        g.step(1);
        g.setPlayerHealth(100);
      }
      return false;
    },
    [id, mode, modeTicks, limit] as const,
  );
  expect(ok, `${mode} ${modeTicks}`).toBe(true);
}

/** Lets a few frames draw what the sim now holds. */
export async function frames(page: Page, n = 4): Promise<void> {
  await page.evaluate(async (k) => {
    for (let i = 0; i < k; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);
}

/** 043: into the Sunken Forum with only the Bulwark left, the player just inside its door (055: E at it); returns once it fights (and the lock stands). */
export async function intoForum(page: Page): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate(([door, x]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright') g.setEnemyHealth(e.id, 0);
    g.step(1);
    // 053: round to the forum's north side; 055: E at its door goes in.
    h.walkTo((x + 0.5) * 32, (door - 0.5) * 32);
    if (g.step(1, { interact: true }).events.arenaEnters.length === 0) throw new Error('the forum door did not open');
    for (let t = 0; t < 120 && !g.getState().bosses[0]?.engaged; t++) g.step(1);
  }, [HOLLOWS.arena.door.tiles[0]?.ty ?? 0, HOLLOWS.arena.door.leaveTo.tx] as const);
}
