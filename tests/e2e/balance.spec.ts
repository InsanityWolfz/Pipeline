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
    ([tx, ty, lx, ly]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
      // 055: E at the forum's door goes in.
      h.walkTo((lx + 0.5) * 32, (ly + 0.5) * 32);
      h.walkTo((lx + 0.5) * 32, (ly + 1.5) * 32);
      if (g.step(1, { interact: true }).events.arenaEnters.length === 0) throw new Error('the forum door did not open');
      h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
      for (let t = 0; t < 120 && !g.getState().bosses[0]?.engaged; t++) g.step(1);
      const b = g.getState().bosses[0];
      if (!b?.engaged) throw new Error('the Bulwark never woke');
      return b.id;
    },
    // 053: by the forum's door on its north side.
    [A.start.tx, A.start.ty + dy, A.door.leaveTo.tx, A.door.leaveTo.ty] as const,
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

test('?start=hollows: the back wave comes within its interval, and a second pair of adds after the first (041.16)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  const id = await forum(page, 4);
  // A wave starts within `wave.everyTicks` of it waking.
  const wave = await page.evaluate((every) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 1; t <= every; t++) {
      const s = g.step(1);
      if (s.events.waveStarts.length > 0) return { tick: t, building: s.bosses[0]?.waveTicks ?? 0 };
    }
    return { tick: 0, building: 0 };
  }, BULWARK.wave.everyTicks);
  expect(wave.tick).toBeGreaterThan(0);
  expect(wave.building).toBeGreaterThan(0);
  // Below half its adds rise; `adds.everyTicks` later the next pair does, the first two taken out so the cap allows it.
  const pairs = await page.evaluate(
    ([bid, hp, every]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setEnemyHealth(bid, hp);
      const at: number[] = [];
      for (let t = 1; t <= every + 2; t++) {
        const s = g.step(1);
        // Staging, not a fight: this checks the adds' clock, so the standing player is kept up through its 25 s.
        g.setPlayerHealth(100);
        if (s.events.addsRise.length > 0) at.push(t);
        if (t === 2) for (const e of s.enemies) if (e.group === 'bulwark-adds') g.setEnemyHealth(e.id, 0);
        if (s.player.dying > 0) break;
      }
      return at;
    },
    [id, Math.floor(BULWARK.maxHealth * BULWARK.adds.below) - 1, BULWARK.adds.everyTicks] as const,
  );
  expect(pairs).toEqual([1, 1 + BULWARK.adds.everyTicks]);
  expect(errors).toEqual([]);
});

