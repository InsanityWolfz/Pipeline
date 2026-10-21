import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { CLAIM_TICKS, FIXTURES } from '../../src/data/claims';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { OVERWORLD } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { LANDMARKS } from '../../src/data/landmarks';
import { menuRows } from '../../src/render/foundryLayout';
import { screenPoint, state, step } from './foundryPage';
import { boot, watchErrors } from './helpers';

// Landmarks and champions (032): walk toward the Quarry and find it (its minimap icon
// and the banner); clear and claim its pylon, send the haul home there, and fast travel
// back to it from the waystone's menu; open the Ruined Cache; and fight a champion
// spawned by the dev hook.

const T = 32;
const QUARRY_PYLON = landmarkDef('quarry').pylon ?? { tx: 0, ty: 0 };
const CACHE = landmarkDef('ruined-cache').cache ?? { tx: 0, ty: 0 };

/** Kills every guard of a landmark through the dev hook, then steps once so they're gone. */
async function clearGuards(page: Page, group: string): Promise<void> {
  await page.evaluate((g) => {
    const game = window.__GAME__;
    if (!game) throw new Error('no game');
    for (const e of game.getState().enemies.filter((x) => x.group === g)) game.setEnemyHealth(e.id, 0);
    game.step(1);
  }, group);
}

/** Presses E and clicks a menu row (of `rows`), until `done` says it took (a menu can take a frame to open). */
async function menuChoice(page: Page, rows: number, row: number, done: () => Promise<boolean>): Promise<void> {
  const r = menuRows(rows)[row];
  if (!r) throw new Error('no row');
  const p = await screenPoint(page, r.x + r.w / 2, r.y + r.h / 2);
  for (let i = 0; i < 5 && !(await done()); i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(150 * (i + 1));
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__GAME__?.step(1));
  }
}

test('walking toward the Quarry discovers it: its minimap icon appears and the banner names it', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const before = await page.evaluate(() => ({ s: window.__GAME__?.step(1), map: window.__GAME__?.ui().minimap }));
  expect(before.s?.discovered).toEqual([]);
  expect(before.map?.markers.some((m) => m.kind === 'site')).toBe(false);
  const found = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    // West along the meadow's north edge until the Quarry's south side comes into view.
    let s = g.getState();
    for (let x = 36 + h.ox; x >= 24 + h.ox && !s.discovered.includes('quarry'); x -= 2) {
      h.walkTo((x + 0.5) * 32, (25.5 + h.oy) * 32);
      s = g.getState();
    }
    return { discovered: s.discovered, landmark: s.landmarks.find((l) => l.id === 'quarry') };
  });
  expect(found.discovered).toContain('quarry');
  expect(found.landmark).toEqual({ id: 'quarry', discovered: true, claimed: false, opened: false });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.find((m) => 'landmark' in m && m.landmark === 'quarry')?.kind).toBe('site');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.banner).toBe('quarry');
  expect(errors).toEqual([]);
});

test("clear and claim the Quarry's pylon, send the haul home there, and fast travel back from the waystone's menu", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page);
  // The shrine first: the resource sites' pylons wake once it's claimed.
  await page.evaluate(() => window.__GAME__?.claim('shrine'));
  await clearGuards(page, 'quarry');
  await page.evaluate(([tx, ty]) => {
    const h = window.__helpers;
    if (!h) throw new Error('no helpers');
    h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
  }, [QUARRY_PYLON.tx, QUARRY_PYLON.ty] as const);
  await step(page, 1, { interact: true });
  const claimed = await step(page, CLAIM_TICKS + 2);
  expect(claimed.claims).toEqual(['shrine', 'quarry']);
  expect(claimed.landmarks.find((l) => l.id === 'quarry')?.claimed).toBe(true);
  // The stone port now counts two pylons.
  const stonePort = FIXTURES.find((f) => f.raw === 'stone')?.id;
  expect(claimed.ports.find((p) => p.id === stonePort)).toMatchObject({ pylons: 2, perMinute: 30 });
  // Hovering the pylon names the landmark and what it sends.
  const camX = Math.min(Math.max(claimed.player.x - VIEW_WIDTH / 2, 0), OVERWORLD.width * T - VIEW_WIDTH);
  const camY = Math.min(Math.max(claimed.player.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2, 0), OVERWORLD.height * T - VIEW_HEIGHT);
  const pylon = await screenPoint(page, (QUARRY_PYLON.tx + 0.5) * T - camX, (QUARRY_PYLON.ty + 0.5) * T - camY);
  await expect
    .poll(
      async () => {
        await page.mouse.move(pylon.x + 1, pylon.y);
        await page.mouse.move(pylon.x, pylon.y);
        await page.waitForTimeout(100);
        return page.evaluate(() => window.__GAME__?.ui().hoverDescription);
      },
      { timeout: 10_000 },
    )
    .toBe('Quarry pylon: sends stone home.');
  const held = Object.values(claimed.inventory).reduce((a, b) => a + b, 0);
  expect(held).toBeGreaterThan(0);

  // Send the haul home from the Quarry's pylon (its menu's first row).
  await menuChoice(page, 2, 0, async () => Object.keys((await state(page)).inventory).length === 0);
  const sent = await state(page);
  expect(sent.inventory).toEqual({});
  expect(Object.values(sent.stash).reduce((a, b) => a + b, 0)).toBe(held);

  // Travel to the foundry (its second row), then to the waystone.
  await menuChoice(page, 2, 1, async () => (await state(page)).room === 'foundry');
  expect((await state(page)).room).toBe('foundry');
  const way = FIXTURES.find((f) => f.kind === 'waystone');
  if (!way) throw new Error('no waystone');
  await page.evaluate(([tx, ty]) => window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32), [way.tx, way.ty] as const);
  // Two claimed pylons: E opens the waystone's menu, by landmark name; its second row is the Quarry.
  await page.keyboard.press('e');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waystone))?.map((r) => r.text)).toEqual(['Travel to Shrine', 'Travel to Quarry']);
  expect((await state(page)).room).toBe('foundry');
  await menuChoice(page, 2, 1, async () => (await state(page)).room === 'overworld');
  const there = await state(page);
  expect(there.room).toBe('overworld');
  expect({ x: there.player.x, y: there.player.y }).toEqual({ x: (QUARRY_PYLON.tx + 0.5) * T, y: (QUARRY_PYLON.ty + 1.5) * T });
  expect(errors).toEqual([]);
});

test('the Ruined Cache is sealed while its guards live, then opens with a held E, its drops on the ground', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page);
  const sealed = await page.evaluate(([tx, ty]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    // By the south road to below the cache (053), out of its guards' sight.
    h.walkTo((tx + 0.5) * 32, (ty + 6.5) * 32);
    const guards = g.getState().enemies.filter((e) => e.group === 'ruined-cache');
    // Up to the reliquary with its guards alive (they wake and come; the seal is tried at once).
    h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
    return { guards: guards.length, events: g.step(1, { interact: true }).events.sealed };
  }, [CACHE.tx, CACHE.ty] as const);
  expect(sealed.guards).toBe(5);
  expect(sealed.events).toEqual([{ site: 'ruined-cache' }]);
  await clearGuards(page, 'ruined-cache');
  const opened = await page.evaluate(
    ([tx, ty, ticks]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
      g.step(1, { interact: true });
      const s = g.step(ticks);
      return { opens: s.landmarks.find((l) => l.id === 'ruined-cache')?.opened, items: s.groundItems.length + Object.values(s.inventory).reduce((a, b) => a + b, 0) };
    },
    [CACHE.tx, CACHE.ty, LANDMARKS.cacheOpenTicks] as const,
  );
  expect(opened.opens).toBe(true);
  expect(opened.items).toBeGreaterThanOrEqual(3);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.caches['ruined-cache'], { timeout: 20_000 }).toBe('empty');
  expect(errors).toEqual([]);
});

test('a champion spawned by the dev hook is bigger, named and glowing, and dies with its guaranteed armor', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const spawned = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    const s = g.spawnChampionPack(['husk', 'husk'], 0);
    return s.enemies.filter((e) => e.group === 'dev');
  });
  const champ = spawned.find((e) => e.champion);
  if (!champ?.champion) throw new Error('no champion');
  expect(champ.maxHealth).toBe(60);
  // Drawn 1.5×, glowing, with its name over "Husk champion" (the playtest's packs may hold champions of their own).
  await expect
    .poll(async () => (await page.evaluate(() => window.__GAME__?.ui().champions))?.filter((c) => c.id === champ.id).map((c) => [c.name, c.kind, c.scale, c.glow > 0]))
    .toEqual([[champ.champion.name, 'Husk champion', 1.5, true]]);
  expect((await page.evaluate(() => window.__GAME__?.ui().champions))?.some((c) => spawned.some((e) => e.id === c.id && !e.champion))).toBe(false);
  const fought = await page.evaluate((id) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    window.__helpers?.hold('ley-bolt');
    let s = g.getState();
    let death: { champion?: true } | undefined;
    for (let t = 0; t < 3000 && !death; t++) {
      const e = s.enemies.find((x) => x.id === id);
      const p = s.player;
      if ((s.inventory[(s.hotbar.slots[s.hotbar.selected] ?? '')] ?? 0) === 0) window.__helpers?.hold((s.hotbar.slots[s.hotbar.selected] ?? '') === 'ley-bolt' ? 'arrow' : 'ley-bolt');
      const close = e ? Math.hypot(e.x - p.x, e.y - p.y) < 100 : false;
      s = g.step(1, { use: true, aimX: e?.x ?? p.x + 100, aimY: e?.y ?? p.y, moveX: close ? -1 : 0, dodge: e?.mode === 'windup' && t % 20 === 0 });
      death = s.events.deaths.find((d) => d.id === id);
      if (s.events.ko) return { ko: true, death: null, armor: 0 };
    }
    return { ko: false, death: death ?? null, armor: s.groundItems.filter((x) => x.itemId === 'unidentified-armor').length + (s.inventory['unidentified-armor'] ?? 0) };
  }, champ.id);
  expect(fought.ko).toBe(false);
  expect(fought.death?.champion).toBe(true);
  expect(fought.armor).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
