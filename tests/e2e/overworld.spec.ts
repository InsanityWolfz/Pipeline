import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { MINIMAP } from '../../src/data/minimap';
import { OVERWORLD } from '../../src/data/overworld';

// The overworld (017): the corner minimap and its markers, and the living
// population's crowd out in ring 2, never past the screen cap.

test('the minimap shows the player, the foundry and the shrine once seen (051: fog), follows the player, and hides in the foundry', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  const minimap = () => page.evaluate(() => window.__GAME__?.ui().minimap);
  // 051 (B.5): only what has been on screen shows: at the start, neither the stairs (7 tiles north) nor the shrine.
  await expect.poll(async () => (await minimap())?.markers.map((m) => m.kind)).toEqual(['player']);
  // Up to the stairs, then near the shrine: each shows once seen, and stays.
  await page.evaluate((pylon) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.getState().player;
    h.walkTo(p.x, p.y - 4 * 32);
    // 053: into the shrine, in the round map's north-east, a few tiles below its pylon.
    h.walkTo((pylon.tx + 0.5) * 32, (pylon.ty + 4.5) * 32);
    h.walkTo(p.x, p.y);
  }, OVERWORLD.shrine.pylon);
  const places = ['entrance', 'shrine', 'player'];
  await expect.poll(async () => (await minimap())?.markers.filter((m) => places.includes(m.kind)).map((m) => m.kind)).toEqual(places);
  const before = await minimap();
  expect(before?.shown).toBe(true);
  // The shrine is east of the entrance and north of the start; the player south of the entrance.
  const [entrance, shrine, player] = before?.markers.filter((m) => places.includes(m.kind)) ?? [];
  expect(entrance?.name).toBe('Foundry');
  expect(shrine?.x).toBeGreaterThan(entrance?.x ?? 0);
  expect(shrine?.y).toBeLessThan(entrance?.y ?? 0);
  expect(player?.y).toBeGreaterThan(entrance?.y ?? 0);

  // Ten tiles east moves the player's marker ten tiles' worth of view px (053: 0.6 a tile).
  await page.evaluate(() => {
    const g = window.__GAME__;
    const x = g?.getState().player.x ?? 0;
    for (let t = 0; t < 400 && (g?.getState().player.x ?? 0) < x + 320; t++) g?.step(1, { moveX: 1 });
  });
  await expect.poll(async () => (await minimap())?.markers.find((m) => m.kind === 'player')?.x).toBeCloseTo((player?.x ?? 0) + 10 * MINIMAP.scale, 0);

  await page.evaluate(() => window.__helpers?.toFoundry());
  await expect.poll(async () => (await minimap())?.shown).toBe(false);
  expect((await minimap())?.markers).toEqual([]);
  expect(errors).toEqual([]);
});

test('out in ring 2 a fight fills the screen with 10 or more enemies', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const seen = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    let onScreen = 0;
    let ko = false;
    const rings = new Set<number | null>();
    const sample = (s: ReturnType<typeof g.step>) => {
      onScreen = Math.max(onScreen, s.onScreen);
      rings.add(s.area.ring);
      ko ||= s.events.ko;
    };
    // Into ring 2 where it's busiest: beside the ring-2 enemy with the most others within a screen of it, by path.
    h.walkTo((41.5 + h.ox) * 32, g.getState().player.y);
    h.walkTo((41.5 + h.ox) * 32, (22.5 + h.oy) * 32);
    // Ring 2's packs; the crowd round one counts every enemy out there within a screen of it (029: since the Frozen
    // Grotto's clearing keeps packs out, the packs fall elsewhere, and ring 1's can stand within a screen of ring 2's).
    // 053: the round map is big, and on the long walk there the packs can change (a wiped pack respawns elsewhere), so
    // it looks again from where it got to, up to three times.
    for (let tries = 0; tries < 3 && onScreen < 10 && !ko; tries++) {
      const out = g.getState().enemies.filter((e) => e.room === 'overworld' && e.group.startsWith('pop-'));
      const ring2 = out.filter((e) => e.group.startsWith('pop-2-'));
      const crowd = (e: { x: number; y: number }) => out.filter((o) => Math.abs(o.x - e.x) <= 320 && Math.abs(o.y - e.y) <= 180).length;
      const busiest = [...ring2].sort((a, b) => crowd(b) - crowd(a))[0];
      if (!busiest) throw new Error('no ring 2 packs');
      for (let t = 0; t < 30; t++) sample(g.step(1));
      // Half a screen from it, on ground the player can stand (035: which spot depends on where the packs fell).
      const open = g.passable();
      const near = [[0, 160], [0, -160], [160, 0], [-160, 0], [120, 120], [-120, 120], [120, -120], [-120, -120]]
        .map(([dx, dy]) => ({ x: busiest.x + (dx ?? 0), y: busiest.y + (dy ?? 0) }))
        .filter((p) => open[Math.floor(p.y / 32)]?.[Math.floor(p.x / 32)] === '.');
      // 053: some spots round a pack by the barrier are behind it; the first one walkable to.
      const reached = near.some((p) => {
        try {
          h.walkTo(p.x, p.y);
          return true;
        } catch {
          return false;
        }
      });
      if (!reached) continue;
      sample(g.getState());
      for (let t = 0; t < 600 && !ko; t++) sample(g.step(1, { dodge: t % 30 === 0 }));
    }
    return { onScreen, rings: [...rings], populated: g.getState().populated, ko };
  });
  expect(seen.populated).toBe(true);
  expect(seen.rings).toContain(2);
  expect(seen.onScreen).toBeGreaterThanOrEqual(10);
  expect(errors).toEqual([]);
});
