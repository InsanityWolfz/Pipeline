import { expect, test, type Page } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { TILE_SIZE, VIEW_WIDTH } from '../../src/data/config';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { BOSS_BAR_FRAME, MENU_MOTION } from '../../src/data/hudLook';
import { bossBarBottom } from '../../src/render/bossLook';
import { boot, watchErrors } from './helpers';
import { craftRow, openCrafting } from './craftPage';
import { screenPoint } from './foundryPage';
import { drawn, frames, openWorld, pixels, setLook, toRegion } from './lightingPage';
import { bootSandbox, hidePanel } from './sandboxPage';

// 081: HUD polish. Menus open in 120 ms of tween time and take input from their first frame; reduced motion lands at
// once; the HUD and an open menu are still at rest, with no objects, tweens or redraws piling up; the boss bar redraws
// only on a change; and the HUD reads the same in the dark Stormcrown as in Region 1.

const ui = (page: Page) =>
  page.evaluate(() => {
    const u = window.__GAME__?.ui();
    if (!u) throw new Error('no game');
    return u;
  });

/** The field start with a tree's wood in hand, so the shaft row can be crafted. */
async function fieldWithWood(page: Page): Promise<void> {
  await boot(page);
  await page.evaluate(() => {
    window.__GAME__?.step(0);
    window.__helpers?.harvest(0, 1);
  });
  expect((await page.evaluate(() => window.__GAME__?.getState().inventory.wood)) ?? 0).toBeGreaterThan(0);
}

test('the craft menu opens in 120 ms of tween time, taking a click and Esc on its very first frame', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await fieldWithWood(page);
  // Slowed to a tenth, the open is watched frame by frame: running, then settled at 120 ms, never past 150.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.1));
  const opens = (await ui(page)).menuMotion.opens;
  await page.keyboard.press('c');
  const seen = await page.evaluate(async (before) => {
    const out: { running: boolean; ms: number; alpha: number; rise: number }[] = [];
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const m = window.__GAME__?.ui().menuMotion;
      if (!m || m.opens === before) continue;
      out.push({ running: m.running, ms: m.ms, alpha: m.alpha, rise: m.rise });
      if (!m.running) break;
    }
    return out;
  }, opens);
  expect((await ui(page)).menuMotion.menu).toBe('craft');
  expect(seen.some((s) => s.running && s.alpha < 1 && s.rise > 0)).toBe(true);
  const last = seen.at(-1);
  expect(last).toEqual({ running: false, ms: MENU_MOTION.openMs, alpha: 1, rise: 0 });
  expect(Math.max(...seen.map((s) => s.ms))).toBeLessThanOrEqual(MENU_MOTION.maxMs);
  // The layout ui() reports never moved with the motion.
  const row = await craftRow(page, 'shaft');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page)).craftOpen).toBe(false);

  // Frozen on its first frame (tweens stopped): a click on the row crafts, and Esc closes it.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
  await openCrafting(page);
  const first = (await ui(page)).menuMotion;
  expect(first).toMatchObject({ running: true, ms: 0, alpha: 0, rise: MENU_MOTION.rise });
  expect((await craftRow(page, 'shaft')).y).toBe(row.y);
  const wood = (await page.evaluate(() => window.__GAME__?.getState().inventory.wood)) ?? 0;
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.step(1).inventory.wood)) ?? 0).toBe(wood - 1);
  expect((await ui(page)).menuMotion.running).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page)).craftOpen).toBe(false);
  // Closed at once: nothing of the open left running.
  expect((await ui(page)).menuMotion).toMatchObject({ running: false, alpha: 1, rise: 0 });
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  expect(errors).toEqual([]);
});

test('a hovered row’s rim fades in under its icons and words, never over them', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await fieldWithWood(page);
  await openCrafting(page);
  await expect.poll(async () => (await ui(page)).menuMotion.running).toBe(false);
  const row = await craftRow(page, 'shaft');
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / VIEW_WIDTH;
  const box = { x: Math.round((row.x + 2) * k), y: Math.round((row.y + 2) * k), w: Math.round((row.w - 40) * k), h: Math.round((row.h - 4) * k) };
  /** The row's bright pixels: its words and the icons' highlights. */
  const bright = async () => (await pixels(page, await page.screenshot(), box)).filter((p) => (p[0] ?? 0) + (p[1] ?? 0) + (p[2] ?? 0) > 540).length;
  await frames(page, 2);
  const plain = await bright();
  expect(plain).toBeGreaterThan(20);
  const hovers = (await ui(page)).menuMotion.hovers;
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.move(p.x, p.y);
  await expect.poll(async () => (await ui(page)).menuMotion.hovers).toBeGreaterThan(hovers);
  await frames(page, 12);
  expect(await bright()).toBeGreaterThanOrEqual(Math.round(plain * 0.8));
  expect(errors).toEqual([]);
});

test('a row the cursor leaves keeps its rim a frame later and fades it out, down the menu and back up', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => window.__GAME__?.step(1));
  await openCrafting(page);
  await expect.poll(async () => (await ui(page)).menuMotion.running).toBe(false);
  const rows = (await ui(page)).craftMenu?.rows.filter((r) => r.shown).slice(0, 3) ?? [];
  expect(rows.length).toBe(3);
  const centre = (r: { x: number; y: number; w: number; h: number }) => screenPoint(page, r.x + r.w / 2, r.y + r.h / 2);
  let p = await centre(rows[0] ?? { x: 0, y: 0, w: 0, h: 0 });
  await page.mouse.move(p.x, p.y);
  await expect.poll(async () => (await ui(page)).menuMotion.rims.lit).toBe(1);
  for (const i of [1, 2, 1, 0]) {
    const before = (await ui(page)).menuMotion.rims.row;
    // The tween clock slowed, so the frame after the move is still inside the 80 ms however long the page takes to look.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    p = await centre(rows[i] ?? { x: 0, y: 0, w: 0, h: 0 });
    await page.mouse.move(p.x, p.y);
    // The first frame the new row lights: the old row's rim is still showing.
    const first = await page.evaluate(async (was) => {
      for (let k = 0; k < 200; k++) {
        await new Promise((r) => requestAnimationFrame(r));
        const rims = window.__GAME__?.ui().menuMotion.rims;
        if (rims && rims.row !== was) return rims;
      }
      return null;
    }, before);
    expect(first?.fading ?? 0, `leaving for row ${i}`).toBeGreaterThan(0);
    expect(first?.lit ?? 1, `row ${i} fading in`).toBeLessThan(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await expect.poll(async () => (await ui(page)).menuMotion.rims).toMatchObject({ lit: 1, fading: 0 });
  }
  expect(errors).toEqual([]);
});

test('with reduced motion the menu is whole and in place on its first frame', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fieldWithWood(page);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
  await openCrafting(page);
  expect((await ui(page)).menuMotion).toMatchObject({ menu: 'craft', reduced: true, running: false, alpha: 1, rise: 0 });
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  expect(errors).toEqual([]);
});

/** What must stay flat while nothing happens: the redraw counts, the live tweens and the game objects, and the open's state. */
async function rest(page: Page) {
  const u = await ui(page);
  return { draws: u.hudDraws, motion: { running: u.menuMotion.running, alpha: u.menuMotion.alpha, rise: u.menuMotion.rise } };
}

test('the HUD alone and each menu open are still at rest: no redraws, tweens or objects pile up over 120 frames', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await fieldWithWood(page);
  // The sim held still (the test hook has the ticks), so only the render runs.
  await page.evaluate(() => window.__GAME__?.step(1));
  const menus: [string, string | null][] = [
    ['hud', null],
    ['craft', 'c'],
    ['inventory', 'i'],
    ['talents', 't'],
  ];
  for (const [name, key] of menus) {
    if (key) {
      await page.keyboard.press(key);
      await expect.poll(async () => (await ui(page)).menuMotion.menu).toBe(name);
      await expect.poll(async () => (await ui(page)).menuMotion.running).toBe(false);
    }
    // Whatever the last moment started (the harvest's popups and XP tick, the open) has played out.
    await expect.poll(async () => {
      const a = await rest(page);
      await frames(page, 30);
      return JSON.stringify(await rest(page)) === JSON.stringify(a);
    }, { timeout: 60_000 }).toBe(true);
    const before = await rest(page);
    await frames(page, 120);
    const after = await rest(page);
    expect(after, name).toEqual(before);
    if (key) {
      await page.keyboard.press('Escape');
      await frames(page, 4);
    }
  }
  expect(errors).toEqual([]);
});

test('the boss bar sits in its frame at its old box and redraws only when the fight changes', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await hidePanel(page);
  const boss = { x: (ANVIL_ARENA.start.tx + 0.5) * TILE_SIZE, y: (ANVIL_ARENA.start.ty + 0.5) * TILE_SIZE };
  await page.evaluate((b) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    h.enterArena('anvil-hall');
    h.walkTo(b.x, b.y + 5 * 32);
  }, boss);
  await expect.poll(async () => (await ui(page)).bossBar?.name, { timeout: 15_000 }).toBe('Forgewright');
  // Its box as on main: 244 x 10 round the 240 x 6 fill, so the camera's lift doesn't move.
  const B = HOLLOWS_LOOK.bossBar;
  expect([BOSS_BAR_FRAME.w, BOSS_BAR_FRAME.h]).toEqual([B.w + 4 * B.border, B.h + 4 * B.border]);
  expect(bossBarBottom(false)).toBe(B.top + B.h + 2 * B.border);
  // The sim held: the bar doesn't redraw frame after frame.
  await page.evaluate(() => window.__GAME__?.step(1));
  await frames(page, 4);
  const still = (await ui(page)).hudDraws.bossBar;
  await frames(page, 60);
  expect((await ui(page)).hudDraws.bossBar).toBe(still);
  // A hit: it redraws.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const f = g?.getState().enemies.find((e) => e.enemyId === 'forgewright');
    if (!g || !f) throw new Error('no boss');
    g.setEnemyHealth(f.id, f.health - 500);
    g.step(1);
  });
  await drawn(page);
  await frames(page, 2);
  expect((await ui(page)).hudDraws.bossBar).toBeGreaterThan(still);
  expect(errors).toEqual([]);
});

/** Mean per-channel difference between two equal-length pixel lists. */
const diff = (a: number[][], b: number[][]): number =>
  a.reduce((s, p, i) => s + Math.abs((p[0] ?? 0) - (b[i]?.[0] ?? 0)) + Math.abs((p[1] ?? 0) - (b[i]?.[1] ?? 0)) + Math.abs((p[2] ?? 0) - (b[i]?.[2] ?? 0)), 0) / (3 * Math.max(1, a.length));

/** The HP bar's, a carried cell's, the tube card's and an open craft row's pixels, view boxes from ui(), inset off the world showing round them. */
async function hudPieces(page: Page): Promise<Record<string, number[][]>> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = size.width / VIEW_WIDTH;
  const at = (b: { x: number; y: number; w: number; h: number }, inset = 3) => ({ x: Math.round((b.x + inset) * k), y: Math.round((b.y + inset) * k), w: Math.round((b.w - 2 * inset) * k), h: Math.round((b.h - 2 * inset) * k) });
  const u = await ui(page);
  const shot = await page.screenshot();
  const hp = u.health.box;
  const out: Record<string, number[][]> = {
    hp: await pixels(page, shot, { x: Math.round((hp.x + 8) * k), y: Math.round((hp.y + 4) * k), w: Math.round(hp.w * 0.5 * k), h: Math.round(8 * k) }),
    tube: await pixels(page, shot, at(u.hud?.tubeSlot ?? { x: 0, y: 0, w: 0, h: 0 })),
  };
  const cell = u.hud?.hotbar;
  if (cell?.shown) out.cell = await pixels(page, shot, at({ x: cell.x, y: cell.y, w: 24, h: 28 }));
  return out;
}

test('the polished HUD and an open craft row read the same in the Stormcrown as in Region 1 (074’s method, on High)', async ({ page }) => {
  test.setTimeout(480_000);
  const errors = watchErrors(page);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const seen: Record<string, number[][]>[] = [];
  for (const region of ['region1', 'stormcrown'] as const) {
    await toRegion(page, region);
    await page.evaluate(() => {
      window.__GAME__?.setPlayerHealth(100);
      window.__GAME__?.step(1);
    });
    await drawn(page);
    const pieces = await hudPieces(page);
    await openCrafting(page);
    await expect.poll(async () => (await ui(page)).menuMotion.running).toBe(false);
    await frames(page, 2);
    const row = (await ui(page)).craftMenu?.rows.find((r) => r.shown);
    if (!row) throw new Error('no craft row');
    const size = page.viewportSize() ?? { width: 1280, height: 720 };
    const k = size.width / VIEW_WIDTH;
    pieces.row = await pixels(page, await page.screenshot(), { x: Math.round((row.x + 2) * k), y: Math.round((row.y + 2) * k), w: Math.round((row.w - 4) * k), h: Math.round((row.h - 4) * k) });
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await ui(page)).craftOpen).toBe(false);
    seen.push(pieces);
  }
  const [r1, storm] = seen;
  for (const piece of ['hp', 'tube', 'row', 'cell']) {
    const a = r1?.[piece];
    const b = storm?.[piece];
    if (piece === 'cell' && !a) continue;
    expect(a?.length ?? 0, piece).toBeGreaterThan(0);
    expect(diff(a ?? [], b ?? []), piece).toBeLessThan(3);
  }
  expect(errors).toEqual([]);
});
