import { expect, test, type Page } from '@playwright/test';
import { CONDUIT_TICKS } from '../../src/data/foundry';
import { FOUNDRY_LAYOUT } from '../../src/data/foundryAssets';
import { VIEW_WIDTH } from '../../src/data/config';
import { forgeLine, runFrames } from './foundryMoodPage';
import { frames, lighting, openWorld, pixels, setLook, toRegion } from './lightingPage';
import { cameraStill, ui, worldOnCanvas } from './factoryPage';

// 079: what must stay readable in the foundry's warm light, against `?mood=off` (the hook's lightingOff) on High: the
// item icons riding conduits, a hover card, a machine's recipe card, a purge prompt and the HUD keep their pixels; the
// translucent ghost keeps its look over the floor. And the wall torches: at their tiles, flickering, nothing solid.

type Box = { x: number; y: number; w: number; h: number };

/** Page px a view px is drawn at. */
async function viewScale(page: Page): Promise<{ k: number; x: number; y: number }> {
  const b = await page.locator('canvas').boundingBox();
  if (!b) throw new Error('no canvas');
  return { k: b.width / VIEW_WIDTH, x: b.x, y: b.y };
}

/** The most any channel differs between the two shots over a box (page px). */
async function maxDiff(page: Page, a: Buffer, b: Buffer, box: Box): Promise<number> {
  const r = { x: Math.round(box.x), y: Math.round(box.y), w: Math.max(1, Math.round(box.w)), h: Math.max(1, Math.round(box.h)) };
  const pa = await pixels(page, a, r);
  const pb = await pixels(page, b, r);
  return Math.max(...pa.map((p, i) => Math.max(...p.map((c, j) => Math.abs(c - (pb[i]?.[j] ?? 0))))));
}

/** A shot with the mood on, then one with it off (lights, tint, effects skipped), the sim and the camera held. */
async function onAndOff(page: Page): Promise<{ on: Buffer; off: Buffer }> {
  await frames(page, 4);
  const on = await page.screenshot();
  await page.evaluate(() => window.__GAME__?.lightingOff(true));
  await frames(page, 4);
  const off = await page.screenshot();
  await page.evaluate(() => window.__GAME__?.lightingOff(false));
  await frames(page, 4);
  return { on, off };
}

/** The page boxes of the items riding conduits on screen now: each icon's middle 4×4 view px (its edges blend with the trough). */
async function conduitItems(page: Page): Promise<Box[]> {
  const s = await page.evaluate(() => window.__GAME__?.getState());
  const { k } = await viewScale(page);
  const out: Box[] = [];
  for (const p of s?.foundry.pieces ?? []) {
    if (p.kind !== 'conduit' || p.item !== 'ley-steel') continue;
    const t = p.progress / CONDUIT_TICKS;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
    const [vx, vy] = t < 0.5 ? v[p.inFrom] : v[p.facing];
    const kk = t < 0.5 ? 0.5 - t : t - 0.5;
    const c = await worldOnCanvas(page, Math.round((p.tx + 0.5) * 32 + vx * kk * 32), Math.round((p.ty + 0.5) * 32 + vy * kk * 32 - FOUNDRY_LAYOUT.itemLift));
    if (c.x > 20 && c.y > 20 && c.x < 1260 && c.y < 700) out.push({ x: c.x - 2 * k, y: c.y - 2 * k, w: 4 * k, h: 4 * k });
  }
  return out;
}

test('readable in the warm light: items on conduits, hover and recipe cards, the purge prompt and the HUD match mood off', async ({ page }) => {
  test.setTimeout(300_000);
  const ids = await forgeLine(page, { layout: 'showcase' });
  await setLook(page, { quality: 'high' });
  // Beside the forges, their conduits in view; held when a Smelter's ley-steel rides mid-tile. Its ingot is a solid icon,
  // so its own pixels show; ley glass is part clear and an arrow thin, the lit trough showing through them (079.6).
  await page.evaluate(() => window.__helpers?.walkTo(10.5 * 32, 6.5 * 32));
  await page.evaluate(() => window.__GAME__?.step(90));
  await cameraStill(page);
  await page.evaluate((ticks) => {
    const g = window.__GAME__;
    for (let t = 0; t < 400; t++) {
      const s = g?.step(1);
      const riding = s?.foundry.pieces.filter((p) => p.kind === 'conduit' && p.item === 'ley-steel' && Math.abs(p.progress / ticks - 0.5) < 0.1);
      if (riding && riding.length > 0) return;
    }
    throw new Error('no forge output riding');
  }, CONDUIT_TICKS);
  const report: Record<string, number> = {};
  // The items riding the conduits, and the HUD's hotbar.
  const items = await conduitItems(page);
  expect(items.length).toBeGreaterThan(0);
  let shots = await onAndOff(page);
  report.items = Math.max(...(await Promise.all(items.map((b) => maxDiff(page, shots.on, shots.off, b)))));
  // The HUD: the HP bar's own pixels, inset as 074's check (the HP block's box has the world showing between its pieces, 074.11).
  const { k, x: ox, y: oy } = await viewScale(page);
  const hp = (await ui(page))?.health;
  if (!hp) throw new Error('no health');
  report.hud = await maxDiff(page, shots.on, shots.off, { x: ox + (hp.box.x + 8) * k, y: oy + (hp.box.y + 4) * k, w: hp.box.w * 0.5 * k, h: 8 * k });
  // A running Smelter's recipe card on its hover, and a crate's hover card.
  const smelter = (await page.evaluate((id) => window.__GAME__?.getState().foundry.pieces.find((p) => p.id === id), ids.forges[0] ?? -1)) ?? { tx: 6, ty: 5 };
  for (const [name, tx, ty] of [['recipeCard', smelter.tx, smelter.ty], ['hoverCard', smelter.tx + 2, smelter.ty]] as const) {
    const at = await worldOnCanvas(page, (tx + 0.5) * 32, (ty + 0.5) * 32);
    await page.mouse.move(at.x, at.y);
    await page.evaluate(([x, y]) => window.__GAME__?.step(1, { aimX: x, aimY: y }), [(tx + 0.5) * 32, (ty + 0.5) * 32] as const);
    await expect.poll(async () => (await ui(page))?.hoverBox ?? null).not.toBeNull();
    if (name === 'recipeCard') await expect.poll(async () => (await ui(page))?.hoverDescription ?? '').toContain('→');
    const hb = (await ui(page))?.hoverBox;
    if (!hb) throw new Error('no hover box');
    const a = await worldOnCanvas(page, hb.x, hb.y);
    const b = await worldOnCanvas(page, hb.x + hb.w, hb.y + hb.h);
    shots = await onAndOff(page);
    report[name] = await maxDiff(page, shots.on, shots.off, { x: a.x + 2, y: a.y + 2, w: b.x - a.x - 4, h: b.y - a.y - 4 });
  }
  // The purge prompt: E at the intake's fed mouth.
  await page.evaluate(() => window.__helpers?.walkTo(12.5 * 32, 1.6 * 32));
  await cameraStill(page);
  const mouth = await worldOnCanvas(page, 12.5 * 32, 0.5 * 32);
  await page.mouse.move(mouth.x, mouth.y);
  await page.evaluate(() => window.__GAME__?.step(1, { aimX: 12.5 * 32, aimY: 0.5 * 32 }));
  await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('entrance');
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.purgeMenu?.length ?? 0).toBe(1);
  const row = (await ui(page))?.purgeMenu?.[0];
  if (!row) throw new Error('no purge row');
  shots = await onAndOff(page);
  report.purge = await maxDiff(page, shots.on, shots.off, { x: ox + row.x * k + 2, y: oy + row.y * k + 2, w: row.w * k - 4, h: row.h * k - 4 });
  console.log('readability', JSON.stringify(report));
  // The cards' stone tablets are 94% opaque (020's TABLET.fillAlpha): the warm floor behind shows through by a few levels (079.6).
  for (const [name, d] of Object.entries(report)) expect(d, name).toBeLessThanOrEqual(name.endsWith('Card') ? 3 : 2);
});

test('the ghost over a running forge keeps its contrast with the floor in the warm light', async ({ page }) => {
  test.setTimeout(240_000);
  await forgeLine(page, { layout: 'showcase' });
  await setLook(page, { quality: 'high' });
  await page.evaluate(() => window.__helpers?.walkTo(11.5 * 32, 7.5 * 32));
  await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
  await cameraStill(page);
  // A Smelter's ghost on the floor just right of the running Smelter, beside the forge's heat.
  const at = await worldOnCanvas(page, 9.5 * 32, 6.5 * 32);
  const floor = await worldOnCanvas(page, 9.5 * 32, 9.5 * 32);
  await page.mouse.move(at.x, at.y);
  await page.evaluate(() => window.__GAME__?.step(1, { aimX: 9.5 * 32, aimY: 6.5 * 32 }));
  await frames(page, 6);
  const shots = await onAndOff(page);
  const { k } = await viewScale(page);
  const mean = async (png: Buffer, c: { x: number; y: number }) => {
    const px = await pixels(page, png, { x: Math.round(c.x - 4 * k), y: Math.round(c.y - 4 * k), w: Math.round(8 * k), h: Math.round(8 * k) });
    return [0, 1, 2].map((j) => px.reduce((s, p) => s + (p[j] ?? 0), 0) / px.length);
  };
  const contrast = async (png: Buffer) => {
    const [g, f] = [await mean(png, at), await mean(png, floor)];
    return Math.hypot(...g.map((v, j) => v - (f[j] ?? 0)));
  };
  const [on, off] = [await contrast(shots.on), await contrast(shots.off)];
  console.log('ghost contrast', on.toFixed(1), off.toFixed(1));
  // The ghost is translucent (0.6), so its pixels follow the floor under it (079.6): it keeps most of its contrast.
  expect(on).toBeGreaterThanOrEqual(off * 0.8);
});

test('the four wall torches stand at their tiles, flicker gently, light the floor and stop nothing', async ({ page }) => {
  test.setTimeout(240_000);
  await forgeLine(page, { units: 0 });
  await setLook(page, { quality: 'high' });
  // Where the view takes in every wall light's pool.
  await page.evaluate(() => window.__helpers?.walkTo(12 * 32, 7 * 32));
  await page.evaluate(() => window.__GAME__?.tweenSpeed(40));
  await frames(page, 60);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await cameraStill(page);
  const seen = await page.evaluate(async () => {
    const out: { x: number; y: number; intensity: number }[][] = [];
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      out.push((window.__GAME__?.ui().lighting.placed ?? []).filter((l) => l.source === 'wall' && l.radius === 48).map((l) => ({ x: l.x, y: l.y, intensity: l.intensity })));
    }
    return out;
  });
  expect(seen.map((f) => f.length)).toEqual(seen.map(() => 4));
  const tiles = (seen[0] ?? []).map((l) => [Math.floor(l.x / 32), Math.floor((l.y + 18 + 8) / 32) - 1]).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0));
  expect(tiles).toEqual([[0, 4], [0, 11], [23, 6], [23, 13]]);
  const by = (i: number) => seen.map((f) => f[i]?.intensity ?? 0);
  for (let i = 0; i < 4; i++) {
    const xs = by(i);
    expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs));
    expect(Math.max(...xs)).toBeLessThanOrEqual(0.8 * 1.15);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0.8 * 0.85);
  }
  // Nothing solid: the tiles beside each torch can still be built on, and the room's passable floor is its floor.
  const passable = await page.evaluate(() => window.__GAME__?.passable() ?? []);
  for (const [tx, ty] of [[1, 4], [1, 11], [22, 6], [22, 13]] as const) expect(passable[ty]?.[tx], `${tx},${ty}`).toBe('.');
  const placed = await page.evaluate(() => window.__GAME__?.step(1, { place: { pieceId: 'conduit', tx: 1, ty: 4, facing: 'right' } }).foundry.pieces.length);
  expect(placed).toBe(1);
  expect((await lighting(page)).lights.wall).toBe(6);
  expect((await runFrames(page, 1, 0)).at(-1)?.shown).toBe(true);
});

const luma = (p: readonly number[]): number => 0.299 * (p[0] ?? 0) + 0.587 * (p[1] ?? 0) + 0.114 * (p[2] ?? 0);

/** The screen's median brightness over its middle band (074's measure). */
async function worldBrightness(page: Page): Promise<number> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const px = await pixels(page, await page.screenshot(), { x: 0, y: Math.round(size.height * 0.2), w: size.width, h: Math.round(size.height * 0.55) });
  const b = px.map(luma).sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)] ?? 0;
}

test('on High the foundry’s floor is darker than Region 1’s ground and brighter than the Hollows’', async ({ page }) => {
  test.setTimeout(420_000);
  await openWorld(page);
  await setLook(page, { quality: 'high' });
  const seen: Record<string, number> = {};
  for (const region of ['region1', 'hollows'] as const) {
    await toRegion(page, region);
    await frames(page, 3);
    seen[region] = await worldBrightness(page);
  }
  await page.evaluate(() => {
    window.__helpers?.toFoundry();
    window.__helpers?.walkTo(12 * 32, 7 * 32);
  });
  await page.evaluate(() => window.__GAME__?.tweenSpeed(40));
  await expect.poll(async () => (await lighting(page)).mood, { timeout: 60_000 }).toBe('foundry');
  await frames(page, 40);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await cameraStill(page);
  seen.foundry = await worldBrightness(page);
  console.log('brightness', JSON.stringify(seen));
  expect(seen.foundry).toBeLessThan(seen.region1 ?? 0);
  expect(seen.foundry).toBeGreaterThan(seen.hollows ?? 255);
});
