import { expect, test, type Page } from '@playwright/test';
import { ITEMS } from '../../src/data/items';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';
import { feedLines, restoreEntrance, toIntake, ui } from './intakePage';

// Foundry flow (028): the shrine claim brings a supply port per raw onto the
// foundry's west wall, each at ×1 and 15 a minute; a conduit from the wood port
// into a hopper feeding a cutter makes shafts; and two entrances holding arrows
// and bombs, held 120 frames, fire at their own rates. With REVIEW_SHOTS=1, the
// review screenshots in docs/review/028.

const SHOTS = 'docs/review/028';
const RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'] as const;
const ROWS: Record<string, number> = { wood: 4, stone: 6, fiber: 8, 'ley-crystal': 10 };

/** From ?playtest: claims the shrine through the hook, then walks down into the foundry. */
function claimAndEnter(page: Page) {
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    g.claim('shrine');
    h.toFoundry();
    return g.step(1);
  });
}

test('the shrine claim brings four ports at ×1; the wood port feeds a hopper and cutter, and shafts appear', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const s = await claimAndEnter(page);
  expect(s.room).toBe('foundry');
  expect(s.ports).toEqual(RAWS.map((raw) => ({ id: `${raw}-port`, raw, tx: 1, ty: ROWS[raw], pylons: 1, perMinute: 15, waiting: expect.any(Boolean) })));
  // Each port shows its raw's icon on its face and its plate.
  await expect
    .poll(async () => (await ui(page))?.ports)
    .toEqual(RAWS.map((raw) => ({ raw, icon: ITEMS[raw]?.icon, plate: '×1 pylon · 15/min' })));

  // Wood port (1, 4) → conduit (2, 4) → hopper (3, 4) → cutter (4, 4) → crate (5, 4).
  const run = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const delivered: string[] = [];
    const note = (st: ReturnType<typeof g.step>) => {
      delivered.push(...st.events.portDeliveries.map((d) => d.itemId));
      return st;
    };
    // The port has had a wood waiting since the walk down: it goes as soon as the conduit is there, so watch every tick.
    let s = g.step(0);
    for (const [pieceId, tx] of [['crate', 5], ['cutter', 4], ['hopper', 3], ['conduit', 2]] as const) {
      s = note(g.step(1, { place: { pieceId, tx, ty: 4, facing: 'right' } }));
    }
    const shafts = () => {
      const c = s.foundry.pieces.find((p) => p.tx === 5 && p.ty === 4);
      return c?.kind === 'crate' ? (c.contents.shaft ?? 0) : 0;
    };
    for (let t = 0; t < 1500 && shafts() < 4; t++) {
      s = note(g.step(1));
    }
    return { shafts: shafts(), made: s.machineMade.shaft ?? 0, delivered: [...new Set(delivered)] };
  });
  // Two woods, two shafts from each.
  expect(run.shafts).toBeGreaterThanOrEqual(4);
  expect(run.made).toBeGreaterThanOrEqual(4);
  expect(run.delivered).toEqual(['wood']);
  expect(errors).toEqual([]);
});

test('arrows and bombs in two entrances, held 120 frames, fire 8 arrows and 3 bombs; the volley goes ahead of carried bolts', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await toIntake(page);
  // 033: one core per entrance: the warden core restores the west, a Bulwark core the east.
  await restoreEntrance(page, 11);
  const opened = await restoreEntrance(page, 13);
  expect(opened.intake.entrances.map((e) => e.open)).toEqual([true, true, true]);
  await feedLines(page, [
    { tx: 11, itemId: 'arrow', amount: 'all' },
    { tx: 13, itemId: 'bomb', amount: 'all' },
  ], 10);
  const fired = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    // Ley bolts selected and carried: the volley still fires first.
    window.__helpers?.hold('ley-bolt');
    let s = g.step(0);
    const next = s.tube.next;
    const bolts = s.inventory['ley-bolt'] ?? 0;
    const aim = { aimX: s.player.x + 200, aimY: s.player.y };
    const shots: Record<string, number> = {};
    const fires: number[] = [];
    for (let t = 0; t < 120; t++) {
      s = g.step(1, { fire: true, ...aim });
      for (const e of s.events.shots) shots[e.ammoId] = (shots[e.ammoId] ?? 0) + 1;
      fires.push(...s.events.entranceFires.map((f) => f.entrance));
    }
    return { next, bolts, boltsAfter: s.inventory['ley-bolt'] ?? 0, shots, fires };
  });
  expect(fired.next).toBe('volley');
  expect(fired.shots).toEqual({ arrow: 8, bomb: 3 });
  expect(fired.boltsAfter).toBe(fired.bolts);
  // Each entrance fired on its own: the arrow one 8 times, the bomb one 3.
  expect(fired.fires.filter((e) => e === 0)).toHaveLength(8);
  expect(fired.fires.filter((e) => e === 2)).toHaveLength(3);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (028)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/028');

  test('the west wall with four ports and plates, goal 1 with the port marker, and the stone port into a hopper', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    await claimAndEnter(page);
    // Standing east of the ports, so the camera holds the whole west wall.
    await page.evaluate(() => {
      window.__helpers?.walkTo(6.5 * 32, 7.5 * 32);
      window.__GAME__?.step(1, { aimX: 6.5 * 32, aimY: 9 * 32 });
    });
    // The playtest's "Schematic revealed" banners play out first, so none covers the wall.
    await quietScreen(page);
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.ports.length).toBe(4);
    await page.screenshot({ path: `${SHOTS}/01-west-wall-ports.png` });

    // 058 dropped the port goal ("Run a supply port into your line"); the shot keeps its place in the run (images as taken on 028).
    // The tick for the goals just finished fades first, so none sits beside the unfinished goal.
    await expect.poll(async () => (await ui(page))?.objectiveTick, { timeout: 10_000 }).toBe(0);
    await page.screenshot({ path: `${SHOTS}/02-goal-port-marker.png` });

    // A conduit from the stone port (1, 6) into a hopper.
    const fed = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { place: { pieceId: 'conduit', tx: 2, ty: 6, facing: 'right' } });
      g.step(1, { place: { pieceId: 'hopper', tx: 3, ty: 6, facing: 'right' } });
      let st = g.step(1);
      const hopper = () => {
        const h = st.foundry.pieces.find((p) => p.tx === 3 && p.ty === 6);
        return h?.kind === 'hopper' ? h : null;
      };
      for (let t = 0; t < 600 && (hopper()?.count ?? 0) < 2; t++) st = g.step(1);
      return { item: hopper()?.item ?? null, count: hopper()?.count ?? 0 };
    });
    expect(fed.item).toBe('stone');
    expect(fed.count).toBeGreaterThanOrEqual(2);
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/03-stone-port-into-hopper.png` });
  });

  test('the port art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [name, file] of [['supply-port/0', '04-sheet-port'], ['supply-port/1', '05-sheet-port-lit']] as const) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });
});
