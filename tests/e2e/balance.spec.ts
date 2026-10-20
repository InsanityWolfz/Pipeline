import { expect, test, type Page } from '@playwright/test';
import { ADDS_GROUP, BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { boot, watchErrors } from './helpers';

// 041 in the game: with ?start=hollows, the Bulwark brought below half through the dev hook
// calls its two adds, below 30% it enrages, and a player who stays behind it is stomped at.

const A = HOLLOWS.arena;

/** Into the forum with only the Bulwark left, standing `dy` tiles below its start, it awake. */
async function forum(page: Page, dy: number): Promise<number> {
  await boot(page, '?start=hollows');
  return page.evaluate(
    ([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
      for (const [x, y] of [[25, 27], [12, 27], [12, 30], [tx, ty]] as const) h.walkTo((x + 0.5) * 32, (y + 0.5) * 32);
      for (let t = 0; t < 120 && !g.getState().bosses[0]?.engaged; t++) g.step(1);
      const b = g.getState().bosses[0];
      if (!b?.engaged) throw new Error('the Bulwark never woke');
      return b.id;
    },
    [A.start.tx, A.start.ty + dy] as const,
  );
}

test('?start=hollows: below half the Bulwark calls a Shardback and a Charger; below 30% it enrages', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  const id = await forum(page, 4);
  const adds = await page.evaluate(
    ([bid, hp, group]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setEnemyHealth(bid, hp);
      const s = g.step(1);
      return { rise: s.events.addsRise.length, adds: s.enemies.filter((e) => e.group === group).map((e) => ({ enemyId: e.enemyId, ring: e.ring, rising: e.rising > 0, health: e.health })) };
    },
    [id, Math.floor(BULWARK.maxHealth * BULWARK.adds.below) - 1, ADDS_GROUP] as const,
  );
  expect(adds.rise).toBe(1);
  expect(adds.adds).toEqual([
    { enemyId: 'shardback', ring: 3, rising: true, health: 175 },
    { enemyId: 'charger', ring: 3, rising: true, health: 125 },
  ]);
  const enraged = await page.evaluate(
    ([bid, hp]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setEnemyHealth(bid, hp);
      for (let t = 0; t < 400; t++) {
        const s = g.step(1);
        if (s.bosses[0]?.enraged) return { enraged: true, mode: s.bosses[0].mode, events: s.events.enrages.length };
      }
      return { enraged: false, mode: '', events: 0 };
    },
    [id, Math.floor(BULWARK.maxHealth * BULWARK.enrage.below) - 1] as const,
  );
  expect(enraged).toEqual({ enraged: true, mode: 'roar', events: 1 });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.enraged).toBe(true);
  expect(errors).toEqual([]);
});

test('?start=hollows: a player who stays behind the Bulwark sees its stomp wind up', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await forum(page, -3);
  // Round to its back, about 100 px out (it turns 40°/s), and hold there, never firing.
  const seen = await page.evaluate((limit) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 3 ? 0 : v > 0 ? 1 : -1);
    let most = 0;
    for (let t = 0; t < limit; t++) {
      const s = g.getState();
      const b = s.bosses[0];
      const e = s.enemies.find((x) => x.id === b?.id);
      if (!b || !e) throw new Error('no Bulwark');
      if (b.mode === 'stomp-windup') return { windup: true, behind: most, stomps: 0 };
      most = Math.max(most, b.behind);
      const bearing = Math.atan2(s.player.y - e.y, s.player.x - e.x);
      const back = (b.angle * Math.PI) / 180 + Math.PI;
      const d = Math.atan2(Math.sin(back - bearing), Math.cos(back - bearing));
      const along = bearing + Math.sign(d || 1) * Math.min(0.7, Math.abs(d));
      const goal = { x: e.x + Math.cos(along) * 100, y: e.y + Math.sin(along) * 100 };
      g.step(1, { moveX: sign(goal.x - s.player.x), moveY: sign(goal.y - s.player.y) });
    }
    return { windup: false, behind: most, stomps: 0 };
  }, 1200);
  expect(seen.windup).toBe(true);
  expect(seen.behind).toBeGreaterThanOrEqual(BULWARK.stomp.behindTicks - 1);
  expect(errors).toEqual([]);
});
