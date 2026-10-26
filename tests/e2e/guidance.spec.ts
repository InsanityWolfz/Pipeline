import { expect, test } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, watchErrors } from './helpers';

// 051: guidance. The waypoint arrow (B.1) at the screen's edge for an off-screen goal and over it on screen, through
// the foundry's door; the bomb goal's sub-lines (B.3); the minimap's icons named on hover, and the arena's once seen (B.5).

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
  // Within a few px: the edge arrow keeps clear of the corner map and the objective band (053 moved the band down).
  expect(Math.abs(((await page.evaluate(() => window.__GAME__?.ui().waypoint))?.x ?? 0) - 23.5 * T)).toBeLessThanOrEqual(4);
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

test('hovering a minimap icon names it; the name goes as the cursor leaves the canvas', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  // Up past the stairs, so the foundry's icon is on the minimap.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.getState().player;
    h.walkTo(p.x, p.y - 5 * 32);
  });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.some((m) => m.kind === 'entrance')).toBe(true);
  const foundry = (await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.find((m) => m.kind === 'entrance');
  const canvas = await page.locator('canvas').boundingBox();
  if (!foundry || !canvas) throw new Error('no icon');
  const k = canvas.width / VIEW_WIDTH;
  await page.mouse.move(canvas.x + foundry.x * k, canvas.y + foundry.y * k);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.hover).toBe('Foundry');
  // Off the icon: no name.
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.hover).toBeNull();
  // Back on it, then out of the canvas: the name goes.
  await page.mouse.move(canvas.x + foundry.x * k, canvas.y + foundry.y * k);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.hover).toBe('Foundry');
  await page.locator('canvas').dispatchEvent('mouseout');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.hover).toBeNull();
  expect(errors).toEqual([]);
});

test("the Bulwark's arena shows on the minimap once it has been on screen, named on hover", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  await page.evaluate(() => window.__GAME__?.step(1));
  const arena = async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.find((m) => m.kind === 'arena');
  expect(await arena()).toBeUndefined();
  // To the forum's way in (043's walk), the Hollows' other enemies cleared.
  await page.evaluate(([door, way]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
    g.step(1);
    // 053: round to the forum's north side; 055: E at its door goes in.
    h.walkTo((way + 0.5) * 32, (door - 0.5) * 32);
    g.step(1, { interact: true });
  }, [HOLLOWS.arena.door.tiles[0]?.ty ?? 0, HOLLOWS.arena.door.leaveTo.tx] as const);
  await expect.poll(async () => (await arena())?.name).toBe(HOLLOWS.arena.name);
  const at = await arena();
  const canvas = await page.locator('canvas').boundingBox();
  if (!at || !canvas) throw new Error('no icon');
  const k = canvas.width / VIEW_WIDTH;
  await page.mouse.move(canvas.x + at.x * k, canvas.y + at.y * k);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.hover).toBe(HOLLOWS.arena.name);
  expect(errors).toEqual([]);
});
