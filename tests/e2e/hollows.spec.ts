import { expect, test, type Page } from '@playwright/test';
import { CLAIM_TICKS } from '../../src/data/claims';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_SITES } from '../../src/data/hollowsSites';
import { boot, enterArena, watchErrors } from './helpers';
import { clickRow, flowIs } from './flowPage';

// Stonefall Hollows (034): the barrier drops when the shrine is claimed; in the Hollows,
// claim the Cistern Terrace, hit the Bulwark from behind with arrows (its shield blocks
// the front), finish it, see its core drop, and summon it again at the altar.

const A = HOLLOWS.arena;
const T = 32;
/** 053: where the terrace road crosses the barrier's circle, and the barrier's tile nearest Region 1 on that row. */
const ROW = HOLLOWS.crossing.ty;
const GATE_X = Math.max(...HOLLOWS.gate.filter((t) => t.ty === ROW && t.tx < HOLLOWS.crossing.tx + 3).map((t) => t.tx));
const TERRACE = HOLLOWS_SITES.find((l) => l.id === 'cistern-terrace')?.pylon ?? { tx: 0, ty: 0 };

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
  await walk(page, [[GATE_X + 4, ROW]]);
  // Walking at it (053: on the circle where the terrace road crosses): the barrier stops the player.
  const blocked = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120; t++) g.step(1, { moveX: -1 });
    const s = g.getState();
    return { x: s.player.x, gate: s.gates.hollows, region: s.area.region };
  });
  expect(blocked).toEqual({ x: expect.any(Number), gate: false, region: 1 });
  expect(blocked.x).toBeGreaterThan((GATE_X + 1) * T);
  expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toBe('shut');
  const fell = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.claim('shrine');
    return g.step(1).events.gates;
  });
  expect(fell).toEqual([{ gate: 'hollows' }]);
  // The sim's gate is open at once; the wall's fade runs on render frames, so it is collapsing or already down.
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.gates.hollows).toBe(true);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toMatch(/^(collapsing|down)$/);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrierAlpha).toBeLessThan(1);
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
  await walk(page, [[TERRACE.tx, TERRACE.ty + 5], [TERRACE.tx, TERRACE.ty + 1]]);
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
  await enterArena(page, A);
  await walk(page, [[A.start.tx, A.start.ty + 3]]);

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
      const s = g.step(1, { use: true, aimX: b.x, aimY: b.y - 20 });
      blocked += s.events.blocked.length;
    }
    for (let t = 0; t < 30; t++) blocked += g.step(1).events.blocked.length;
    return { blocked, health: g.getState().bosses[0]?.health };
  });
  expect(front.blocked).toBeGreaterThan(0);
  expect(front.health).toBe(BULWARK.maxHealth);

  // From behind: keep circling to its back (it turns 40°/s), firing only while there, out of the pound, and stepping
  // out of its rear arc to its flank once its stomp's wind-up shows (041). A few seconds of it: the arrows land.
  const back = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 3 ? 0 : v > 0 ? 1 : -1);
    const id = g.getState().bosses[0]?.id ?? -1;
    // Healed once after the front's test (its bombs and pound there), as before 041; none from here on.
    g.setPlayerHealth(100);
    let backHits = 0;
    for (let t = 0; t < 1200 && backHits < 10; t++) {
      const s = g.getState();
      const b = s.bosses[0];
      const e = s.enemies.find((x) => x.id === id);
      if (!b || !e) break;
      const p = s.player;
      const a = (b.angle * Math.PI) / 180;
      const bearing = Math.atan2(p.y - e.y, p.x - e.x);
      const off = Math.abs(((bearing - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      // The stomp's half-disc seen (a quarter second after it shows): out to its flank until it has landed.
      const out = b.mode === 'stomp-windup' && b.modeTicks >= 15;
      // Round it toward its back, a little at a time, about 110 px out; or out to its flank while the stomp winds up.
      const rear = a + Math.PI;
      const d = Math.atan2(Math.sin(rear - bearing), Math.cos(rear - bearing));
      const along = out ? a + Math.sign(Math.atan2(Math.sin(bearing - a), Math.cos(bearing - a)) || 1) * (Math.PI / 4) : bearing + Math.sign(d || 1) * Math.min(0.7, Math.abs(d));
      let goal = { x: e.x + Math.cos(along) * 110, y: e.y + Math.sin(along) * 110 };
      // Its pound coming: straight away from it.
      if (b.mode === 'windup' && dist < 130) goal = { x: p.x + (p.x - e.x), y: p.y + (p.y - e.y) };
      const behind = off > (110 * Math.PI) / 180;
      const next = g.step(1, { moveX: sign(goal.x - p.x), moveY: sign(goal.y - p.y), use: behind && dist < 250, aimX: e.x, aimY: e.y - 20 });
      backHits += next.events.hits.filter((h) => h.target === 'enemy' && h.id === id).length;
    }
    return { backHits, health: g.getState().bosses[0]?.health ?? 0, ko: g.getState().player.dying > 0 };
  });
  expect(back.backHits).toBeGreaterThanOrEqual(10);
  expect(back.health).toBeLessThan(BULWARK.maxHealth);
  expect(back.ko).toBe(false);

  // It falls. Its full 3,000 HP fight (041) is held to 60–90 s by tests/sim/bulwarkFight.test.ts, past what the kit's
  // carried arrows can deal; here the hook takes it to its last 20 HP. Its adds rise as it drops below half and are
  // taken out through the hook too (balance.spec.ts has them), and carried bombs, which land from any side, finish it.
  const fight = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const id = g.getState().bosses[0]?.id ?? -1;
    g.setEnemyHealth(id, 20);
    window.__helpers?.hold('bomb');
    for (const e of g.getState().enemies) if (e.group === 'bulwark-adds') g.setEnemyHealth(e.id, 0);
    for (let t = 0; t < 1200; t++) {
      const s = g.getState();
      const e = s.enemies.find((x) => x.id === id);
      if (!e) return { won: true, events: s.events };
      if (s.player.dying > 0) return { won: false, events: null };
      const p = s.player;
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      // Lobbed from just inside a bomb's reach; back off if it comes close.
      const away = dist < 120 ? { moveX: Math.sign(p.x - e.x) as -1 | 0 | 1, moveY: Math.sign(p.y - e.y) as -1 | 0 | 1 } : {};
      const next = g.step(1, { ...away, use: dist < 180, aimX: e.x, aimY: e.y });
      if (next.events.bossDefeats.length > 0) return { won: true, events: next.events };
    }
    return { won: false, events: null };
  });
  expect(fight.won).toBe(true);
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

  // 042: the first kill's end card shows 180 ticks on; Keep playing closes it.
  await page.evaluate(() => window.__GAME__?.step(200));
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
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
