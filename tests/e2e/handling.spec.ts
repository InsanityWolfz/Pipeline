import { expect, test, type Page } from '@playwright/test';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { recipeDef } from '../../src/data/recipes';
import { landmarkDef } from '../../src/data/landmarks';
import { nodeDef } from '../../src/data/nodes';
import { OVERWORLD } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { roomById } from '../../src/sim/state';
import { boot, watchErrors } from './helpers';
import { craftRow, openCraftTab } from './craftPage';
import { screenPoint } from './foundryPage';

// 070: handling and clarity. Hold E to harvest, Shift-click to craft the most, the empty tube's card, greyed carried
// slots, the player's silhouette behind props, and the nodes' glows and a tree's canopy reach.

const T = 32;
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
const state = (page: Page) => page.evaluate(() => window.__GAME__?.getState());

/** The nearest tree node to the player. */
async function nearestTree(page: Page) {
  const tree = await page.evaluate(() => {
    const s = window.__GAME__?.step(0);
    if (!s) throw new Error('no game');
    const p = s.player;
    return s.nodes.filter((n) => n.nodeId === 'tree' && n.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  });
  if (!tree) throw new Error('no tree');
  return tree;
}

/** Fires every carried arrow off to the side (right click), so the carried bar's arrow slot is empty. */
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

test('holding E in the live game cuts a tree down, one use after another', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const tree = await nearestTree(page);
  await page.evaluate((t) => window.__helpers?.walkTo(t.x, t.y + 16), tree);
  await page.evaluate(() => window.__GAME__?.resume());
  await page.keyboard.down('e');
  await expect.poll(async () => (await state(page))?.nodes.find((n) => n.id === tree.id)?.uses, { timeout: 60_000 }).toBe(0);
  await page.keyboard.up('e');
  expect(tree.uses).toBe(nodeDef('tree').uses);
  expect(errors).toEqual([]);
});

test('Shift-click on a crafting row crafts as many as the inventory affords, with one feed line', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const before = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.step(0).player;
    for (const [i, id] of ['shaft', 'arrowhead', 'rope'].entries()) for (let k = 0; k < 3; k++) g.drop(id, p.x + 30 + k * 10, p.y + 20 + i * 12);
    h.collect();
    return g.step(1);
  });
  expect(before.inventory).toMatchObject({ shaft: 3, arrowhead: 3, rope: 3 });
  await openCraftTab(page, 'arrow');
  const row = await craftRow(page, 'arrow');
  const at = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.keyboard.down('Shift');
  await page.mouse.click(at.x, at.y);
  await page.keyboard.up('Shift');
  const made = 3 * recipeDef('arrow').output.count;
  await expect.poll(async () => (await state(page))?.inventory.arrow).toBe((before.inventory.arrow ?? 0) + made);
  expect((await state(page))?.inventory).toMatchObject({ shaft: 0, arrowhead: 0, rope: 0 });
  await expect.poll(async () => (await ui(page))?.pickupFeed.find((l) => l.itemId === 'arrow')?.count).toBe(made);
  expect(errors).toEqual([]);
});

test('the empty tube card says right click fires carried rounds; with none carried it says Melee', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  expect(s?.hud.active).toEqual({ kind: 'melee' });
  expect(s?.inventory.arrow ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.labels).toEqual(['Tube empty · RMB fires carried']);
  const card = (await ui(page))?.hud?.tubeSlot;
  if (!card) throw new Error('no card');
  // The label sits inside the widened card, clear of its well's ring.
  const pad = HUD_LAYOUT.tubeSlot.wellInset + HUD_LAYOUT.tubeSlot.labelPad;
  const label = card.labelBoxes[0];
  expect(label?.x ?? 0).toBeGreaterThanOrEqual(card.x + pad - 1);
  expect((label?.x ?? 0) + (label?.w ?? 0)).toBeLessThanOrEqual(card.x + card.w - pad + 1);
  await spendArrows(page);
  await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.labels).toEqual([HUD_LAYOUT.tubeSlot.melee]);
  expect(errors).toEqual([]);
});

test('an emptied carried slot keeps its round greyed with 0 until another round takes the slot', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await page.evaluate(() => window.__GAME__?.step(1));
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.slots[0]).toMatchObject({ itemId: 'arrow', greyed: false });
  await spendArrows(page);
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.slots[0]).toEqual({ itemId: 'arrow', count: 0, empty: true, greyed: true });
  // A bomb dragged onto the slot takes it.
  await page.evaluate(() => window.__GAME__?.step(1, { assignSlot: { slot: 0, itemId: 'bomb' } }));
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.slots[0]?.itemId).toBe('bomb');
  expect(errors).toEqual([]);
});

/** A lone ruin block near the field's start with open ground north of it: its tile. */
function loneRuinBlock(from: { x: number; y: number }): { tx: number; ty: number } {
  const rows = roomById(OVERWORLD.id).rows;
  const sx = Math.floor(from.x / T);
  const sy = Math.floor(from.y / T);
  let best: { tx: number; ty: number; d: number } | null = null;
  for (let ty = sy - 20; ty < sy + 20; ty++) {
    for (let tx = sx - 25; tx < sx + 25; tx++) {
      const lone = rows[ty]?.[tx] === TILE.ruinBlock && [rows[ty - 1]?.[tx], rows[ty]?.[tx - 1], rows[ty]?.[tx + 1], rows[ty + 1]?.[tx]].every((t) => t === TILE.floor);
      const d = Math.abs(tx - sx) + Math.abs(ty - sy);
      if (lone && (!best || d < best.d)) best = { tx, ty, d };
    }
  }
  if (!best) throw new Error('no lone ruin block');
  return best;
}

/** Walks to the tile north of a solid tile, then presses south against it so the player stands right behind it. */
async function standBehind(page: Page, tile: { tx: number; ty: number }): Promise<void> {
  await page.evaluate((t) => {
    const g = window.__GAME__;
    window.__helpers?.walkTo((t.tx + 0.5) * 32, (t.ty - 0.5) * 32);
    for (let i = 0; i < 20; i++) g?.step(1, { moveY: 1 });
    g?.step(1);
  }, tile);
}

test('the player shows as a silhouette behind a ruin block and a tree, and not in the open', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const start = (await state(page))?.player;
  if (!start) throw new Error('no player');
  await expect.poll(async () => (await ui(page))?.silhouette).toBe(false);
  await standBehind(page, loneRuinBlock(start));
  await expect.poll(async () => (await ui(page))?.silhouette).toBe(true);
  // Out in the open again.
  await page.evaluate((p) => window.__helpers?.walkTo(p.x, p.y), start);
  await expect.poll(async () => (await ui(page))?.silhouette).toBe(false);
  // Behind a grove tree's trunk.
  const tree = await nearestTree(page);
  // Settled (the walk ends still moving), so the player stands exactly still while cutting.
  await page.evaluate((t) => {
    window.__helpers?.walkTo(t.x, t.y - 28);
    window.__GAME__?.step(30);
  }, tree);
  await expect.poll(async () => (await ui(page))?.silhouette).toBe(true);
  const still = (await state(page))?.player;
  // Cut down to a stump from under its canopy without moving: nothing hides the player any more.
  const stump = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { interact: true, interactHeld: true });
    return g?.step(30 * 3, { interactHeld: true });
  });
  expect(stump?.nodes.find((n) => n.id === tree.id)?.uses).toBe(0);
  expect({ x: stump?.player.x, y: stump?.player.y }).toEqual({ x: still?.x, y: still?.y });
  await expect.poll(async () => (await ui(page))?.silhouette).toBe(false);
  expect(errors).toEqual([]);
});

test("every harvestable node glows (the Old Grove's trees together); a used-up one doesn't", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  if (!s) throw new Error('no game');
  const grove = landmarkDef('old-grove').area;
  const inGrove = s.nodes.filter((n) => n.nodeId === 'tree' && n.x >= grove.x0 * T && n.x < (grove.x1 + 1) * T && n.y >= grove.y0 * T && n.y < (grove.y1 + 1) * T);
  expect(inGrove.length).toBeGreaterThan(1);
  await expect.poll(async () => (await ui(page))?.nodeGlow.filter((id) => inGrove.some((n) => n.id === id)).length).toBe(inGrove.length);
  // The glow follows harvestability exactly: every drawn node glows if and only if it can be harvested now.
  const glow = new Set((await ui(page))?.nodeGlow ?? []);
  for (const n of s.nodes.filter((n) => n.room === s.room)) expect(glow.has(n.id), `node ${n.id} (${n.nodeId}, ${n.vent ?? 'no cycle'})`).toBe(n.uses > 0 && n.vent !== 'closed' && n.vent !== 'warning');
  // Cut the nearest tree down: it stops glowing.
  const tree = await nearestTree(page);
  await page.evaluate((t) => {
    const g = window.__GAME__;
    window.__helpers?.walkTo(t.x, t.y + 16);
    g?.step(1, { interact: true, interactHeld: true });
    g?.step(30 * 3, { interactHeld: true });
  }, tree);
  expect((await state(page))?.nodes.find((n) => n.id === tree.id)?.uses).toBe(0);
  await expect.poll(async () => (await ui(page))?.nodeGlow.includes(tree.id)).toBe(false);
  expect(errors).toEqual([]);
});

test("under a tree's canopy, behind its trunk, its E prompt shows and E harvests it", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const tree = await nearestTree(page);
  await page.evaluate((t) => window.__helpers?.walkTo(t.x, t.y - 32), tree);
  const p = (await state(page))?.player;
  expect(tree.y - (p?.y ?? 0)).toBeGreaterThan(20);
  // Its E prompt: the node's own, or (045) the objective's E over the same tree, lit as usable from here.
  await expect
    .poll(async () => {
      const u = await ui(page);
      return u?.interactPrompt?.kind === 'node' || (u?.prompt?.usable === true && u.prompt.x === tree.x && u.prompt.y === tree.y);
    })
    .toBe(true);
  const after = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { interact: true });
    return g?.step(30);
  });
  expect(after?.nodes.find((n) => n.id === tree.id)?.uses).toBe(nodeDef('tree').uses - 1);
  expect(errors).toEqual([]);
});
