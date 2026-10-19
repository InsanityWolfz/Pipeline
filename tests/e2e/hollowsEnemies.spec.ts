import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';
import { sandbox, spawn, stepUntil } from './hollowsSandbox';

// Region 2's enemies (035) in the `?start=hollows` sandbox, one of each: dodge a Charger's
// charge sideways, step out of a Burrower's ring, kill a Shardback from behind, and roll
// through a Sniper's bolt after its sight locks. Every check reads the sim's state.

test('a Charger: sidestep its lane during the wind-up and the charge runs past', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  const id = await spawn(page, 'charger', 150, 0);
  await stepUntil(page, id, 'windup');
  const lane = await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.lane, id);
  expect(lane).toMatchObject({ dx: -1, dy: 0, length: 220, width: 24 });
  const run = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Down, out of the 24 px lane, while it paws.
    g.step(25, { moveY: 1 });
    let charged = 0;
    for (let t = 0; t < 120; t++) {
      const s = g.step(1);
      charged += s.events.charges.length;
      if (s.enemies.find((e) => e.id === eid)?.mode === 'recover') break;
    }
    const s = g.getState();
    return { charged, health: s.player.health, mode: s.enemies.find((e) => e.id === eid)?.mode };
  }, id);
  expect(run).toEqual({ charged: 1, health: 100, mode: 'recover' });
  expect(errors).toEqual([]);
});

test('a Burrower: step out of its ring before it erupts', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  const id = await spawn(page, 'burrower', 120, 40);
  // It digs in, tunnels under the still player and locks their feet.
  await stepUntil(page, id, 'windup');
  const locked = await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid), id);
  expect(locked).toMatchObject({ underground: true, locked: { radius: 28 } });
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.ripples)).toBe(1);
  const out = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(24, { moveX: -1 });
    let erupted = 0;
    for (let t = 0; t < 60 && erupted === 0; t++) erupted += g.step(1).events.eruptions.length;
    const s = g.getState();
    const e = s.enemies.find((x) => x.id === eid);
    return { erupted, health: s.player.health, underground: e?.underground };
  }, id);
  expect(out).toEqual({ erupted: 1, health: 100, underground: false });
  expect(errors).toEqual([]);
});

test('a Shardback: its front blocks; circling inside its turn to its back, the arrows land and it falls', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  const id = await spawn(page, 'shardback', 110, 0);
  // From the front, once it has turned to face the player: every arrow rings off the shield.
  const front = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(50);
    let blocked = 0;
    for (let t = 0; t < 20; t++) {
      const e = g.getState().enemies.find((x) => x.id === eid);
      blocked += g.step(1, { fire: true, aimX: e?.x ?? 0, aimY: (e?.y ?? 0) - 12 }).events.blocked.length;
    }
    g.step(10);
    return { blocked, health: g.getState().enemies.find((x) => x.id === eid)?.health };
  }, id);
  expect(front.blocked).toBeGreaterThan(0);
  expect(front.health).toBe(70);
  const fight = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 1.5 ? 0 : v > 0 ? 1 : -1);
    let backHits = 0;
    let blocked = 0;
    for (let t = 0; t < 3000; t++) {
      const s = g.getState();
      const e = s.enemies.find((x) => x.id === eid);
      if (!e) return { dead: true, backHits, blocked, deaths: 1 };
      const p = s.player;
      const a = ((e.angle ?? 0) * Math.PI) / 180;
      const bearing = Math.atan2(p.y - e.y, p.x - e.x);
      const off = Math.abs(Math.atan2(Math.sin(bearing - a), Math.cos(bearing - a)));
      // Round it close in, where the player's walk out-turns its shield (120°/s), firing only from its back.
      const along = bearing + 0.7;
      const goal = { x: e.x + Math.cos(along) * 26, y: e.y + Math.sin(along) * 26 };
      const behind = off > (110 * Math.PI) / 180;
      const next = g.step(1, { moveX: sign(goal.x - p.x), moveY: sign(goal.y - p.y), fire: behind, aimX: e.x, aimY: e.y - 12 });
      g.setPlayerHealth(100);
      backHits += next.events.hits.filter((h) => h.target === 'enemy' && h.id === eid).length;
      blocked += next.events.blocked.filter((b) => b.id === eid).length;
      if (next.events.deaths.some((d) => d.id === eid)) return { dead: true, backHits, blocked, deaths: 1 };
    }
    return { dead: false, backHits, blocked, deaths: 0 };
  }, id);
  expect(fight.dead).toBe(true);
  expect(fight.backHits).toBeGreaterThanOrEqual(7);
  expect(errors).toEqual([]);
});

test("a Sniper construct: its sight tracks, locks and blinks; a roll through the bolt dodges it", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  const id = await spawn(page, 'sniper', 200, 0);
  await stepUntil(page, id, 'windup');
  expect(await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.snipe?.phase, id)).toBe('tracking');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.lasers[0]?.locked)).toBe(false);
  await stepUntil(page, id, 'windup', 61);
  expect(await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.snipe?.phase, id)).toBe('locked');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.lasers[0]?.locked)).toBe(true);
  const roll = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let snipes = 0;
    for (let t = 0; t < 60 && snipes === 0; t++) snipes += g.step(1).events.snipes.length;
    // Rolls as the bolt closes, straight along its line (the roll's i-frames, not its reach, do the dodging).
    let rolled = false;
    let hit = 0;
    for (let t = 0; t < 90; t++) {
      const s = g.getState();
      const bolt = s.orbs.find((o) => o.enemyId === 'sniper');
      const near = bolt !== undefined && Math.abs(bolt.x - s.player.x) < 36;
      const next = g.step(1, near && !rolled ? { dodge: true, moveX: 1 } : {});
      if (near) rolled = true;
      hit += next.events.hits.filter((h) => h.target === 'player').length;
      if (rolled && !next.orbs.some((o) => o.enemyId === 'sniper')) break;
    }
    return { snipes, rolled, hit, health: g.getState().player.health };
  });
  expect(roll).toEqual({ snipes: 1, rolled: true, hit: 0, health: 100 });
  expect(errors).toEqual([]);
});
