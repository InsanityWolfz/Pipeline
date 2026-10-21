import { expect, test, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';
import { RUIN } from '../../src/data/home';
import { OVERWORLD } from '../../src/data/overworld';

// The ruin field's Husk pack (017: group `field`) sits up and to the right of the field start, off screen.
// Each test drives the game tick by tick through window.__GAME__ inside the page.

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function boot(page: Page): Promise<void> {
  await page.goto('/?start=field');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  await page.evaluate(() => window.__GAME__?.step(0));
}

/** Walks toward the pack until a Husk aggros: east of the mound, then north up the open side of the ruin field (017). Returns the ticks taken. */
function approachPack(page: Page) {
  return page.evaluate(([door, half]) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // East past the ruin (053: `half` tiles either side of the door), then up to the row above the door's, beside it,
    // west of the ruin field's wall stub there.
    const x = (door.tx + half + 1.5) * 32;
    const y = (door.ty - 0.5) * 32;
    for (let t = 1; t <= 600; t++) {
      const p = g.getState().player;
      const s = g.step(1, p.x < x ? { moveX: 1 } : p.y > y ? { moveY: -1 } : {});
      if (s.player.y <= y + 2 && s.enemies.filter((e) => e.group === 'field').some((e) => e.mode === 'chase')) return t;
    }
    return -1;
  }, [OVERWORLD.entrance.door, Math.floor(RUIN.w / 2)] as const);
}

test('Husks aggro when the player comes near', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const start = await page.evaluate(() => window.__GAME__?.getState());
  expect(start?.enemies.filter((e) => e.group === 'field').map((e) => e.mode)).toEqual(['idle', 'idle', 'idle']);
  expect(start?.player.health).toBe(100);
  expect(await approachPack(page)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a Husk swipe hurts a player who stands still', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await approachPack(page);
  const health = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 600; t++) {
      const s = g.step(1);
      if (s.player.health < 100) return s.player.health;
    }
    return 100;
  });
  expect(health).toBe(80);
  expect(errors).toEqual([]);
});

test('rolling through a wind-up avoids the swipe', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await approachPack(page);
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Wait for a wind-up two ticks from landing, then roll.
    for (let t = 0; t < 600; t++) {
      const s = g.step(1);
      if (s.enemies.filter((e) => e.group === 'field').some((e) => e.mode === 'windup' && e.modeTicks === 35)) break;
    }
    g.step(1, { dodge: true, moveY: 1 });
    const after = g.step(3);
    return { health: after.player.health, swiped: after.enemies.filter((e) => e.room === after.room).some((e) => e.mode === 'swipe') };
  });
  expect(result).toEqual({ health: 100, swiped: true });
  expect(errors).toEqual([]);
});

test('shooting a Husk dead drops items the player can pick up', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await approachPack(page);
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    // Shoot the nearest Husk until one dies.
    for (let t = 0; t < 1200 && s.groundItems.length === 0; t++) {
      const p = s.player;
      const target = [...s.enemies.filter((e) => e.group === 'field')].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      s = g.step(1, {
        use: target !== undefined,
        aimX: target?.x ?? p.x,
        aimY: target?.y ?? p.y,
      });
    }
    const dropped = s.groundItems.length;
    // Walk onto each drop in turn.
    for (let t = 0; t < 600 && s.groundItems.length > 0; t++) {
      const item = s.groundItems[0];
      if (!item) break;
      const dx = item.x - s.player.x;
      const dy = item.y - s.player.y;
      s = g.step(1, { moveX: Math.abs(dx) < 2 ? 0 : dx > 0 ? 1 : -1, moveY: Math.abs(dy) < 2 ? 0 : dy > 0 ? 1 : -1 });
    }
    return { dropped, left: s.groundItems.length, resin: s.inventory['husk-resin'] ?? 0, enemies: s.enemies.filter((e) => e.group === 'field').length };
  });
  expect(result.dropped).toBeGreaterThan(0);
  expect(result.left).toBe(0);
  expect(result.resin).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('Husks walk home and heal once the player runs away', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await approachPack(page);
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Wing one Husk so there is something to heal, then run back past the spawn.
    let s = g.step(30);
    // The nearest chaser, so the shot isn't blocked by the mound or a wall.
    const p0 = s.player;
    const target = s.enemies.filter((e) => e.group === 'field' && e.mode === 'chase').sort((a, b) => Math.hypot(a.x - p0.x, a.y - p0.y) - Math.hypot(b.x - p0.x, b.y - p0.y))[0];
    if (!target) throw new Error('no Husk');
    for (let t = 0; t < 120 && s.enemies.filter((e) => e.group === 'field').every((e) => e.health === 40); t++) {
      const now = s.enemies.find((e) => e.id === target.id) ?? target;
      s = g.step(1, { use: true, aimX: now.x, aimY: now.y });
    }
    const hurt = s.enemies.filter((e) => e.group === 'field').some((e) => e.health < 40);
    for (let t = 0; t < 2400 && !s.enemies.filter((e) => e.group === 'field').every((e) => e.mode === 'idle'); t++) {
      s = g.step(1, { moveX: -1, moveY: 1, dodge: t % 60 === 0 });
    }
    return {
      hurt,
      modes: s.enemies.filter((e) => e.group === 'field').map((e) => e.mode),
      healths: s.enemies.filter((e) => e.group === 'field').map((e) => e.health),
      home: s.enemies.filter((e) => e.group === 'field').every((e) => Math.hypot(e.x - e.home.x, e.y - e.home.y) <= 4),
    };
  });
  expect(result).toEqual({ hurt: true, modes: ['idle', 'idle', 'idle'], healths: [40, 40, 40], home: true });
  expect(errors).toEqual([]);
});

test('a KO wakes the player in the foundry and resets the ruin field', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await approachPack(page);
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 3000; t++) {
      const s = g.step(1);
      if (s.player.ko) {
        return {
          ko: true,
          room: s.room,
          health: s.player.health,
          arrows: s.inventory.arrow,
          enemies: s.enemies.filter((e) => e.group === 'field').map((e) => [e.mode, e.health]),
          ground: s.groundItems.length,
        };
      }
    }
    return { ko: false };
  });
  expect(result).toEqual({
    ko: true,
    room: 'foundry',
    health: 100,
    arrows: 30,
    enemies: [
      ['idle', 40],
      ['idle', 40],
      ['idle', 40],
    ],
    ground: 0,
  });
  expect(errors).toEqual([]);
});
