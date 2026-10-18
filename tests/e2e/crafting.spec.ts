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

test('bombs burst and burn Husks, and ley bolts hit them', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  await gatherEverything(page);
  await page.evaluate(() => window.__helpers?.killHusk());
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const r of ['casing', 'fuse', 'ley-shard', 'bomb', 'ley-bolt']) g.craft(r);

    /** Fires the selected ammo at the nearest Husk for up to `ticks`, reloading when empty. */
    const fireAtPack = (ammo: string, ticks: number) => {
      let s = g.step(1, { selectAmmo: ammo });
      let burnt = false;
      let bursts = 0;
      let boltHits = 0;
      for (let t = 0; t < ticks; t++) {
        const p = s.player;
        const target = [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!target) break;
        const dist = Math.hypot(target.x - p.x, target.y - p.y);
        const empty = s.tube.loaded === 0;
        s = g.step(1, {
          moveX: dist > 150 ? (target.x > p.x ? 1 : -1) : dist < 80 ? (target.x > p.x ? -1 : 1) : 0,
          moveY: dist > 150 ? (target.y > p.y ? 1 : -1) : 0,
          load: empty && !s.tube.loading,
          fire: !empty && dist <= 150,
          aimX: target.x,
          aimY: target.y,
        });
        burnt ||= s.enemies.some((e) => e.burnTicks > 0);
        bursts += s.events.bursts.length;
        for (const a of s.arrows) if (a.ammoId === 'ley-bolt') boltHits = Math.max(boltHits, a.hitIds.length);
      }
      return { burnt, bursts, boltHits, s };
    };
    // Bolts first: the bombs and their burns can finish off the pack.
    const bolts = fireAtPack('ley-bolt', 400);
    const bombs = fireAtPack('bomb', 400);
    return {
      burnt: bombs.burnt,
      bursts: bombs.bursts,
      boltHits: bolts.boltHits,
      bombsLeft: bombs.s.inventory.bomb ?? 0,
      ammo: bombs.s.tube.ammo,
    };
  });
  expect(result.bursts).toBe(2);
  expect(result.burnt).toBe(true);
  expect(result.boltHits).toBeGreaterThanOrEqual(1);
  expect(result.ammo).toBe('bomb');
  expect(errors).toEqual([]);
});
