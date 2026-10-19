import { expect, test, type Page } from '@playwright/test';
import { SPREAD_STEP } from '../../src/data/foundry';
import { boot, cameraSettled, watchErrors } from './helpers';
import { centre, clickBar, clickTile, screenPoint, state, step, STAND, toggleBuild } from './foundryPage';
import { feedLines, ui } from './intakePage';
import { researchListLayout } from '../../src/render/researchLayout';

// Research as restoration (033): diagrams on the foundry restored at E with cores,
// parts and schematics. With ?playtest: the west cap's panel opens on E and E again
// restores it with the warden core, and two entrances fire a two-round spread; the
// east cap's Restore, clicked, takes a Bulwark core; the pipe's Reservoir I lets an
// entrance fill to 45; the splitter, revealed by banking its schematic, is restored at
// its wall panel and placed; J opens the research list, which Esc and J close. And a
// schematic lying in the field stands in its light pillar, pings the minimap, and is
// "Unknown schematic" until banked.

/** Into the foundry from ?playtest and to a point, the camera settled. */
async function foundryAt(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([x, y]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo(x, y);
    g.step(1);
  }, [x, y] as const);
}

/** E opens the restore panel at the diagram in reach: pressed until the panel shows `node`. */
async function openPanel(page: Page, node: string): Promise<void> {
  await expect
    .poll(async () => {
      if ((await ui(page))?.restorePanel?.node === node) return true;
      await page.keyboard.press('e');
      return (await ui(page))?.restorePanel?.node === node;
    })
    .toBe(true);
}

/** Steps a tick at a time until a node reads restored (the panel's command reaches the sim on the next tick). */
const restored = (page: Page, node: string) =>
  expect.poll(async () => (await step(page, 1)).research.nodes.find((n) => n.id === node)?.state).toBe('restored');

test('the west cap restores with the warden core (E, then E again), two entrances fire a spread, and the east cap takes a Bulwark core', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await foundryAt(page, 11.5 * 32, 1.5 * 32);
  await openPanel(page, 'entrance-2');
  const panel = (await ui(page))?.restorePanel;
  expect(panel).toMatchObject({ name: 'Second entrance', effect: 'Opens one more intake entrance.', action: 'Restore', enabled: true });
  expect(panel?.cost).toEqual([{ itemId: 'warden-core', text: '5/1', missing: false }]);
  await page.keyboard.press('e');
  await restored(page, 'entrance-2');
  let s = await state(page);
  expect(s.intake.entrances.map((e) => e.open)).toEqual([true, true, false]);
  expect(s.inventory['warden-core']).toBe(4);
  await expect.poll(async () => (await ui(page))?.restorePanel ?? null).toBeNull();

  // Two entrances fed with arrows: a two-round spread.
  await feedLines(page, [
    { tx: 11, itemId: 'arrow', amount: 'half' },
    { tx: 12, itemId: 'arrow', amount: 'all' },
  ], 3);
  const shot = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    const at = g.step(1, { selectAmmo: 'ley-bolt' });
    const before = new Set(at.arrows.map((a) => a.id));
    const out = g.step(1, { fire: true, aimX: at.player.x + 160, aimY: at.player.y });
    return { count: out.tube.shotCount, from: out.tube.fromReservoir, fresh: out.arrows.filter((a) => !before.has(a.id)).map((a) => Math.round((Math.atan2(a.dy, a.dx) * 1800) / Math.PI) / 10).sort((a, b) => a - b) };
  });
  expect(shot).toEqual({ count: 2, from: true, fresh: [-SPREAD_STEP / 2, SPREAD_STEP / 2] });

  // The east cap now shows the third entrance, which costs a Bulwark core; its Restore row, clicked, restores it.
  await foundryAt(page, 13.5 * 32, 1.5 * 32);
  await openPanel(page, 'entrance-3');
  const east = (await ui(page))?.restorePanel;
  expect(east?.cost).toEqual([{ itemId: 'bulwark-core', text: '2/1', missing: false }]);
  if (!east) throw new Error('no panel');
  const p = await screenPoint(page, east.restore.x + east.restore.w / 2, east.restore.y + east.restore.h / 2);
  await page.mouse.click(p.x, p.y);
  await restored(page, 'entrance-3');
  s = await state(page);
  expect(s.intake.entrances.map((e) => e.open)).toEqual([true, true, true]);
  expect([s.inventory['warden-core'], s.inventory['bulwark-core']]).toEqual([4, 1]);
  expect(errors).toEqual([]);
});

test('Reservoir I at the pipe raises the cap to 45, and a line fills an entrance to it', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await foundryAt(page, 12.5 * 32, 1.5 * 32);
  await openPanel(page, 'reservoir-1');
  expect((await ui(page))?.restorePanel).toMatchObject({ name: 'Reservoir I', effect: 'Each entrance holds 45 rounds.', cost: [{ itemId: 'ancient-gear', text: '10/4', missing: false }] });
  await page.keyboard.press('e');
  await restored(page, 'reservoir-1');
  expect((await state(page)).research.entranceCap).toBe(45);
  const fed = await feedLines(page, [{ tx: 12, itemId: 'arrow', amount: 'all' }], 45);
  expect(fed.intake.entrances[1]).toMatchObject({ ammo: 'arrow', count: 45, cap: 45 });
  // Full at 45: the line backs up.
  const later = await step(page, 60);
  expect(later.intake.entrances[1]?.count).toBe(45);
  expect(errors).toEqual([]);
});

test("the splitter's schematic, banked on the way in, reveals its panel; restored there, it joins the build bar and is placed", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const before = await state(page);
  expect(before.research.nodes.find((n) => n.id === 'splitter')?.state).toBe('hidden');
  expect(before.unlocked).not.toContain('splitter');
  // Walking into the foundry banks the haul, and the splitter's schematic reveals its node; once the foundry is on
  // show (after the door's fade) the new diagrams shimmer in. Tweens slowed so the shimmer is still running when polled.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.1));
  await page.evaluate(() => window.__helpers?.toFoundry());
  expect((await state(page)).research.nodes.find((n) => n.id === 'splitter')?.state).toBe('revealed');
  await expect.poll(async () => (await ui(page))?.research.effects ?? 0).toBeGreaterThan(0);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await foundryAt(page, 17.5 * 32, 1.5 * 32);
  await expect.poll(async () => (await ui(page))?.research.diagrams.some((d) => d.node === 'splitter')).toBe(true);
  await openPanel(page, 'splitter');
  expect((await ui(page))?.restorePanel?.cost).toEqual([
    { itemId: 'schematic-splitter', text: '1/1', missing: false },
    { itemId: 'ancient-gear', text: '10/2', missing: false },
  ]);
  await page.keyboard.press('e');
  await restored(page, 'splitter');
  const s = await state(page);
  expect(s.inventory).toMatchObject({ 'schematic-splitter': 0, 'ancient-gear': 8 });
  expect(s.unlocked).toContain('splitter');
  await expect.poll(async () => (await ui(page))?.research.restored).toContain('splitter');

  // Placed with the mouse from the Logistics group, facing up.
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [centre(STAND.tx, STAND.ty).x, centre(STAND.tx, STAND.ty).y] as const);
  // A long ease under load needs more than the default.
  await cameraSettled(page, 15_000);
  await toggleBuild(page);
  await expect.poll(async () => (await ui(page))?.buildBar?.cells.some((c) => c.pieceId === 'splitter')).toBe(true);
  await clickBar(page, 'splitter');
  await clickTile(page, STAND.tx + 2, STAND.ty);
  await expect.poll(async () => (await step(page, 1)).foundry.pieces.find((p) => p.pieceId === 'splitter')).toMatchObject({ kind: 'splitter', tx: STAND.tx + 2, ty: STAND.ty });
  expect(errors).toEqual([]);
});

test('J opens the research list anywhere; Esc closes it, and J again; it never pauses', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.keyboard.press('j');
  await expect.poll(async () => (await ui(page))?.researchList.open).toBe(true);
  const list = (await ui(page))?.researchList;
  expect(list?.groups.map((g) => g.label)).toEqual(['Intake', 'Walls', 'Sealed wing']);
  const rows = list?.groups.flatMap((g) => g.rows) ?? [];
  expect(rows.find((r) => r.id === 'entrance-2')).toMatchObject({ name: 'Second entrance', state: 'ready', cost: ['5/1'], where: 'on an intake cap' });
  // Not banked yet: the schematics' nodes are lost.
  expect(rows.find((r) => r.id === 'splitter')).toMatchObject({ name: 'Lost schematic', state: 'hidden', cost: [] });
  expect((await ui(page))?.paused).toBe(false);
  // The world keeps running in real time with it open (nothing has taken the clock off the real-time loop yet).
  const tick = (await state(page)).tick;
  await expect.poll(async () => (await state(page)).tick).toBeGreaterThan(tick + 5);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.researchList.open).toBe(false);
  expect((await ui(page))?.paused).toBe(false);
  await page.keyboard.press('j');
  await expect.poll(async () => (await ui(page))?.researchList.open).toBe(true);
  await page.keyboard.press('j');
  await expect.poll(async () => (await ui(page))?.researchList.open).toBe(false);
  expect(errors).toEqual([]);
});

test('the open list never takes clicks meant for the world: a press on it still fires', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page);
  // On the real-time clock (no step yet), so the mouse drives the tube as in play.
  await page.keyboard.press('j');
  await expect.poll(async () => (await ui(page))?.researchList.open).toBe(true);
  const { panel } = researchListLayout();
  const centre = await screenPoint(page, panel.x + panel.w / 2, panel.y + panel.h / 2);
  const before = await state(page);
  expect(before.inventory.arrow ?? 0).toBeGreaterThan(0);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).inventory.arrow ?? 0, { timeout: 15_000 }).toBeLessThan(before.inventory.arrow ?? 0);
  await page.mouse.up();
  expect((await ui(page))?.researchList.open).toBe(true);
  expect(errors).toEqual([]);
});

test('a schematic in the field stands in a light pillar and pings the minimap; it is "Unknown schematic" until banked', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const at = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const s = g.step(1);
    g.drop('schematic-merger', s.player.x + 80, s.player.y);
    return { x: s.player.x + 80, y: s.player.y };
  });
  await expect.poll(async () => (await ui(page))?.schematics.pillars.length).toBe(1);
  await expect.poll(async () => (await ui(page))?.minimap.markers.some((m) => m.kind === 'schematic')).toBe(true);
  const picked = await page.evaluate(([x, y]) => {
    window.__helpers?.walkTo(x, y);
    return window.__GAME__?.step(1);
  }, [at.x, at.y] as const);
  expect(picked?.inventory['schematic-merger']).toBe(1);
  await expect.poll(async () => (await ui(page))?.schematics.banner).toEqual({ kicker: 'Schematic found', name: 'Unknown schematic' });
  expect((await ui(page))?.pickupFeed[0]).toEqual({ itemId: 'unknown-schematic', count: 1 });
  expect((await ui(page))?.schematics.pillars).toEqual([]);
  // Banked by walking into the foundry: its node is revealed, and the banner names it.
  await page.evaluate(() => window.__helpers?.toFoundry());
  const s = await state(page);
  expect(s.research.nodes.find((n) => n.id === 'merger')?.state).toBe('revealed');
  expect(s.research.schematics.banked).toContain('schematic-merger');
  await expect.poll(async () => (await ui(page))?.schematics.banner?.name, { timeout: 15_000 }).toBe('Schematic: Merger');
  expect(errors).toEqual([]);
});
