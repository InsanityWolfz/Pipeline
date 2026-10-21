import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { OVERWORLD } from '../../src/data/overworld';
import { WAYPOINT } from '../../src/data/targets';
import type { Axis } from '../../src/sim/input';
import { boot, cameraSettled, watchErrors } from './helpers';

// 057.6: the waypoint arrow (051) doesn't stutter while the player walks. A real frame runs 0, 1 or 2 sim ticks as
// the display's clock and the sim's fixed step drift, so the walk here steps a mix of them, one rendered frame each,
// and reads the arrow after every frame: its screen position (its world point less the camera's view as rendered).

const T = 32;
/** Ticks run before each rendered frame: an uneven mix, as a real display's frames give. */
const TICKS = [1, 2, 0, 1, 1, 2, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 1, 0, 2, 1, 1, 2, 0, 1];

interface Sample {
  mode: 'over' | 'edge';
  /** The arrow's world point. */
  wx: number;
  wy: number;
  /** Its point on screen, view px. */
  sx: number;
  sy: number;
  /** The player's world x. */
  px: number;
}

/**
 * Walks `moveX` for TICKS, one rendered frame per entry (each step is taken in a frame callback queued after the game
 * loop's, so the game draws exactly once between two reads), and samples the arrow after each frame.
 */
async function walkFrames(page: Page, moveX: Axis): Promise<Sample[]> {
  return page.evaluate(
    async ({ ticks, moveX, w, h }) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
      const out: Sample[] = [];
      await frame();
      for (const n of ticks) {
        g.step(n, { moveX });
        await frame();
        const ui = g.ui();
        const wp = ui.waypoint;
        if (!wp) throw new Error('no waypoint');
        if (ui.drawnTick !== g.getState().tick) throw new Error('frame not drawn');
        out.push({ mode: wp.mode, wx: wp.x, wy: wp.y, sx: wp.x - (ui.camera.x - w / 2), sy: wp.y - (ui.camera.y - h / 2), px: ui.camera.player.x });
      }
      return out;
    },
    { ticks: TICKS, moveX, w: VIEW_WIDTH, h: VIEW_HEIGHT },
  );
}

test('057.6: at the screen edge the arrow slides along it smoothly while the player walks', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  // The first goal, the tube on its stone, off screen to the west: the arrow sits on the left edge.
  await page.evaluate((x) => {
    const g = window.__GAME__;
    window.__helpers?.walkTo(x, g?.getState().player.y ?? 0);
  }, (OVERWORLD.startStone.tx + 15.5) * T);
  await cameraSettled(page);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waypoint))?.mode).toBe('edge');
  // Walking on east, away from it.
  const s = await walkFrames(page, 1);
  expect(s.at(-1)?.px ?? 0).toBeGreaterThan((s[0]?.px ?? 0) + 30);
  for (const f of s) {
    expect(f.mode).toBe('edge');
    // Pinned to the left edge on screen, `edgeInset` in, every frame (it used to jump with each frame's step).
    expect(Math.abs(f.sx - WAYPOINT.edgeInset)).toBeLessThan(0.5);
  }
  // Along the edge it slides one way only, a little each frame: never back and forth.
  const dy = s.slice(1).map((f, i) => f.sy - (s[i]?.sy ?? 0));
  const sign = Math.sign(dy.find((d) => Math.abs(d) > 1e-6) ?? 0);
  for (const d of dy) {
    expect(d * sign).toBeGreaterThanOrEqual(-1e-6);
    expect(Math.abs(d)).toBeLessThan(2);
  }
  expect(errors).toEqual([]);
});

test('057.6: over a target the arrow stays on it while the player walks, and switches to the edge once', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  // Three rows up and six tiles west of the tube's stone, a clear row east: the arrow hovers over the stone.
  const { tx, ty } = OVERWORLD.startStone;
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x ?? 0, y ?? 0), [(tx - 5.5) * T, (ty - 2.5) * T]);
  await cameraSettled(page);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().waypoint))?.mode).toBe('over');
  // Walking east past it: on the target in the world every frame, so on screen it moves with the ground, exactly as
  // far as the camera did (the camera's locked to the player).
  const over = await walkFrames(page, 1);
  for (const [i, f] of over.entries()) {
    expect(f.mode).toBe('over');
    expect(f.wx).toBe(over[0]?.wx);
    expect(f.wy).toBe(over[0]?.wy);
    const prev = over[i - 1];
    if (prev) expect(f.sx - prev.sx).toBeCloseTo(-(f.px - prev.px), 6);
  }
  expect((over.at(-1)?.px ?? 0) - (over[0]?.px ?? 0)).toBeGreaterThan(30);
  // On east until the stone leaves the screen: over, then the edge, once, with no flicker between them.
  const modes = over.map((f) => f.mode);
  for (let i = 0; i < 20 && modes.at(-1) !== 'edge'; i++) modes.push(...(await walkFrames(page, 1)).map((f) => f.mode));
  expect(modes.at(-1)).toBe('edge');
  expect(modes.slice(1).filter((m, i) => m !== modes[i]).length).toBe(1);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (057)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/057');

  test('the waypoint arrow on the edge mid-walk, and over its target', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    const { tx, ty } = OVERWORLD.startStone;
    await page.evaluate(([x, y]) => window.__helpers?.walkTo(x ?? 0, y ?? 0), [(tx - 5.5) * T, (ty - 2.5) * T]);
    await cameraSettled(page);
    await walkFrames(page, 1);
    await page.screenshot({ path: 'docs/review/057/05-waypoint-over.png' });
    for (let i = 0; i < 20 && (await walkFrames(page, 1)).at(-1)?.mode !== 'edge'; i++);
    await walkFrames(page, 1);
    await page.screenshot({ path: 'docs/review/057/04-waypoint-edge.png' });
  });
});
