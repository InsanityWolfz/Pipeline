import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { craftMenuLines } from '../../src/render/craftMenuLayout';
import type {} from '../../src/render/testHook';

// Gathering, crafting and the three ammo, driven through window.__GAME__.
// Helpers run inside the page, so they're installed there before the game boots.

interface Helpers {
  /** Walks to just below a node and harvests it `times` times, collecting each drop. */
  harvest(nodeIndex: number, times: number): void;
  /** Walks onto every ground item. */
  collect(): void;
  /** Shoots the nearest Husk until one dies, then collects its drops. */
  killHusk(): void;
}

declare global {
  interface Window {
    __helpers?: Helpers;
  }
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

function installHelpers(): void {
  const game = () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    return g;
  };
  const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
  const walkTo = (x: number, y: number): void => {
    const g = game();
    for (let t = 0; t < 900; t++) {
      const p = g.getState().player;
      const moveX = toward(p.x, x);
      const moveY = toward(p.y, y);
      if (moveX === 0 && moveY === 0) return;
      g.step(1, { moveX, moveY });
    }
    throw new Error(`could not reach (${x}, ${y})`);
  };
  const collect = (): void => {
    const g = game();
    for (let t = 0; t < 900; t++) {
      const s = g.getState();
      const item = s.groundItems[0];
      if (!item) return;
      g.step(1, { moveX: toward(s.player.x, item.x), moveY: toward(s.player.y, item.y) });
    }
    throw new Error('could not collect the drops');
  };
  window.__helpers = {
    collect,
    harvest(nodeIndex, times) {
      const g = game();
      for (let i = 0; i < times; i++) {
        const n = g.getState().nodes[nodeIndex];
        if (!n) throw new Error(`no node ${nodeIndex}`);
        walkTo(n.x, n.y + 16);
        g.step(1, { interact: true });
        g.step(30);
        collect();
      }
    },
    killHusk() {
      const g = game();
      let s = g.getState();
      const before = s.enemies.length;
      for (let t = 0; t < 2400 && s.enemies.length === before; t++) {
        const p = s.player;
        const target = [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!target) break;
        const far = Math.hypot(target.x - p.x, target.y - p.y) > 200;
        const empty = s.tube.loaded === 0;
        s = g.step(1, {
          moveX: far ? toward(p.x, target.x) : 0,
          moveY: far ? toward(p.y, target.y) : 0,
          load: !far && empty && !s.tube.loading,
          fire: !far && !empty,
          aimX: target.x,
          aimY: target.y,
        });
      }
      collect();
    },
  };
}

async function boot(page: Page): Promise<void> {
  await page.addInitScript(installHelpers);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__ !== undefined);
}

/** Node indexes in the ruin hall: the first of each kind. */
const TREE = 0;
const RUBBLE = 3;
const REEDS = 6;
const LEY_VEIN = 9;

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
  await boot(page);
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
  await boot(page);
  // Real time first: C pauses, Esc resumes.
  await page.waitForTimeout(300);
  await page.keyboard.press('c');
  await page.waitForTimeout(100);
  const paused = await page.evaluate(() => window.__GAME__?.getState().tick);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__GAME__?.getState().tick)).toBe(paused);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__GAME__?.getState().tick)).toBeGreaterThan(paused ?? 0);

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
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  await gatherEverything(page);
  await page.evaluate(
    ([vein]) => {
      const h = window.__helpers;
      if (!h) throw new Error('no helpers');
      // Two more ley crystals for plenty of bolts, then resin for a fuse.
      h.harvest(vein, 2);
      h.killHusk();
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
      return [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    };
    const reload = () => {
      s = g.step(1, { load: true });
      for (let t = 0; t < 120 && s.tube.loading; t++) s = g.step(1);
    };

    // Pierce: back away from the two chasing Husks and fire only once the farther one
    // stands on the line through the nearer one, so one bolt can pass through both.
    s = g.step(1, { selectAmmo: 'ley-bolt' });
    reload();
    let pierced = 0;
    for (let t = 0; t < 3000 && pierced < 2 && s.enemies.length === 2; t++) {
      const p = s.player;
      const [near, far] = [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      if (!near || !far) break;
      const nx = near.x - p.x;
      const ny = near.y - p.y;
      const len = Math.hypot(nx, ny);
      // How far the farther Husk's feet are off the bolt's line, px.
      const off = Math.abs((far.x - p.x) * ny - (far.y - p.y) * nx) / len;
      const lined = off < 4 && len < 220 && s.arrows.length === 0;
      if (s.tube.loaded === 0 && !s.tube.loading) reload();
      s = g.step(1, {
        moveX: !lined && len < 120 ? (nx > 0 ? -1 : 1) : 0,
        moveY: !lined && len < 120 ? (ny > 0 ? -1 : 1) : 0,
        fire: lined && s.tube.loaded > 0,
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
    reload();
    const target = nearest();
    if (!target) throw new Error(`no Husk left; pierced ${pierced}, tick ${s.tick}`);
    const id = target.id;
    const health = () => s.enemies.find((e) => e.id === id)?.health ?? 0;
    for (let t = 0; t < 600 && health() > 27; t++) {
      const e = s.enemies.find((en) => en.id === id);
      if (!e) break;
      if (s.tube.loaded === 0) reload();
      // One arrow at a time, so the health steps down by 10s.
      const before = health();
      s = g.step(1, { fire: true, aimX: e.x, aimY: e.y });
      for (let w = 0; w < 30 && health() === before && s.arrows.length > 0; w++) s = g.step(1);
    }
    const beforeBomb = health();
    s = g.step(1, { selectAmmo: 'bomb' });
    reload();
    let bursts = 0;
    let lastDamage = 0;
    let died = false;
    for (let t = 0; t < 900 && !died; t++) {
      const e = s.enemies.find((en) => en.id === id);
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
