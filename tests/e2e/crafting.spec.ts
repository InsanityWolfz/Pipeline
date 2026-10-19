import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { PAUSE_MENU } from '../../src/data/hudLayout';
import { VOLUME_STEP } from '../../src/data/sounds';
import { craftMenuLines, pauseRows } from '../../src/render/craftMenuLayout';
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

test('the crafting menu keeps the world running, Esc pauses it, and the menu crafts on a click', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  // Real time first: C opens the craft menu and the world keeps ticking (020).
  await page.waitForTimeout(300);
  const tick = async () => (await page.evaluate(() => window.__GAME__?.getState().tick)) ?? 0;
  const ui = async () => page.evaluate(() => window.__GAME__?.ui());
  await page.keyboard.press('c');
  await expect.poll(async () => (await ui())?.craftOpen).toBe(true);
  const open = await tick();
  await expect.poll(tick).toBeGreaterThan(open);
  // Esc closes it; a second Esc opens the pause menu, which stops the clock until Esc again.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui())?.craftOpen).toBe(false);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui())?.paused).toBe(true);
  const paused = await tick();
  await page.waitForTimeout(500);
  expect(await tick()).toBe(paused);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui())?.paused).toBe(false);
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

test('an arrow pierces two Husks (029), and a bomb burst kills one', async ({ page }) => {
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
      const X = window.__helpers?.ox ?? 0;
      for (let t = 0; t < 200 && g && g.getState().player.x > (38 + X) * 32; t++) g.step(1, { moveX: -1, dodge: t % 40 === 0 });
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

    // Pierce (029: arrows pierce, ley bolts don't): back away from the two chasing Husks and fire only once the
    // farther one stands on the line through the nearer one, so one arrow can pass through both.
    s = g.step(1, { selectAmmo: 'arrow' });
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
      // Back away when they're close, toward the open east half of the ruin field unless they stand that way (the stair
      // mound snags chasers, and groves line the meadow); step back in when they drift off, so they never go home.
      const back = !lined && len < 120;
      const closeIn = !lined && len > 200;
      const cx = (45.5 + (window.__helpers?.ox ?? 0)) * 32 - p.x;
      const cy = 15.5 * 32 - p.y;
      const open = cx * nx + cy * ny < 0 && Math.hypot(cx, cy) > 48;
      const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 2 ? 0 : v > 0 ? 1 : -1);
      const away = open ? { moveX: sign(cx), moveY: sign(cy) } : { moveX: sign(-nx), moveY: sign(-ny) };
      // In between, strafe across their line (turning back every so often) until the far one lines up behind the near.
      const turn = Math.floor(t / 120) % 2 === 0 ? 1 : -1;
      const strafe = !lined && !back && !closeIn;
      s = g.step(1, {
        moveX: back ? away.moveX : closeIn ? sign(nx) : strafe ? sign(-ny * turn) : 0,
        moveY: back ? away.moveY : closeIn ? sign(ny) : strafe ? sign(nx * turn) : 0,
        fire: lined && carried() > 0,
        aimX: near.x,
        aimY: near.y,
      });
      // Follow each arrow to the end of its flight, even if it kills the nearer Husk.
      for (let w = 0; w < 90 && s.arrows.length > 0; w++) {
        for (const arrow of s.arrows) pierced = Math.max(pierced, arrow.hitIds.length);
        s = g.step(1);
      }
    }

    // Burst kill (029: no burn): bring the nearest Husk to 15 health or less with arrows, then bomb it.
    s = g.step(1, { selectAmmo: 'arrow' });
    const target = nearest();
    if (!target) throw new Error(`no Husk left; pierced ${pierced}, tick ${s.tick}`);
    const id = target.id;
    const health = () => s.enemies.filter((e) => e.group === 'field').find((e) => e.id === id)?.health ?? 0;
    for (let t = 0; t < 600 && health() > 15; t++) {
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
        // Close in to throw, then back off.
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
  expect(result.beforeBomb).toBeGreaterThan(0);
  expect(result.beforeBomb).toBeLessThanOrEqual(15);
  expect(result.bursts).toBe(1);
  expect(result.died).toBe(true);
  // The killing blow was the burst itself: there's no burn (029).
  expect(result.lastDamage).toBe(15);
  expect(errors).toEqual([]);
});

test('the pause menu toggles the sound and steps the volume, then resumes', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().paused)).toBe(true);
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / VIEW_WIDTH;
  const rows = pauseRows();
  const at = async (x: number, y: number) => {
    await page.mouse.click(box.x + x * zoom, box.y + y * zoom);
    await page.waitForTimeout(60);
  };
  const sound = () => page.evaluate(() => window.__GAME__?.sound());
  const before = await sound();
  const [soundRow, volumeRow, resumeRow] = rows;
  if (!soundRow || !volumeRow || !resumeRow || !before) throw new Error('no rows');
  await at(soundRow.x + 40, soundRow.y + 10);
  expect((await sound())?.muted).toBe(!before.muted);
  await at(volumeRow.x + PAUSE_MENU.volume.down, volumeRow.y + 10);
  expect((await sound())?.volume).toBeCloseTo(Math.max(0, before.volume - VOLUME_STEP));
  await at(volumeRow.x + PAUSE_MENU.volume.up, volumeRow.y + 10);
  expect((await sound())?.volume).toBeCloseTo(before.volume);
  await at(resumeRow.x + 40, resumeRow.y + 10);
  expect(await page.evaluate(() => window.__GAME__?.ui().paused)).toBe(false);
  expect(errors).toEqual([]);
});
