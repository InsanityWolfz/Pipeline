import { test, type Page } from '@playwright/test';
import { OVERWORLD } from '../../src/data/overworld';
import { landmarkDef } from '../../src/data/landmarks';
import { WORLD_SHAPE } from '../../src/data/worldShape';
import { cameraSettled } from './helpers';
import { bootTitle, clickRow, flowIs } from './flowPage';
import { bannersGone, fightFrames, frames, openWorld, setLook, spawnPack, toCrownSpire, toRegion, type Region } from './lightingPage';

// Review screenshots for 074 (REVIEW_SHOTS=1, into docs/review/074): the same spot in each region on Low and High, the
// Stormcrown on Medium too, a ley line lighting a pack in the dark, a lightning strike on a rod, Region 1's blended
// edge with a worn road, the Conductor's fight in the Stormcrown on High, and the Settings row.

const SHOTS = 'docs/review/074';
const T = 32;
const centre = { x: (WORLD_SHAPE.centre.tx + 0.5) * T, y: (WORLD_SHAPE.centre.ty + 0.5) * T };
const tilesOut = (p: { x: number; y: number }) => Math.hypot(p.x - centre.x, p.y - centre.y) / T;

/** The ley-line point `r0`–`r1` tiles out nearest a world point, world px. */
function leyPoint(r0: number, r1: number, near: { x: number; y: number }): { x: number; y: number } {
  const pts = Object.values(OVERWORLD.leyLines).flatMap((seam) => seam.map((t) => ({ x: (t.tx + 0.5) * T, y: (t.ty + 0.5) * T })));
  const fit = pts.filter((p) => tilesOut(p) >= r0 && tilesOut(p) <= r1).sort((a, b) => Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y));
  const p = fit[0];
  if (!p) throw new Error('no ley line there');
  return p;
}

/** The road point nearest Region 1's edge (48 tiles out), world px: where a worn road crosses the blended edge. */
function roadAtEdge(): { x: number; y: number } {
  const pts = OVERWORLD.paths.flatMap((road) => road.map((t) => ({ x: (t.tx + 1) * T, y: (t.ty + 1) * T })));
  const p = pts.sort((a, b) => Math.abs(tilesOut(a) - 47) - Math.abs(tilesOut(b) - 47))[0];
  if (!p) throw new Error('no road');
  return p;
}

async function walk(page: Page, p: { x: number; y: number }): Promise<void> {
  await page.evaluate((at) => window.__helpers?.walkTo(at.x, at.y), p);
  await bannersGone(page);
  await cameraSettled(page, 20_000);
}

async function shot(page: Page, name: string): Promise<void> {
  await frames(page, 3);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('review screenshots (074)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/074');

  test('the same spot in each region on Low and High (the Stormcrown on Medium too)', async ({ page }) => {
    test.setTimeout(400_000);
    await openWorld(page);
    const regions: Region[] = ['region1', 'hollows', 'emberworks', 'stormcrown'];
    for (const [i, region] of regions.entries()) {
      await toRegion(page, region);
      const tiers = region === 'stormcrown' ? (['low', 'medium', 'high'] as const) : (['low', 'high'] as const);
      for (const q of tiers) {
        await setLook(page, { quality: q });
        await shot(page, `0${i + 1}-${region}-${q}`);
      }
    }
  });

  test('Region 1’s edge blended along the circle, with a worn road across it', async ({ page }) => {
    test.setTimeout(240_000);
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    await walk(page, roadAtEdge());
    await shot(page, '05-edge-and-worn-road');
  });

  test('a ley line lighting a pack in the Stormcrown’s dark (High)', async ({ page }) => {
    test.setTimeout(300_000);
    await openWorld(page);
    await toRegion(page, 'stormcrown');
    const here = await page.evaluate(() => window.__GAME__?.getState().player ?? { x: 0, y: 0 });
    const ley = leyPoint(114, 138, here);
    await walk(page, { x: ley.x - 90, y: ley.y + 20 });
    await setLook(page, { quality: 'high' });
    await page.evaluate((p) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      ['static-mite', 'storm-sentinel', 'gale-ram'].forEach((id, i) => g.spawnEnemy(id, p.x - 10 + i * 34, p.y - 24 + i * 22));
      g.step(1);
    }, ley);
    await shot(page, '06-ley-line-lights-a-pack');
  });

  test('lightning strikes a rod in the Rod Field: its light and the ambient flash (High)', async ({ page }) => {
    test.setTimeout(300_000);
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    const rods = landmarkDef('rod-field');
    await walk(page, { x: (rods.area.x0 + 3.5) * T, y: (rods.area.y0 + 7.5) * T });
    // Hold the strike's flash on screen: step until a rod in view is struck, then draw one frame.
    await page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 3000; t++) {
        g.setPlayerHealth(100);
        const s = g.step(1);
        const cam = g.ui().camera;
        if (s.events.rodStrikes.some((r) => Math.abs(r.x - cam.x) < 260 && Math.abs(r.y - cam.y) < 140)) return;
      }
    });
    await page.evaluate(() => window.__GAME__?.step(2));
    await page.screenshot({ path: `${SHOTS}/07-lightning-strike.png` });
  });

  test('the Conductor’s fight in the Crown Spire, in the Stormcrown, on High', async ({ page }) => {
    test.setTimeout(400_000);
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    await toCrownSpire(page);
    await page.evaluate(() => window.__GAME__?.step(120));
    await fightFrames(page, 'ley-bolt', 30);
    await page.evaluate(() => window.__GAME__?.setPlayerHealth(100));
    await shot(page, '08-conductor-fight-high');
    await spawnPack(page, [], 0);
  });

  test('Settings: the Graphics quality row', async ({ page }) => {
    await bootTitle(page);
    await clickRow(page, 'settings');
    await flowIs(page, 'settings');
    await page.screenshot({ path: `${SHOTS}/09-settings-graphics-quality.png` });
  });
});
