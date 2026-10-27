import { test, type Page } from '@playwright/test';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { SET_PIECES, setPieceAnchor, setPieceDef } from '../../src/data/setPieces';
import { WORLD } from '../../src/sim/world';
import { boot } from './helpers';
import { frames, openWorld, setLook, toRegion, type Region } from './lightingPage';
import { toSetPiece, walkToAny, weather } from './worldLifePage';

// Review screenshots for 077 (REVIEW_SHOTS=1, into docs/review/077): each region's detail on Low and High, each set
// piece on High, two frames of a swaying meadow, a pond's ripples and a ley line's beads, each region's weather on
// High (the view's middle, at twice the size, so the particles show), the Stormcrown on Low, a lightning strike at the
// Storm Tower (its bolt held on the tween clock), and the silhouette behind a set piece.

const SHOTS = 'docs/review/077';

async function shot(page: Page, name: string, middle = false): Promise<void> {
  await frames(page, 4);
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const clip = middle ? { x: size.width / 4, y: size.height / 4, width: size.width / 2, height: size.height / 2 } : undefined;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(clip ? { clip } : {}) });
}

test.describe('review screenshots (077)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/077');

  test('each region’s detail on Low and High, and its weather on High', async ({ page }) => {
    test.setTimeout(600_000);
    await openWorld(page);
    const regions: Region[] = ['region1', 'hollows', 'emberworks', 'stormcrown'];
    for (const [i, region] of regions.entries()) {
      await toRegion(page, region);
      for (const q of ['low', 'high'] as const) {
        await setLook(page, { quality: q });
        await shot(page, `0${i + 1}-${region}-${q}`);
      }
      await shot(page, `0${i + 5}-${region}-weather-high`, true);
    }
  });

  test('each set piece on High', async ({ page }) => {
    test.setTimeout(900_000);
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    for (const [i, p] of SET_PIECES.entries()) {
      await toSetPiece(page, p.id);
      await shot(page, `${String(10 + i).padStart(2, '0')}-${p.id}`);
    }
  });

  test('a meadow swaying (two frames), a pond’s ripples and a ley line’s beads', async ({ page }) => {
    test.setTimeout(300_000);
    await boot(page, '?start=field');
    await setLook(page, { quality: 'high' });
    await page.evaluate(() => window.__GAME__?.step(1));
    await shot(page, '30-meadow-sway-a', true);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1400)));
    await shot(page, '31-meadow-sway-b', true);
    const room = WORLD[OVERWORLD_ROOM];
    const pond = [...(room?.terrain?.ponds ?? [])].sort((p, q) => Math.hypot(p.cx - 146, p.cy - 150) - Math.hypot(q.cx - 146, q.cy - 150))[0];
    if (!pond) throw new Error('no pond');
    await walkToAny(page, [{ x: (pond.cx + 0.5) * 32, y: (pond.cy + pond.ry * 1.6 + 1) * 32 }, { x: (pond.cx + pond.rx * 1.6 + 1) * 32, y: (pond.cy + 0.5) * 32 }]);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2500)));
    await shot(page, '32-pond-ripples', true);
    const line = OVERWORLD.leyLines.shrine;
    const mid = line[Math.floor(line.length / 2)] ?? { tx: 0, ty: 0 };
    await walkToAny(page, [-1, 1, -2, 2, -3, 3].map((d) => ({ x: (mid.tx + 0.5 + d) * 32, y: (mid.ty + 1.5) * 32 })));
    await shot(page, '33-ley-beads', true);
  });

  test('the Stormcrown on Low, a lightning strike at the Storm Tower, and the silhouette behind the Ley Tower', async ({ page }) => {
    test.setTimeout(600_000);
    await openWorld(page);
    await toRegion(page, 'stormcrown');
    await setLook(page, { quality: 'low' });
    await shot(page, '40-stormcrown-low');
    await setLook(page, { quality: 'high', flashes: true });
    const tower = setPieceDef('storm-tower');
    const a = setPieceAnchor(tower, 32);
    await walkToAny(page, [{ x: a.x - 90, y: a.y - 40 }, { x: a.x + 90, y: a.y - 40 }]);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.02));
    await page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.strikeWeather();
      for (let i = 0; i < 20 && !g.ui().weather.bolt; i++) await new Promise((r) => requestAnimationFrame(r));
    });
    await page.screenshot({ path: `${SHOTS}/41-lightning-storm-tower.png` });
    console.log('strike', JSON.stringify((await weather(page)).last));
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    const ley = setPieceDef('ley-tower');
    const b = setPieceAnchor(ley, 32);
    await walkToAny(page, [{ x: b.x, y: (ley.footprint.ty - 0.3) * 32 }, { x: b.x - 16, y: (ley.footprint.ty - 0.3) * 32 }, { x: b.x + 16, y: (ley.footprint.ty - 0.3) * 32 }]);
    await shot(page, '42-silhouette-ley-tower');
  });
});
