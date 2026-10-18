import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { craftMenuLines } from '../../src/render/craftMenuLayout';
import { boot, watchErrors } from './helpers';

// Gathering, crafting and the three ammo, driven through window.__GAME__.

/** Node indexes in the overworld (017): the first of each kind near the meadow. */
const TREE = 0;
const RUBBLE = 3;
const REEDS = 6;
const LEY_VEIN = 8;

/** Harvests what one batch of every chain needs: wood, fiber, 2 stone, 1 ley crystal. */
async function gatherEverything(page: Page): Promise<void> {
  await page.evaluate(
    ([vein, rubble, tree, reeds]) => {
      const h = window.__helpers;
      if (!h) throw new Error('no helpers');
      h.harvest(vein, 1);
      h.harvest(rubble, 2);
      h.harvest(tree, 1);
      h.harvest(reeds, 1);
    },
    [LEY_VEIN, RUBBLE, TREE, REEDS] as const,
  );
}

test('harvesting each node type gathers wood, stone, fiber and ley crystal', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  await gatherEverything(page);
  const s = await page.evaluate(() => window.__GAME__?.getState());
  expect(s?.inventory).toMatchObject({ wood: 1, stone: 2, fiber: 1, 'ley-crystal': 1 });
  expect(s?.nodes[RUBBLE]?.uses).toBe(1);
  expect(errors).toEqual([]);
});

test('the full arrow, bomb and ley bolt chains craft from gathered materials', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await page.evaluate(() => window.__GAME__?.step(0));
  await gatherEverything(page);
  await page.evaluate(() => window.__helpers?.killHusk());
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const before = g.getState().inventory.arrow ?? 0;
    for (const r of ['shaft', 'arrowhead', 'rope', 'arrow', 'casing', 'fuse', 'ley-shard', 'bomb', 'ley-bolt']) g.craft(r);
    return { before, after: g.getState() };
  });
  expect(s.after.inventory.arrow).toBe(s.before + 4);
  expect(s.after.inventory).toMatchObject({ bomb: 2, 'ley-bolt': 2, shaft: 1, arrowhead: 1, rope: 1 });
  expect(s.after.crafted).toEqual(['arrow', 'arrowhead', 'bomb', 'casing', 'fuse', 'ley-bolt', 'ley-shard', 'rope', 'shaft']);
  expect(errors).toEqual([]);
});

test('the crafting menu pauses the world and crafts on a click', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  // Real time first: C pauses, Esc resumes.
  await page.waitForTimeout(300);
  const tick = async () => (await page.evaluate(() => window.__GAME__?.getState().tick)) ?? 0;
  await page.keyboard.press('c');
  // Once the press lands (a slow frame can delay it), the clock stops and stays stopped.
  await expect
    .poll(async () => {
      const a = await tick();
      await page.waitForTimeout(150);
      return (await tick()) - a;
    })
    .toBe(0);
  const paused = await tick();
  await page.waitForTimeout(500);
  expect(await tick()).toBe(paused);
  await page.keyboard.press('Escape');
  await expect.poll(tick).toBeGreaterThan(paused);

  // Then gather a log under the test clock and craft it from the menu.
  await page.evaluate((tree) => {
    window.__GAME__?.step(0);
    window.__helpers?.harvest(tree, 1);
  }, TREE);
  await page.keyboard.press('c');
  const row = craftMenuLines().find((l) => l.kind === 'recipe' && l.id === 'shaft');
  const box = await page.locator('canvas').boundingBox();
  if (!row || !box) throw new Error('no shaft row or canvas');
  const zoom = box.width / VIEW_WIDTH;
  await page.mouse.move(box.x + (row.x + 40) * zoom, box.y + (row.y + 10) * zoom);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(100);
  const s = await page.evaluate(() => window.__GAME__?.getState());
  expect(s?.inventory).toMatchObject({ wood: 0, shaft: 2 });
  // A second click with no wood left does nothing.
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.inventory.shaft).toBe(2);
  expect(errors).toEqual([]);
});

test('a ley bolt pierces two Husks, and a bomb burn kills one', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await page.evaluate(() => window.__GAME__?.step(0));
  await gatherEverything(page);
  await page.evaluate(
    ([vein]) => {
      const h = window.__helpers;
      if (!h) throw new Error('no helpers');
      // Two more ley crystals for plenty of bolts, then resin for a fuse.
      h.harvest(vein, 2);
      h.killHusk();
      // Wake the third by walking past it (017: it sleeps apart from the others in the ruin field), rolling so their swipes miss.
      const g = window.__GAME__;
      for (let t = 0; t < 200 && g && g.getState().player.x > 38 * 32; t++) g.step(1, { moveX: -1, dodge: t % 40 === 0 });
    },
    [LEY_VEIN] as const,
  );
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const r of ['casing', 'fuse', 'ley-shard', 'ley-shard', 'ley-shard', 'bomb']) g.craft(r);
    for (let i = 0; i < 5; i++) g.craft('ley-bolt');
    let s = g.getState();
    const nearest = () => {
      const p = s.player;
      return [...s.enemies.filter((e) => e.group === 'field')].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    };
    const carried = () => s.inventory[s.tube.ammo] ?? 0;

    // Pierce: back away from the two chasing Husks and fire only once the farther one
    // stands on the line through the nearer one, so one bolt can pass through both.
    s = g.step(1, { selectAmmo: 'ley-bolt' });
    let pierced = 0;
    for (let t = 0; t < 3000 && pierced < 2 && s.enemies.filter((e) => e.group === 'field').length === 2; t++) {
      const p = s.player;
      const [near, far] = [...s.enemies.filter((e) => e.group === 'field')].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      if (!near || !far) break;
      const nx = near.x - p.x;
      const ny = near.y - p.y;
      const len = Math.hypot(nx, ny);
      // How far the farther Husk's feet are off the bolt's line, px.
      const off = Math.abs((far.x - p.x) * ny - (far.y - p.y) * nx) / len;
      const lined = off < 4 && len < 220 && s.arrows.length === 0;
      s = g.step(1, {
        moveX: !lined && len < 120 ? (nx > 0 ? -1 : 1) : 0,
        moveY: !lined && len < 120 ? (ny > 0 ? -1 : 1) : 0,
        fire: lined && carried() > 0,
        aimX: near.x,
        aimY: near.y,
      });
      // Follow each bolt to the end of its flight, even if it kills the nearer Husk.
      for (let w = 0; w < 90 && s.arrows.length > 0; w++) {
        for (const arrow of s.arrows) pierced = Math.max(pierced, arrow.hitIds.length);
        s = g.step(1);
      }
    }

    // Burn kill: bring the nearest Husk to 16–27 health with arrows, then bomb it and keep away.
    s = g.step(1, { selectAmmo: 'arrow' });
    const target = nearest();
    if (!target) throw new Error(`no Husk left; pierced ${pierced}, tick ${s.tick}`);
    const id = target.id;
    const health = () => s.enemies.filter((e) => e.group === 'field').find((e) => e.id === id)?.health ?? 0;
    for (let t = 0; t < 600 && health() > 27; t++) {
      const e = s.enemies.filter((e) => e.group === 'field').find((en) => en.id === id);
      if (!e) break;
      // One arrow at a time, so the health steps down by 10s.
      const before = health();
      s = g.step(1, { fire: true, aimX: e.x, aimY: e.y });
      for (let w = 0; w < 30 && health() === before && s.arrows.length > 0; w++) s = g.step(1);
    }
    const beforeBomb = health();
    s = g.step(1, { selectAmmo: 'bomb' });
    let bursts = 0;
    let lastDamage = 0;
    let died = false;
    for (let t = 0; t < 900 && !died; t++) {
      const e = s.enemies.filter((e) => e.group === 'field').find((en) => en.id === id);
      if (!e) break;
      const p = s.player;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      const throwNow = bursts === 0 && s.bombs.length === 0 && dist < 70;
      s = g.step(1, {
        // Close in to throw, then back off until the burn finishes it.
        moveX: throwNow ? 0 : bursts === 0 && dist >= 70 ? (e.x > p.x ? 1 : -1) : e.x > p.x ? -1 : 1,
        moveY: throwNow ? 0 : bursts === 0 && dist >= 70 ? (e.y > p.y ? 1 : -1) : e.y > p.y ? -1 : 1,
        fire: throwNow,
        aimX: e.x,
        aimY: e.y,
      });
      bursts += s.events.bursts.length;
      for (const h of s.events.hits) if (h.target === 'enemy' && h.id === id) lastDamage = h.damage;
      died = s.events.deaths.some((d) => d.id === id);
    }
    return { pierced, beforeBomb, bursts, died, lastDamage, health: s.player.health };
  });
  expect(result.pierced).toBe(2);
  expect(result.beforeBomb).toBeGreaterThanOrEqual(16);
  expect(result.beforeBomb).toBeLessThanOrEqual(27);
  expect(result.bursts).toBe(1);
  expect(result.died).toBe(true);
  // The killing blow was a burn tick, not the burst.
  expect(result.lastDamage).toBe(3);
  expect(errors).toEqual([]);
});
