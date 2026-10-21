import { expect, test } from '@playwright/test';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, watchErrors } from './helpers';

// 051: guidance. The waypoint arrow (B.1) at the screen's edge for an off-screen goal and over it on screen, through
// the foundry's door; the bomb goal's sub-lines (B.3).

const T = 32;
const CRAFT = OBJECTIVES.findIndex((o) => o.text === 'Craft bombs and ley bolts (C)');
const SHRINE = OBJECTIVES.findIndex((o) => o.text === "Claim the shrine's pylon");

test('an off-screen goal gets an edge arrow pointing at it; on screen the arrow hovers over it', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  // The first goal: the tube on its stone, on screen at the start.
  await cameraSettled(page);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waypoint))?.mode).toBe('over');
  const over = await page.evaluate(() => window.__GAME__?.ui().waypoint);
  expect(over?.kind).toBe('tubeStone');
  expect(over?.x).toBeCloseTo((OVERWORLD.startStone.tx + 0.5) * T, 0);
  // Fifteen tiles east, the stone is off screen to the west: the arrow sits on the left edge, pointing west.
  await page.evaluate((x) => {
    const h = window.__helpers;
    const g = window.__GAME__;
    if (!h || !g) throw new Error('no game');
    h.walkTo(x, g.getState().player.y);
  }, (OVERWORLD.startStone.tx + 15.5) * T);
  await cameraSettled(page);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waypoint))?.mode).toBe('edge');
  const edge = await page.evaluate(() => window.__GAME__?.ui());
  expect(Math.abs(Math.abs(edge?.waypoint?.angle ?? 0) - Math.PI)).toBeLessThan(0.6);
  // On the left edge of the camera's view.
  expect((edge?.waypoint?.x ?? 0) - ((edge?.camera.x ?? 0) - 320)).toBeLessThan(20);
  expect(errors).toEqual([]);
});

test('inside the foundry a goal outside points at the door; the bomb goal lists what it lacks', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  await page.evaluate((n) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toFoundry();
    g.step(400);
    g.completeObjectives(n);
  }, SHRINE);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waypoint))?.via).toBe('door');
  expect((await page.evaluate(() => window.__GAME__?.ui().waypoint))?.x).toBeCloseTo(23.5 * T, 0);
  // B.6: the foundry's own map in the minimap's place: its icons, and no overworld minimap.
  const inside = await page.evaluate(() => window.__GAME__?.ui());
  expect(inside?.minimap.shown).toBe(false);
  expect(inside?.foundryMap.shown).toBe(true);
  for (const kind of ['tube', 'bench', 'stash', 'door', 'entrance', 'player']) expect(inside?.foundryMap.icons.map((i) => i.kind)).toContain(kind);
  // A conduit laid shows as a line.
  const before = inside?.foundryMap.lines.length ?? 0;
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1, { toggleBuild: true });
    g.step(1, { place: { pieceId: 'conduit', tx: 16, ty: 12, facing: 'up' } });
    g.step(1, { toggleBuild: true });
  });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().foundryMap))?.lines.length).toBe(before + 2);

  await boot(page, '?start=tutorial');
  await page.evaluate((n) => {
    window.__GAME__?.completeObjectives(n);
    window.__GAME__?.step(2);
  }, CRAFT);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().objective))?.text).toBe('Craft bombs and ley bolts (C)');
  const lines = await page.evaluate(() => window.__GAME__?.ui().objective);
  expect(lines?.subSteps.map((s) => [s.text, s.done])).toEqual([
    ['Collect stone', false],
    ['Collect husk resin', false],
    ['Collect ley crystal', false],
  ]);
  expect(errors).toEqual([]);
});
