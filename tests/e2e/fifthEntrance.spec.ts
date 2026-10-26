import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { feedLines, restoreEntrance, ui } from './intakePage';

// 064: the fifth entrance. From ?playtest, the four caps are restored in turn (the Warden's, the Bulwark's, the
// Forgewright's and the Conductor's cores); five fed entrances fire one five-lane volley at 0°, ±15° and ±30° (the
// design's five-arrow spread), the tube slot shows five wells, and the pipe draws no cap left.

test('the fifth cap takes a Conductor core, and five fed entrances fire a five-lane volley', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await restoreEntrance(page, 11);
  await restoreEntrance(page, 13);
  await restoreEntrance(page, 14);
  const before = await page.evaluate(() => window.__GAME__?.getState().inventory['conductor-core'] ?? 0);
  const opened = await restoreEntrance(page, 15);
  expect(opened.research.nodes.find((n) => n.id === 'entrance-5')?.state).toBe('restored');
  expect(opened.intake.entrances.map((e) => e.open)).toEqual([true, true, true, true, true]);
  expect(opened.inventory['conductor-core']).toBe(before - 1);
  await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(0);
  await feedLines(page, [11, 12, 13, 14, 15].map((tx) => ({ tx, itemId: 'arrow', amount: 'half' as const })), 3);
  const shot = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    const at = g.step(0);
    const known = new Set(at.arrows.map((a) => a.id));
    const out = g.step(1, { fire: true, aimX: at.player.x + 160, aimY: at.player.y });
    return {
      lanes: at.intake.lanes,
      count: out.tube.shotCount,
      angles: out.arrows.filter((a) => !known.has(a.id)).map((a) => Math.round((Math.atan2(a.dy, a.dx) * 1800) / Math.PI) / 10).sort((a, b) => a - b),
    };
  });
  expect([shot.lanes, shot.count]).toEqual([[-30, -15, 0, 15, 30], 5]);
  [-30, -15, 0, 15, 30].forEach((a, i) => expect(Math.abs((shot.angles[i] ?? 0) - a)).toBeLessThanOrEqual(0.15));
  // The tube slot's fifth frame: five wells, one per entrance.
  await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.icons.length).toBe(5);
  expect(errors).toEqual([]);
});
