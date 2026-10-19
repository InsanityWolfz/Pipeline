import { expect, test, type Page } from '@playwright/test';
import { CLAIM_TICKS } from '../../src/data/claims';
import { HOLLOWS } from '../../src/data/hollows';
import { boot, watchErrors } from './helpers';

// Stonefall Hollows (034): the barrier drops when the shrine is claimed; in the Hollows,
// claim the Cistern Terrace, beat the Bulwark from behind with arrows (its shield blocks
// the front), see its core drop, and summon it again at the altar.

const A = HOLLOWS.arena;
const T = 32;

/** Kills every enemy but those of `keep`'s enemy ids, through the hook. */
async function quiet(page: Page, keep: readonly string[] = []): Promise<void> {
  await page.evaluate((k) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (!k.includes(e.enemyId)) g.setEnemyHealth(e.id, 0);
    g.step(1);
  }, keep);
}

async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    if (!h) throw new Error('no helpers');
    for (const [tx, ty] of pts) h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
  }, points);
}

test('the barrier holds until the shrine is claimed (?playtest), then drops, and the player walks west into the Hollows', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await quiet(page);
  await walk(page, [[52, 27], [42, 27]]);
  // Walking at the gap: the barrier stops the player.
  const blocked = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120; t++) g.step(1, { moveX: -1 });
    const s = g.getState();
    return { x: s.player.x, gate: s.gates.hollows, region: s.area.region };
  });
  expect(blocked).toEqual({ x: expect.any(Number), gate: false, region: 1 });
  expect(blocked.x).toBeGreaterThan(40 * T);
  expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toBe('shut');
  const fell = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.claim('shrine');
    return g.step(1).events.gates;
  });
  expect(fell).toEqual([{ gate: 'hollows' }]);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier, { timeout: 10_000 }).toBe('down');
  const inside = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 200 && g.getState().area.region !== 2; t++) g.step(1, { moveX: -1 });
    const s = g.step(1);
    return { region: s.area.region, ring: s.area.ring };
  });
  expect(inside).toMatchObject({ region: 2, ring: 3 });
  expect(errors).toEqual([]);
});

test('?start=hollows: clear and claim the Cistern Terrace; its ley-iron comes up a new port', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page, '?start=hollows');
  await quiet(page, ['bulwark']);
  await walk(page, [[25, 27], [25, 13]]);
  const claimed = await page.evaluate((ticks) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1, { interact: true });
    g.step(ticks);
    return g.getState();
  }, CLAIM_TICKS);
  expect(claimed.claims).toEqual(['shrine', 'cistern-terrace']);
  expect(claimed.ports.find((p) => p.raw === 'ley-iron')).toMatchObject({ pylons: 1 });
  expect(claimed.ports.find((p) => p.raw === 'stone')).toMatchObject({ pylons: 2 });
});

test('?start=hollows: the shield blocks arrows into its front; from behind they land, it falls, its core drops, and the altar summons it again', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  await quiet(page, ['bulwark']);
  await walk(page, [[25, 27], [12, 27], [12, 30], [A.start.tx, A.start.ty + 3]]);

  // From the front: once it has turned to face the player, every arrow is blocked.
  const front = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(180);
    g.setPlayerHealth(100);
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    let blocked = 0;
    for (let t = 0; t < 60; t++) {
      const s = g.step(1, { fire: true, aimX: b.x, aimY: b.y - 20 });
      blocked += s.events.blocked.length;
    }
    for (let t = 0; t < 30; t++) blocked += g.step(1).events.blocked.length;
    return { blocked, health: g.getState().bosses[0]?.health };
  });
  expect(front.blocked).toBeGreaterThan(0);
  expect(front.health).toBe(900);

  // From behind: keep circling to its back (it turns 40°/s), firing only while there, out of the pound.
  const fight = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 3 ? 0 : v > 0 ? 1 : -1);
    const id = g.getState().bosses[0]?.id ?? -1;
    // Shortened (the test's subject is where arrows land, not how long the fight takes).
    g.setEnemyHealth(id, 200);
    let backHits = 0;
    for (let t = 0; t < 6000; t++) {
      const s = g.getState();
      const b = s.bosses[0];
      const e = s.enemies.find((x) => x.id === id);
      if (!b || !e) return { won: true, backHits, events: s.events };
      g.setPlayerHealth(100);
      const p = s.player;
      const a = (b.angle * Math.PI) / 180;
      const bearing = Math.atan2(p.y - e.y, p.x - e.x);
      const off = Math.abs(((bearing - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      // Round it toward its back, a little at a time, about 110 px out.
      const back = a + Math.PI;
      const d = Math.atan2(Math.sin(back - bearing), Math.cos(back - bearing));
      const along = bearing + Math.sign(d || 1) * Math.min(0.7, Math.abs(d));
      let goal = { x: e.x + Math.cos(along) * 110, y: e.y + Math.sin(along) * 110 };
      // Its pound coming: straight away from it.
      if (b.mode === 'windup' && dist < 130) goal = { x: p.x + (p.x - e.x), y: p.y + (p.y - e.y) };
      const behind = off > (110 * Math.PI) / 180;
      const next = g.step(1, { moveX: sign(goal.x - p.x), moveY: sign(goal.y - p.y), fire: behind && dist < 250, aimX: e.x, aimY: e.y - 20 });
      backHits += next.events.hits.filter((h) => h.target === 'enemy' && h.id === id).length;
      if (next.events.bossDefeats.length > 0) return { won: true, backHits, events: next.events };
    }
    return { won: false, backHits, events: null };
  });
  expect(fight.won).toBe(true);
  expect(fight.backHits).toBeGreaterThan(0);
  expect(fight.events?.bossDefeats).toEqual([{ boss: 'bulwark' }]);
  const loot = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.getState();
    const drops = s.groundItems.filter((i) => i.itemId === 'bulwark-core');
    const core = drops.length;
    // To where it fell (the guards' drops lie far off, by the Terrace).
    if (drops[0]) h.walkTo(drops[0].x, drops[0].y + 12);
    g.step(1);
    return { core, carried: g.getState().inventory['bulwark-core'] ?? 0, defeats: g.getState().bossDefeats };
  });
  expect(loot.core).toBe(1);
  expect(loot.carried).toBeGreaterThanOrEqual(1);
  expect(loot.defeats).toEqual(['bulwark']);

  // The altar wakes: E opens its offering, E again pays it, and the Bulwark rises after the summon.
  await walk(page, [[A.altar.tx + 1, A.altar.ty]]);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.altar).toBe('awake');
  await page.keyboard.press('e');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().altarPanel))?.enabled).toBe(true);
  await page.keyboard.press('e');
  const summoned = await page.evaluate((ticks) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const first = g.step(1);
    const iron = first.inventory['ley-iron'] ?? 0;
    g.step(ticks);
    const s = g.getState();
    return { summons: first.events.summons, iron, bosses: s.bosses.length, altar: s.altars[0]?.state };
  }, A.summonTicks);
  expect(summoned.summons).toEqual([{ altar: A.altar.id, boss: 'bulwark' }]);
  expect(summoned.bosses).toBe(1);
  expect(summoned.altar).toBe('spent');
  expect(errors).toEqual([]);
});
