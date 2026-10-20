import { expect, test, type Page } from '@playwright/test';
import { SPRITES } from '../../src/data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import type { BottomHudState } from '../../src/render/HudView';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';
import { feedLines, restoreEntrance, toIntake } from './intakePage';

// The bottom HUD (025, 047): the carried bar centred along the bottom (keys 1–5, right
// click), and the intake's bar (the tube slot) centred above it showing what the next
// left click fires (hud.active): the whole volley, or the fist. With REVIEW_SHOTS=1, the
// review screenshots in docs/review/025.

const SHOTS = 'docs/review/025';

/** The bottom HUD as drawn, once the scene has drawn a frame showing `labels` in the tube slot. */
async function hudShowing(page: Page, labels: string[]): Promise<BottomHudState> {
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.tubeSlot.labels).toEqual(labels);
  const hud = await page.evaluate(() => window.__GAME__?.ui().hud);
  if (!hud) throw new Error('no HUD');
  return hud;
}

type Box = { x: number; y: number; w: number; h: number };

/** Centred within 1 px of the view's middle, and inside the 640×360 view. */
function expectCentred(box: Box): void {
  expect(Math.abs(box.x + box.w / 2 - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.w).toBeLessThanOrEqual(VIEW_WIDTH);
  expect(box.y + box.h).toBeLessThanOrEqual(VIEW_HEIGHT);
}

/** Both rows centred, the tube slot just above the hotbar row, the row `margin` px above the bottom. */
function expectLayout(hud: BottomHudState): void {
  expectCentred(hud.hotbar);
  expectCentred(hud.tubeSlot);
  expect(hud.hotbar.y + hud.hotbar.h).toBe(VIEW_HEIGHT - HUD_LAYOUT.margin);
  expect(hud.tubeSlot.y + hud.tubeSlot.h).toBe(hud.hotbar.y - HUD_LAYOUT.gap);
  // Each label stays labelPad px clear of its well's ring on both sides.
  const S = HUD_LAYOUT.tubeSlot;
  hud.tubeSlot.labelBoxes.forEach((b, i) => {
    const unitX = hud.tubeSlot.x + i * (S.w + HUD_LAYOUT.gap);
    expect(b.x).toBeGreaterThanOrEqual(unitX + S.wellInset + S.labelPad);
    expect(b.x + b.w).toBeLessThanOrEqual(unitX + S.w - S.wellInset - S.labelPad);
  });
}

/** From the field start, fires every carried arrow east, so the next press is a punch. */
function spendArrows(page: Page) {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.step(0);
    const aim = { aimX: s.player.x + 100, aimY: s.player.y - 20 };
    for (let t = 0; t < 2000 && (s.inventory.arrow ?? 0) > 0; t++) s = g.step(1, { use: true, ...aim });
    return g.step(1, aim);
  });
}

/** From ?playtest: restores the west entrance (033) and feeds every carried arrow west and every bomb into the centre, then walks out to the meadow. */
async function mixedVolley(page: Page) {
  await toIntake(page);
  await restoreEntrance(page, 11);
  const fed = await feedLines(page, [
    { tx: 11, itemId: 'arrow', amount: 'all' },
    { tx: 12, itemId: 'bomb', amount: 'all' },
  ], 20);
  return { fed, out: await page.evaluate(() => {
    window.__helpers?.toHall();
    return window.__GAME__?.step(1);
  }) };
}

test('the carried bar holds the arrows, and before attuning the intake bar shows them too; spent, the arrows\' slot shows empty and the bar the fist; both rows centred (047, 047.9)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  const arrows = s?.inventory.arrow ?? 0;
  expect(arrows).toBeGreaterThan(0);
  // 047.9: before the tube attunes, left click fires the selected carried round, so the intake bar shows it.
  expect(s?.link.attuned).toBe(false);
  expect(s?.hud.active).toEqual({ kind: 'carried', ammoId: 'arrow', count: arrows });
  const carried = await hudShowing(page, [String(arrows)]);
  expect(carried.tubeSlot.icons).toEqual([SPRITES.iconArrow]);
  expect(carried.hotbar.shown).toBe(true);
  expect(carried.hotbar.selected).toBe(0);
  expect(carried.hotbar.slots[0]).toEqual({ itemId: 'arrow', count: arrows, empty: false });
  expectLayout(carried);

  // Key 2 selects the second slot: the highlight moves to the second cell.
  await page.evaluate(() => window.__GAME__?.step(1, { selectSlot: 1 }));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.hotbar.selected).toBe(1);
  await page.evaluate(() => window.__GAME__?.step(1, { selectSlot: 0 }));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.hotbar.selected).toBe(0);

  const spent = await spendArrows(page);
  expect(spent.inventory.arrow ?? 0).toBe(0);
  expect(spent.hotbar.slots[0]).toBe('arrow');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.hotbar.slots[0]).toEqual({ itemId: 'arrow', count: 0, empty: true });
  const fist = await hudShowing(page, [HUD_LAYOUT.tubeSlot.melee]);
  expect(fist.hotbar.shown).toBe(true);
  expectLayout(fist);
  expect(errors).toEqual([]);
});

test('before the tube, the hotbar row is hidden and the tube slot shows only the fist', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  expect(s?.hasTube).toBe(false);
  expect(s?.hud.active).toEqual({ kind: 'melee' });
  const hud = await hudShowing(page, [HUD_LAYOUT.tubeSlot.melee]);
  expect(hud.hotbar.shown).toBe(false);
  expect(hud.tubeSlot.icons).toEqual([SPRITES.hudFist]);
  expectLayout(hud);
  expect(errors).toEqual([]);
});

test('an arrow and a bomb entrance show as the whole volley, each with its count; building hides the row', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const { fed, out } = await mixedVolley(page);
  expect(fed.inventory.arrow ?? 0).toBe(0);
  if (!out) throw new Error('no state');
  const [west, centre] = out.intake.entrances;
  const counts = [west?.count ?? 0, centre?.count ?? 0];
  expect(out.hud.active).toEqual({
    kind: 'volley',
    rounds: [
      { ammoId: 'arrow', count: counts[0] },
      { ammoId: 'bomb', count: counts[1] },
    ],
  });
  const hud = await hudShowing(page, counts.map(String));
  expect(hud.tubeSlot.icons).toEqual([SPRITES.iconArrow, SPRITES.iconBomb]);
  expectLayout(hud);
  // What it showed is what fires: one arrow and one bomb from the entrances.
  const shot = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.step(0).player;
    return g.step(1, { fire: true, aimX: p.x + 120, aimY: p.y });
  });
  expect(shot?.tube.fromReservoir).toBe(true);
  expect(shot?.tube.shotCount).toBe(2);
  expect(shot?.events.shots.map((e) => e.ammoId).sort()).toEqual(['arrow', 'bomb']);

  // In the foundry, building: the build bar takes the row's place; the tube slot stays.
  await page.evaluate(() => {
    window.__helpers?.toFoundry();
    window.__GAME__?.step(1, { toggleBuild: true });
  });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hud))?.hotbar.shown).toBe(false);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (025)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/025');

  test('carried arrows, then the fist', async ({ page }) => {
    await boot(page, '?start=field');
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    // 047: the arrows are on the carried bar; the intake bar shows the fist (left click punches with the intake dry).
    await hudShowing(page, [HUD_LAYOUT.tubeSlot.melee]);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/01-carried-arrows.png` });
    await spendArrows(page);
    await cameraSettled(page);
    await hudShowing(page, [HUD_LAYOUT.tubeSlot.melee]);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/03-fist.png` });
  });

  test('a mixed volley', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?playtest');
    const { out } = await mixedVolley(page);
    await cameraSettled(page);
    await hudShowing(page, (out?.intake.entrances.slice(0, 2) ?? []).map((e) => String(e.count)));
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/02-mixed-volley.png` });
  });

  test('before the tube', async ({ page }) => {
    await boot(page, '?start=tutorial');
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    await hudShowing(page, [HUD_LAYOUT.tubeSlot.melee]);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/04-before-tube.png` });
  });

  test('the fist and the tube slot frames on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [name, file] of [['hud-fist', '05-sheet-fist'], ['hud-tube-slot-1', '06-sheet-tube-slot-1'], ['hud-tube-slot-3', '07-sheet-tube-slot-3']] as const) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });
});
