import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { cameraStill, ui, worldOnCanvas } from './factoryPage';
import { allWorking, forgeLine, SHOWCASE } from './foundryMoodPage';
import { clockFrames, motionStrip, virtualClock, worldClip } from './motionStrip';

// Review screenshots for 079 (REVIEW_SHOTS=1, into docs/review/079): the busy foundry on each tier; a Smelter and a kiln
// working and starved; sparks and a quench held; a ley pulse mid-sweep; build mode over a running forge; the cards in
// the warm light; items on conduits with the mood on and off; a torch and a brazier lighting the floor; and the motion
// strips (20–24) on a virtual clock locked to the sim, 33 ms and two ticks a frame.

const SHOTS = 'docs/review/079';

/** Into the showcase or the busy line, the player at a world point, the camera at rest; then the clock is ours. */
async function scene(page: Page, layout: 'showcase' | 'columns', at: { x: number; y: number }, quality: Quality = 'high'): Promise<number[]> {
  await virtualClock(page);
  const ids = layout === 'showcase' ? await forgeLine(page, { layout }) : await forgeLine(page, { units: 12, coil: true, intake: true });
  await page.evaluate(([x, y, q]) => {
    window.__GAME__?.setLook({ quality: q });
    window.__helpers?.walkTo(x, y);
  }, [at.x, at.y, quality] as const);
  await allWorking(page, ids.forges.slice(0, 2));
  // The camera eases after the player (stopping at the room's edge) and the door's fade plays on the drawn clock: run it to rest.
  let last = { x: NaN, y: NaN };
  await expect.poll(async () => {
    await clockFrames(page, 20);
    await page.evaluate(() => window.__vt?.stop());
    const u = await ui(page);
    const still = u?.lighting.mood === 'foundry' && !u.camera.fading && Math.hypot(u.camera.x - last.x, u.camera.y - last.y) < 0.5;
    last = { x: u?.camera.x ?? NaN, y: u?.camera.y ?? NaN };
    return still;
  }, { timeout: 120_000 }).toBe(true);
  // The playtest kit's schematic banners played out (fast, on the tween clock), so none covers a shot.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(40));
  await expect.poll(async () => {
    await clockFrames(page, 10);
    return (await ui(page))?.bannerAlpha ?? 1;
  }, { timeout: 120_000 }).toBe(0);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await clockFrames(page, 90);
  return ids.forges;
}

const shot = (page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) => page.screenshot({ path: `${SHOTS}/${name}.png`, ...(clip ? { clip } : {}) });

test.describe('079 review shots', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/079');
  test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

  test('01 the busy foundry on Low, Medium and High', async ({ page }) => {
    test.setTimeout(400_000);
    await scene(page, 'columns', { x: 12 * 32, y: 7 * 32 }, 'low');
    for (const q of ['low', 'medium', 'high'] as const) {
      await page.evaluate((qq) => window.__GAME__?.setLook({ quality: qq }), q);
      await clockFrames(page, 20);
      await shot(page, `01-foundry-${q}`);
    }
  });

  test('02–05 the forges close up, sparks and the quench, a ley pulse, build mode over a running forge', async ({ page }) => {
    test.setTimeout(500_000);
    const [smelter] = await scene(page, 'showcase', { x: 11.5 * 32, y: 8 * 32 });
    const close = await worldClip(page, { x: 7 * 32, y: 7.2 * 32 }, { w: 128, h: 176 });
    await shot(page, '02-smelter-kiln-working', close);
    // A craft's sparks and quench, held where they are (the clock stopped the frame a Smelter's craft landed).
    await page.evaluate((id) => {
      const g = window.__GAME__;
      const vt = window.__vt;
      if (!g || !vt) throw new Error('no game');
      vt.start();
      for (let t = 0; t < 300; t++) {
        const s = g.step(1);
        vt.tick(1000 / 60);
        if (s.events.made.some((m) => m.id === id)) break;
      }
      for (let i = 0; i < 4; i++) {
        g.step(1);
        vt.tick(1000 / 60);
      }
    }, smelter ?? -1);
    await shot(page, '03-sparks-and-quench', await worldClip(page, { x: SHOWCASE.smelter[0] * 32 + 16, y: SHOWCASE.smelter[1] * 32 }, { w: 96, h: 80 }));
    // A ley pulse mid-sweep: the entrances emptied, the line refills one, a pulse starts; held half a second in.
    await page.evaluate(() => window.__GAME__?.loadEntrances([null, null, null, null, null]));
    await expect.poll(async () => {
      await clockFrames(page, 2);
      return (await ui(page))?.foundryMood.pulses.started ?? 0;
    }, { timeout: 60_000 }).toBeGreaterThan(0);
    await clockFrames(page, 14);
    await shot(page, '04-ley-pulse-mid-sweep');
    // Build mode over the running forges: a ghost beside them.
    await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
    await clockFrames(page, 30);
    await cameraStill(page).catch(() => undefined);
    const g = await worldOnCanvas(page, 9.5 * 32, 6.5 * 32);
    await page.mouse.move(g.x, g.y);
    await page.evaluate(() => window.__GAME__?.step(1, { aimX: 9.5 * 32, aimY: 6.5 * 32 }));
    await clockFrames(page, 4);
    await shot(page, '05-build-mode-ghost');
    await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
    // The same machines starved: run until both have stopped.
    await page.evaluate(() => {
      const g2 = window.__GAME__;
      for (let t = 0; t < 4000; t++) {
        const s = g2?.step(5);
        if (s?.foundry.pieces.filter((p) => p.kind === 'machine' && (p.pieceId === 'smelter' || p.pieceId === 'kiln') && p.tx === 6).every((p) => p.kind === 'machine' && p.status !== 'working')) return;
      }
    });
    await clockFrames(page, 40);
    await shot(page, '02-smelter-kiln-starved', await worldClip(page, { x: 7 * 32, y: 7.2 * 32 }, { w: 128, h: 176 }));
  });

  test('06 the recipe card, a hover card and the purge prompt in the warm light; 07 items on conduits on and off', async ({ page }) => {
    test.setTimeout(400_000);
    const [smelter] = await scene(page, 'showcase', { x: 10.5 * 32, y: 6.5 * 32 });
    const hover = async (name: string, wx: number, wy: number) => {
      const at = await worldOnCanvas(page, wx, wy);
      await page.mouse.move(at.x, at.y);
      await page.evaluate(([x, y]) => window.__GAME__?.step(1, { aimX: x, aimY: y }), [wx, wy] as const);
      await clockFrames(page, 6);
      await shot(page, name);
    };
    const s = await page.evaluate((id) => window.__GAME__?.getState().foundry.pieces.find((p) => p.id === id), smelter ?? -1);
    await hover('06-recipe-card', ((s?.tx ?? 6) + 0.5) * 32, ((s?.ty ?? 5) + 0.5) * 32);
    await hover('06-hover-card', ((s?.tx ?? 6) + 2.5) * 32, ((s?.ty ?? 5) + 0.5) * 32);
    // Items on conduits, the mood on and off.
    await page.mouse.move(5, 5);
    const clip = await worldClip(page, { x: 8 * 32, y: 7 * 32 }, { w: 160, h: 140 });
    await clockFrames(page, 4);
    await shot(page, '07-items-mood-on', clip);
    await page.evaluate(() => window.__GAME__?.lightingOff(true));
    await clockFrames(page, 4);
    await shot(page, '07-items-mood-off', clip);
    await page.evaluate(() => window.__GAME__?.lightingOff(false));
    // The purge prompt at the intake's fed mouth.
    await page.evaluate(() => window.__helpers?.walkTo(12.5 * 32, 1.6 * 32));
    await clockFrames(page, 60);
    const mouth = await worldOnCanvas(page, 12.5 * 32, 0.5 * 32);
    await page.mouse.move(mouth.x, mouth.y);
    await page.evaluate(() => window.__GAME__?.step(1, { aimX: 12.5 * 32, aimY: 0.5 * 32 }));
    await clockFrames(page, 2);
    await page.evaluate(() => window.__vt?.stop());
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.purgeMenu?.length ?? 0).toBe(1);
    await clockFrames(page, 4);
    await shot(page, '06-purge-prompt');
  });

  test('08 a wall torch and a brazier lighting the floor; 20–24 the motion strips', async ({ page }) => {
    test.setTimeout(600_000);
    await scene(page, 'showcase', { x: 4 * 32, y: 4 * 32 });
    await shot(page, '08-torch-and-brazier', await worldClip(page, { x: 3 * 32, y: 3 * 32 }, { w: 192, h: 150 }));
    const fx = () => {
      const m = window.__GAME__?.ui().foundryMood;
      return { steam: m?.particles.steam ?? 0, sparks: m?.particles.sparks ?? 0, lit: m?.pulses.lit.length ?? 0 };
    };
    await motionStrip(page, `${SHOTS}/20-strip-torch.png`, { title: '20 the west torch, High: 33 ms a frame on a clock locked to the sim', frames: 30, centre: { x: 0.8 * 32, y: 3.9 * 32 }, size: { w: 64, h: 64 }, perRow: 10, scale: 3 });
    await page.evaluate(() => window.__helpers?.walkTo(11.5 * 32, 8 * 32));
    await clockFrames(page, 60);
    for (const q of ['high', 'medium'] as const) {
      await page.evaluate((qq) => window.__GAME__?.setLook({ quality: qq }), q);
      await motionStrip(page, `${SHOTS}/${q === 'high' ? 21 : 22}-strip-forges-${q}.png`, { title: `${q === 'high' ? 21 : 22} a Smelter and a kiln working, ${q}: shimmer, steam, glow and a craft's sparks`, frames: 30, centre: { x: 6.9 * 32, y: 6.8 * 32 }, size: { w: 112, h: 196 }, perRow: 10, scale: 2, info: fx });
    }
    await page.evaluate(() => window.__GAME__?.setLook({ quality: 'high' }));
    await motionStrip(page, `${SHOTS}/23-strip-coil.png`, { title: '23 the Tempering coil fed by a Smelter, High: violet light and sparks, no heat', frames: 30, centre: { x: 6.5 * 32, y: 11.2 * 32 }, size: { w: 96, h: 72 }, perRow: 10, scale: 2 });
    await page.evaluate(() => window.__GAME__?.loadEntrances([null, null, null, null, null]));
    const cam = (await ui(page))?.camera ?? { x: 384, y: 240 };
    const lit = await motionStrip(page, `${SHOTS}/24-strip-ley-pulses.png`, { title: '24 ley pulses as the line feeds the intake, High: the whole view, every frame (the cyan runes lighting toward the pipe)', frames: 30, centre: { x: cam.x, y: cam.y }, size: { w: 640, h: 360 }, perRow: 3, scale: 1, info: fx });
    expect(Math.max(...lit.map((f) => f.lit))).toBeGreaterThan(0);
  });
});
