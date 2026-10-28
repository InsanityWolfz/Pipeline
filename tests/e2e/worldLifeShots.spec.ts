import { expect, test, type Page } from '@playwright/test';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { SET_PIECES, setPieceAnchor, setPieceDef } from '../../src/data/setPieces';
import { WORLD_SHAPE } from '../../src/data/worldShape';
import { WORLD } from '../../src/sim/world';
import { boot } from './helpers';
import { frames, openWorld, setLook, toRegion, type Region } from './lightingPage';
import { toSetPiece, walkToAny, weather, world } from './worldLifePage';

// Review screenshots for 077 (REVIEW_SHOTS=1, into docs/review/077): each region's detail on Low and High, each set
// piece on High, two frames of a swaying meadow, a pond's ripples and a ley line's beads, each region's weather on
// High (the view's middle, at twice the size, so the particles show), the Stormcrown on Low, a lightning strike at the
// Storm Tower (its bolt held on the tween clock), and the silhouette behind a set piece. Review: motion strips on
// Playwright's fake clock, 30 frames over a second: the Stormcrown's sway as a gust starts, and walking across the
// Emberworks–Stormcrown border (50, 51).

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
    // Below the pond, far enough that it sits in the upper half of the view, clear of the player.
    await walkToAny(page, [2, 3, 4].map((d) => ({ x: (pond.cx + 0.5 - pond.rx - 2) * 32, y: (pond.cy + pond.ry + d) * 32 })));
    await expect.poll(async () => (await world(page)).ripples, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    await shot(page, '32-pond-ripples');
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
    // Beside it and below its crown, so the crown sits in the upper view and the bolt comes down onto it (not over the player).
    await walkToAny(page, [{ x: a.x - 90, y: a.y - 120 }, { x: a.x + 90, y: a.y - 120 }, { x: a.x - 120, y: a.y - 90 }]);
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

  test('motion strips: the Stormcrown’s sway as a gust starts, and walking across the Emberworks–Stormcrown border', async ({ page }) => {
    test.setTimeout(600_000);
    await page.clock.install();
    await openWorld(page);
    await setLook(page, { quality: 'high' });
    await toRegion(page, 'stormcrown');
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 500);
    const tick = () => page.clock.runFor(Math.round(1000 / 30));
    // Wait for a gust's start (its ease begins), then 30 frames over a second.
    for (let i = 0; i < 30 * 12 && (await weather(page)).wind.gust <= 1.0001; i++) await tick();
    expect((await weather(page)).wind.gust).toBeGreaterThan(1);
    await strip(page, '50-sway-gust-strip', tick);
    // Through a gap in the Emberworks–Stormcrown border nearest a bearing of 285°: from 2 tiles inside the Emberworks,
    // walking out along a path across the band, 30 frames over a second (2 ticks a frame).
    const path = await page.evaluate((shape) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const rows = g.passable();
      const open = (tx: number, ty: number) => rows[ty]?.[tx] === '.';
      const d = (tx: number, ty: number) => Math.hypot(tx - shape.cx, ty - shape.cy);
      const a = (285 * Math.PI) / 180;
      let gap: { tx: number; ty: number } | null = null;
      for (let k = 0; k < 400 && !gap; k++) {
        const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.004;
        const tx = Math.round(shape.cx + shape.r * Math.sin(b));
        const ty = Math.round(shape.cy - shape.r * Math.cos(b));
        const ux = Math.sin(b);
        const uy = -Math.cos(b);
        let clear = true;
        for (let s = -3; s <= 4; s++) if (!open(Math.round(tx + ux * s), Math.round(ty + uy * s))) clear = false;
        if (clear) gap = { tx, ty };
      }
      if (!gap) throw new Error('no gap');
      const ux = Math.sin(a);
      const uy = -Math.cos(a);
      const from = { tx: Math.round(gap.tx - ux * 2), ty: Math.round(gap.ty - uy * 2) };
      const goal = { tx: Math.round(gap.tx + ux * 5), ty: Math.round(gap.ty + uy * 5) };
      const key = (tx: number, ty: number) => ty * 1000 + tx;
      const came = new Map<number, number>([[key(from.tx, from.ty), -1]]);
      const queue = [from];
      for (let i = 0; i < queue.length; i++) {
        const t = queue[i];
        if (!t || (t.tx === goal.tx && t.ty === goal.ty)) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = { tx: t.tx + dx, ty: t.ty + dy };
          if (!open(n.tx, n.ty) || came.has(key(n.tx, n.ty))) continue;
          came.set(key(n.tx, n.ty), key(t.tx, t.ty));
          queue.push(n);
        }
      }
      const out: { x: number; y: number; d: number }[] = [];
      for (let k = key(goal.tx, goal.ty); k !== -1 && k !== undefined; k = came.get(k) ?? -1) out.unshift({ x: ((k % 1000) + 0.5) * 32, y: (Math.floor(k / 1000) + 0.5) * 32, d: d(k % 1000, Math.floor(k / 1000)) });
      return out;
    }, { cx: WORLD_SHAPE.centre.tx, cy: WORLD_SHAPE.centre.ty, r: WORLD_SHAPE.emberworks });
    const first = path[0];
    if (!first) throw new Error('no path');
    console.log('border path', path.length, 'tiles, from r', first.d.toFixed(1), 'to', path.at(-1)?.d.toFixed(1));
    await page.evaluate((p) => window.__helpers?.walkTo(p.x, p.y), first);
    for (let i = 0; i < 20; i++) await tick();
    let at = 1;
    await strip(page, '51-sway-border-strip', async () => {
      at = await page.evaluate(
        ({ list, i }) => {
          const g = window.__GAME__;
          if (!g) throw new Error('no game');
          let n = i;
          for (let t = 0; t < 2; t++) {
            const p = g.getState().player;
            const w = list[n];
            if (!w) return n;
            if (Math.hypot(w.x - p.x, w.y - p.y) < 3) n += 1;
            const dx = w.x - p.x;
            const dy = w.y - p.y;
            g.step(1, { moveX: Math.abs(dx) > 2 ? (dx > 0 ? 1 : -1) : 0, moveY: Math.abs(dy) > 2 ? (dy > 0 ? 1 : -1) : 0 });
          }
          return n;
        },
        { list: path, i: at },
      );
      await tick();
    });
    console.log('border weights after', JSON.stringify((await weather(page)).weights));
  });
});

/** 30 frames, one per `next()`, of the view's middle third at full size, laid out 5 across in one image. */
async function strip(page: Page, name: string, next: () => Promise<void>): Promise<void> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const clip = { x: size.width / 3, y: size.height / 3, width: size.width / 3, height: size.height / 3 };
  const shots: string[] = [];
  const samples: number[][] = [];
  for (let i = 0; i < 30; i++) {
    await next();
    shots.push((await page.screenshot({ clip })).toString('base64'));
    samples.push((await world(page)).swaySample);
  }
  let most = 0;
  for (let i = 1; i < samples.length; i++) for (const [j, a] of (samples[i] ?? []).entries()) most = Math.max(most, Math.abs(a - (samples[i - 1]?.[j] ?? a)));
  console.log(name, 'largest sampled angle change a frame', most.toFixed(3), JSON.stringify(samples.map((s) => s[0])));
  const sheet = await page.context().newPage();
  const w = Math.round(clip.width);
  const h = Math.round(clip.height);
  await sheet.setViewportSize({ width: w * 5, height: h * 6 });
  await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(5,${w}px);background:#000">${shots.map((b) => `<img src="data:image/png;base64,${b}" style="width:${w}px;height:${h}px;display:block">`).join('')}</body>`);
  await sheet.screenshot({ path: `${SHOTS}/${name}.png` });
  await sheet.close();
}
