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

test('out in ring 2 the land is crowded, but never more than 15 near the player', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const seen = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    let max = 0;
    let ko = false;
    const rings = new Set<number | null>();
    const sample = (s: ReturnType<typeof g.step>) => {
      max = Math.max(max, s.nearPlayer);
      rings.add(s.area.ring);
      ko ||= s.events.ko;
    };
    // Up the path round the start stone, then east along it into ring 2 toward the shrine (src/data/overworld.ts).
    h.walkTo(41.5 * 32, g.getState().player.y);
    for (const [tx, ty] of [[41.5, 22.5], [52.5, 21.5], [60.5, 18.5], [67.5, 17.5]] as const) {
      for (let t = 0; t < 600; t++) {
        const p = g.getState().player;
        const dx = tx * 32 - p.x;
        const dy = ty * 32 - p.y;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) break;
        const axis = (d: number): -1 | 0 | 1 => (Math.abs(d) < 2 ? 0 : d > 0 ? 1 : -1);
        sample(g.step(1, { moveX: axis(dx), moveY: axis(dy) }));
      }
    }
    // Hold ground a while, firing ley bolts at the nearest: waking packs close in, new ones keep away while the screen is full.
    g.step(1, { selectAmmo: 'ley-bolt' });
    for (let t = 0; t < 600; t++) {
      const s = g.getState();
      const p = s.player;
      const near = [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      sample(g.step(1, near ? { fire: true, aimX: near.x, aimY: near.y } : {}));
    }
    const s = g.getState();
    return { max, rings: [...rings], ring: s.area.ring, populated: s.populated, ko };
  });
  expect(seen.populated).toBe(true);
  expect(seen.ko).toBe(false);
  expect(seen.ring).toBe(2);
  expect(seen.rings).toContain(2);
  expect(seen.max).toBeGreaterThanOrEqual(10);
  expect(seen.max).toBeLessThanOrEqual(15);
  expect(errors).toEqual([]);
});
