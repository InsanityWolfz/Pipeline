import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// The overworld (017): the corner minimap and its markers, and the living
// population's crowd out in ring 2, never past the screen cap.

test('the minimap shows the entrance, the shrine and the player, follows the player, and hides in the foundry', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  const minimap = () => page.evaluate(() => window.__GAME__?.ui().minimap);
  await expect.poll(async () => (await minimap())?.markers.map((m) => m.kind)).toEqual(['entrance', 'shrine', 'player']);
  const before = await minimap();
  expect(before?.shown).toBe(true);
  // The shrine is east of the entrance and north of the start; the player south of the entrance.
  const [entrance, shrine, player] = before?.markers ?? [];
  expect(shrine?.x).toBeGreaterThan(entrance?.x ?? 0);
  expect(shrine?.y).toBeLessThan(entrance?.y ?? 0);
  expect(player?.y).toBeGreaterThan(entrance?.y ?? 0);

  // Ten tiles east moves the player's marker 15 view px (1.5 per tile).
  await page.evaluate(() => {
    const g = window.__GAME__;
    const x = g?.getState().player.x ?? 0;
    for (let t = 0; t < 400 && (g?.getState().player.x ?? 0) < x + 320; t++) g?.step(1, { moveX: 1 });
  });
  await expect.poll(async () => (await minimap())?.markers[2]?.x).toBeCloseTo((player?.x ?? 0) + 15, 0);

  await page.evaluate(() => window.__helpers?.toFoundry());
  await expect.poll(async () => (await minimap())?.shown).toBe(false);
  expect((await minimap())?.markers).toEqual([]);
  expect(errors).toEqual([]);
});

test('out in ring 2 a fight fills the screen with 10-15 enemies, and never more than 15 wake near the player', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const seen = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    let onScreen = 0;
    let awake = 0;
    let ko = false;
    const rings = new Set<number | null>();
    const sample = (s: ReturnType<typeof g.step>) => {
      onScreen = Math.max(onScreen, s.onScreen);
      // Awake within a screen (POPULATION.screen: a view either way of the player).
      const p = s.player;
      const near = s.enemies.filter((e) => e.room === s.room && Math.abs(e.x - p.x) <= 640 && Math.abs(e.y - p.y) <= 360);
      awake = Math.max(awake, near.filter((e) => e.mode !== 'idle' && e.mode !== 'return').length);
      rings.add(s.area.ring);
      ko ||= s.events.ko;
    };
    // Into ring 2 where it's busiest: beside the ring-2 enemy with the most others within a screen of it, by path.
    h.walkTo(41.5 * 32, g.getState().player.y);
    h.walkTo(41.5 * 32, 22.5 * 32);
    const ring2 = g.getState().enemies.filter((e) => e.group.startsWith('pop-2-'));
    const crowd = (e: { x: number; y: number }) => ring2.filter((o) => Math.abs(o.x - e.x) <= 320 && Math.abs(o.y - e.y) <= 180).length;
    const busiest = [...ring2].sort((a, b) => crowd(b) - crowd(a))[0];
    if (!busiest) throw new Error('no ring 2 packs');
    for (let t = 0; t < 30; t++) sample(g.step(1));
    h.walkTo(busiest.x, busiest.y + 160);
    sample(g.getState());
    for (let t = 0; t < 600 && !ko; t++) sample(g.step(1, { dodge: t % 30 === 0 }));
    return { onScreen, awake, rings: [...rings], populated: g.getState().populated, ko };
  });
  expect(seen.populated).toBe(true);
  expect(seen.rings).toContain(2);
  expect(seen.onScreen).toBeGreaterThanOrEqual(10);
  expect(seen.awake).toBeLessThanOrEqual(15);
  expect(errors).toEqual([]);
});
